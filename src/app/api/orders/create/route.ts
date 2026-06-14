import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { rateLimit, getClientIp, isAllowedOrigin } from "@/lib/rate-limit";

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
    const { customer_name, customer_email, phone_number, shipping_address, items, payment_method } = body;
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
    const requested: { id: string; color: string; quantity: number }[] = [];
    for (const item of items) {
      const id = String(item?.id || "").trim().slice(0, 100);
      const color = String(item?.color || "").trim().slice(0, 60);
      const quantity = Number(item?.quantity);
      if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
        return NextResponse.json(
          { error: "One or more items in your cart are invalid" },
          { status: 400 }
        );
      }
      requested.push({ id, color, quantity });
    }

    // Generate collision-resistant order reference (e.g. ORD-20260613-3F8A2C1B)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const orderId = `ORD-${dateStr}-${rand}`;

    // Authoritative items + total are rebuilt from the database, NEVER trusted
    // from the client. This is the price-tampering guard.
    let authoritativeItems = requested.map((r) => ({
      id: r.id,
      name: r.id,
      color: r.color,
      quantity: r.quantity,
      price: formatRs(0),
    }));
    let totalAmount = 0;

    if (supabase) {
      const ids = requested.map((r) => r.id);
      const { data: dbProducts, error: prodErr } = await supabase
        .from("products")
        .select("id, name, price")
        .in("id", ids);

      if (prodErr) {
        console.error("Supabase product lookup error:", prodErr);
        return NextResponse.json(
          { error: "Unable to verify your order. Please try again." },
          { status: 500 }
        );
      }

      const priceMap = new Map(
        (dbProducts || []).map((p) => [p.id, { name: p.name as string, price: Number(p.price) }])
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

      authoritativeItems = requested.map((r) => {
        const p = priceMap.get(r.id)!;
        return {
          id: r.id,
          name: p.name,
          color: r.color,
          quantity: r.quantity,
          price: formatRs(p.price),
        };
      });
      totalAmount = requested.reduce(
        (sum, r) => sum + priceMap.get(r.id)!.price * r.quantity,
        0
      );

      const { error } = await supabase.from("orders").insert({
        id: orderId,
        customer_name: cleanName,
        customer_email: cleanEmail,
        phone_number: cleanPhone,
        shipping_address: cleanAddress,
        items: authoritativeItems,
        total_amount: totalAmount,
        payment_method: cleanPayment,
        status: "pending",
      });

      if (error) {
        console.error("Supabase insert order error:", error);
        return NextResponse.json(
          { error: "We couldn't place your order right now. Please try again." },
          { status: 500 }
        );
      }
    } else {
      // Offline/dev mode (Supabase unconfigured): cannot verify prices.
      console.log(`[Offline Mode] Created Mock Order Reference: ${orderId}`);
    }

    // Send order confirmation email via Resend (best-effort)
    try {
      await sendOrderConfirmationEmail({
        orderId,
        customerName: cleanName,
        customerEmail: cleanEmail,
        phoneNumber: cleanPhone,
        shippingAddress: cleanAddress,
        items: authoritativeItems,
        totalAmount,
        paymentMethod: cleanPayment,
      });
    } catch (emailErr) {
      console.error("Order created but failed to send confirmation email:", emailErr);
    }

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    console.error("Error in create order API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
