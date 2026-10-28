import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendNewOrderAdminEmail, sendOrderConfirmationEmail } from "@/lib/email";
import { rateLimit, getClientIp, isAllowedOrigin } from "@/lib/rate-limit";
import { normalizePaymentSettings, type PaymentSettings } from "@/lib/payment-settings";
import { DELIVERY_SETTINGS_COLUMNS, formatWeight, normalizeDeliveryRates } from "@/lib/delivery";
import { computeOrderPricing, normalizeCode, toDiscountRule, type DiscountCodeRow } from "@/lib/pricing";
import { claimDiscountUse, lookupDiscountCode, releaseDiscountUse } from "@/lib/discounts-server";
import { reserveStock, releaseStock, type StockLine } from "@/lib/stock-server";
import { ADMIN_2FA_EMAIL } from "@/lib/admin-auth";
import {
  availableQuantity,
  normalizeStock,
  normalizeVariants,
  resolveSelection,
  selectionLabel,
  type VariantSelection,
} from "@/lib/variants";

// Field length caps to prevent oversized payloads / DB bloat
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_PHONE = 20;
const MAX_ADDRESS = 500;
const MAX_ITEMS = 50;
const MAX_QTY = 99;
const ALLOWED_PAYMENTS = ["cash_on_delivery", "bank_transfer", "card_payment"];

const formatRs = (amount: number) => `Rs. ${Math.round(amount).toLocaleString("en-US")}`;

export async function POST(request: Request) {
  try {
    // Reject cross-site POSTs
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit: 5 orders / minute / IP
    const ip = getClientIp(request);
    const limit = rateLimit(`orders:${ip}`, 5, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down and try again shortly." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { customer_name, customer_email, phone_number, shipping_address, items, payment_method, discount_code } = body;
    const cleanPayment = ALLOWED_PAYMENTS.includes(payment_method) ? payment_method : "cash_on_delivery";
    const cleanName = (customer_name || "").trim().slice(0, MAX_NAME);
    const cleanEmail = (customer_email || "").trim().slice(0, MAX_EMAIL);
    const cleanPhone = (phone_number || "").trim().slice(0, MAX_PHONE);
    const cleanAddress = (shipping_address || "").trim().slice(0, MAX_ADDRESS);

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanAddress || !items) {
      return NextResponse.json(
        { error: "Missing required order checkout details" },
        { status: 400 }
      );
    }

    // Name check: minimum 2 letters, spaces/hyphens allowed, no numbers
    const nameRegex = /^[a-zA-Z\s\-]{2,}$/;
    if (!nameRegex.test(cleanName)) {
      return NextResponse.json(
        { error: "Customer name must be at least 2 characters long and contain only letters" },
        { status: 400 }
      );
    }

    // Email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Phone check: standard format 7 to 15 digits
    const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { error: "Please provide a valid phone number (7 to 15 digits)" },
        { status: 400 }
      );
    }

    // Validate cart items structure
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: "Your cart is empty or contains too many items" },
        { status: 400 }
      );
    }

    // Normalize and validate each requested line (quantity must be a sane integer)
    const requested: { id: string; color: string; options: unknown; quantity: number }[] = [];
    for (const item of items) {
      const id = String(item?.id || "").trim().slice(0, 100);
      const color = String(item?.color || "").trim().slice(0, 200);
      const quantity = Number(item?.quantity);
      if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
        return NextResponse.json(
          { error: "One or more items in your cart are invalid" },
          { status: 400 }
        );
      }
      requested.push({ id, color, options: item?.options, quantity });
    }

    // Generate collision-resistant order reference (e.g. ORD-20260613-3F8A2C1B)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const orderId = `ORD-${dateStr}-${rand}`;

    // Authoritative items + total are rebuilt from the database, NEVER trusted
    // from the client. This is the price-tampering guard.
    let authoritativeItems: {
      id: string;
      name: string;
      color: string;
      options?: VariantSelection;
      quantity: number;
      price: string;
    }[] = requested.map((r) => ({
      id: r.id,
      name: r.id,
      color: r.color,
      quantity: r.quantity,
      price: formatRs(0),
    }));
    let stockLines: StockLine[] = [];
    let totalAmount = 0;
    let deliveryFee = 0;
    let deliveryLabel: string | null = null;
    let totalWeightGrams: number | null = null;
    let discountAmount = 0;
    let appliedCode: string | null = null;

    if (supabase) {
      const ids = requested.map((r) => r.id);
      let { data: dbProducts, error: prodErr } = await supabase
        .from("products")
        .select("id, name, price, weight_grams, stock, variants, colors")
        .in("id", ids);
      // Stock/variants migration not run yet (42703 = unknown column): keep
      // taking orders, with stock untracked.
      if (prodErr?.code === "42703") {
        console.warn("[orders] products.stock/variants missing — run the stock migration. Stock is not being tracked.");
        const fallback = await supabase
          .from("products")
          .select("id, name, price, weight_grams, colors")
          .in("id", ids);
        dbProducts = (fallback.data || []).map((p) => ({ ...p, stock: null, variants: [] }));
        prodErr = fallback.error;
      }

      if (prodErr) {
        console.error("Supabase product lookup error:", prodErr);
        return NextResponse.json(
          { error: "Unable to verify your order. Please try again." },
          { status: 500 }
        );
      }

      const priceMap = new Map(
        (dbProducts || []).map((p) => [
          p.id,
          {
            name: p.name as string,
            price: Number(p.price),
            weightGrams: Number(p.weight_grams) || 0,
            stock: normalizeStock(p.stock),
            variants: normalizeVariants(p.variants, p.colors),
          },
        ])
      );

      // Every requested product must exist in the catalog
      for (const r of requested) {
        if (!priceMap.has(r.id)) {
          return NextResponse.json(
            { error: "One or more products are no longer available" },
            { status: 400 }
          );
        }
      }

      // Chosen variant options must exist on the product
      const selections: (VariantSelection | null)[] = [];
      for (const r of requested) {
        const p = priceMap.get(r.id)!;
        const sel = resolveSelection(p.variants, r.options, r.color);
        if (!sel) {
          return NextResponse.json(
            { error: `The options chosen for ${p.name} are no longer available. Please remove it from your cart and add it again.`, field: "stock" },
            { status: 400 }
          );
        }
        selections.push(p.variants.length > 0 ? sel : null);
      }

      // Stock check (friendly message). The atomic reservation below is what
      // actually prevents overselling when two people check out at once.
      const wanted = new Map<string, number>();
      requested.forEach((r, i) => {
        wanted.set(r.id, (wanted.get(r.id) || 0) + r.quantity);
        for (const [group, option] of Object.entries(selections[i] || {})) {
          const key = `${r.id}\u0000${group}\u0000${option}`;
          wanted.set(key, (wanted.get(key) || 0) + r.quantity);
        }
      });
      for (const [i, r] of requested.entries()) {
        const p = priceMap.get(r.id)!;
        const sel = selections[i] || {};
        const productLeft = p.stock;
        const optionLeft = availableQuantity(null, p.variants, sel);
        const overProduct = productLeft !== null && wanted.get(r.id)! > productLeft;
        const overOption = Object.entries(sel).some(([group, option]) => {
          const opt = p.variants.find((g) => g.name === group)?.options.find((o) => o.name === option);
          return opt?.stock != null && wanted.get(`${r.id}\u0000${group}\u0000${option}`)! > opt.stock;
        });
        if (overProduct || overOption) {
          const left = Math.min(productLeft ?? Infinity, optionLeft ?? Infinity);
          const what = selectionLabel(p.variants, sel) ? `${p.name} (${selectionLabel(p.variants, sel)})` : p.name;
          return NextResponse.json(
            {
              error: left <= 0
                ? `Sorry, ${what} is out of stock. Please remove it from your cart.`
                : `Sorry, only ${left} of ${what} left in stock. Please lower the quantity in your cart.`,
              field: "stock",
            },
            { status: 400 }
          );
        }
      }

      authoritativeItems = requested.map((r, i) => {
        const p = priceMap.get(r.id)!;
        const sel = selections[i];
        return {
          id: r.id,
          name: p.name,
          color: sel ? selectionLabel(p.variants, sel) : r.color,
          ...(sel ? { options: sel } : {}),
          quantity: r.quantity,
          price: formatRs(p.price),
        };
      });

      // Only products / options whose stock is tracked need reserving
      const tracked = requested.some((r, i) => {
        const p = priceMap.get(r.id)!;
        return p.stock !== null || availableQuantity(null, p.variants, selections[i] || {}) !== null;
      });
      if (tracked) {
        stockLines = requested.map((r, i) => ({ id: r.id, quantity: r.quantity, options: selections[i] || {} }));
      }
      // Delivery rates (weight-based + free-delivery offer) from the admin
      const { data: ratesRow, error: ratesErr } = await supabase
        .from("delivery_settings")
        .select(DELIVERY_SETTINGS_COLUMNS)
        .eq("id", 1)
        .maybeSingle();
      if (ratesErr) {
        console.error("Supabase delivery rates lookup error:", ratesErr);
        return NextResponse.json(
          { error: "Unable to calculate delivery. Please try again." },
          { status: 500 }
        );
      }

      // Discount code (optional) — looked up and re-validated server-side
      let discountRow: DiscountCodeRow | null = null;
      if (normalizeCode(discount_code)) {
        const lookup = await lookupDiscountCode(discount_code);
        if (!lookup.row) {
          return NextResponse.json({ error: lookup.error, field: "discount_code" }, { status: lookup.status === 500 ? 500 : 400 });
        }
        discountRow = lookup.row;
      }

      // Same pricing the checkout previews, but with database prices/weights
      const pricing = computeOrderPricing(
        requested.map((r) => {
          const p = priceMap.get(r.id)!;
          return { id: r.id, unitPrice: p.price, quantity: r.quantity, weightGrams: p.weightGrams };
        }),
        normalizeDeliveryRates(ratesRow),
        discountRow ? toDiscountRule(discountRow) : null
      );
      if (pricing.discountError) {
        return NextResponse.json({ error: pricing.discountError, field: "discount_code" }, { status: 400 });
      }

      // Use up one redemption (respects the code's usage limit atomically)
      if (discountRow && !(await claimDiscountUse(discountRow.id))) {
        return NextResponse.json(
          { error: "This discount code has just been fully used.", field: "discount_code" },
          { status: 400 }
        );
      }

      // Take the stock (all or nothing)
      if (stockLines.length > 0) {
        const reserved = await reserveStock(stockLines);
        if (!reserved.ok) {
          if (discountRow) await releaseDiscountUse(discountRow.id);
          return NextResponse.json(
            reserved.outOfStock
              ? { error: `Sorry, ${reserved.outOfStock} just sold out. Please update your cart and try again.`, field: "stock" }
              : { error: "We couldn't check stock for your order. Please try again." },
            { status: reserved.outOfStock ? 400 : 500 }
          );
        }
      }

      totalWeightGrams = pricing.weightGrams;
      deliveryFee = pricing.deliveryFee;
      deliveryLabel = formatWeight(pricing.weightGrams) + (pricing.freeDeliveryReason ? " · free delivery" : "");
      discountAmount = pricing.discountAmount;
      appliedCode = discountRow?.code ?? null;
      totalAmount = pricing.total;

      const { error } = await supabase.from("orders").insert({
        id: orderId,
        customer_name: cleanName,
        customer_email: cleanEmail,
        phone_number: cleanPhone,
        shipping_address: cleanAddress,
        items: authoritativeItems,
        total_amount: totalAmount,
        delivery_zone: deliveryLabel,
        delivery_fee: deliveryFee,
        total_weight_grams: totalWeightGrams,
        discount_code: appliedCode,
        discount_amount: discountAmount,
        // Only set when stock was taken, so orders still save before the stock migration
        ...(stockLines.length > 0 ? { stock_reserved: true } : {}),
        payment_method: cleanPayment,
        status: "pending",
      });

      if (error) {
        console.error("Supabase insert order error:", error);
        // Give the code's use and the stock back since no order was created
        if (discountRow) await releaseDiscountUse(discountRow.id);
        if (stockLines.length > 0) await releaseStock(stockLines);
        return NextResponse.json(
          { error: "We couldn't place your order right now. Please try again." },
          { status: 500 }
        );
      }
    } else {
      // Offline/dev mode (Supabase unconfigured): cannot verify prices.
      console.log(`[Offline Mode] Created Mock Order Reference: ${orderId}`);
    }

    // Bank transfer orders get the bank details in their confirmation email
    let bankDetails: PaymentSettings | null = null;
    if (cleanPayment === "bank_transfer" && supabase) {
      const { data: settingsRow, error: settingsErr } = await supabase
        .from("payment_settings")
        .select("bank_name, account_name, account_number, branch, payment_note")
        .eq("id", 1)
        .maybeSingle();
      if (settingsErr) {
        console.error("Failed to load bank transfer details for confirmation email:", settingsErr);
      } else {
        bankDetails = normalizePaymentSettings(settingsRow);
      }
    }

    // Confirmation to the customer + new-order alert to the store inbox (the
    // same inbox that receives the admin login codes). Best-effort.
    const emailPayload = {
      orderId,
      customerName: cleanName,
      customerEmail: cleanEmail,
      phoneNumber: cleanPhone,
      shippingAddress: cleanAddress,
      items: authoritativeItems,
      totalAmount,
      paymentMethod: cleanPayment,
      deliveryFee,
      deliveryZone: deliveryLabel,
      discountAmount,
      discountCode: appliedCode,
      bankDetails,
    };
    const [customerEmail, adminEmail] = await Promise.allSettled([
      sendOrderConfirmationEmail(emailPayload),
      sendNewOrderAdminEmail(ADMIN_2FA_EMAIL, emailPayload),
    ]);
    if (customerEmail.status === "rejected") {
      console.error("Order created but failed to send confirmation email:", customerEmail.reason);
    }
    if (adminEmail.status === "rejected") {
      console.error("Order created but failed to send admin new-order email:", adminEmail.reason);
    }

    return NextResponse.json({ success: true, orderId, total: totalAmount });
  } catch (error) {
    console.error("Error in create order API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
