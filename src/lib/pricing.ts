/**
 * Order pricing shared by checkout (live preview) and the order API (the
 * authoritative charge), so the customer always sees what they will pay:
 *
 *   items subtotal − discount code + delivery (weight-based, or free via the
 *   free-delivery offer / a free-delivery code) = total
 *
 * No SDK import so storefront components can use it.
 */
import { calculateDeliveryFee, type DeliveryRates } from "./delivery";

export type DiscountType =
  | "percent_order"
  | "fixed_order"
  | "percent_product"
  | "fixed_product"
  | "buy_x_get_y"
  | "free_delivery";

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percent_order: "% off whole order",
  fixed_order: "Rs. off whole order",
  percent_product: "% off selected products",
  fixed_product: "Rs. off each selected product",
  buy_x_get_y: "Buy X get Y free",
  free_delivery: "Free delivery",
};

/** The parts of a discount code that pricing needs (safe to send to the browser). */
export interface DiscountRule {
  code: string;
  discount_type: DiscountType;
  value: number;
  /** Products the code applies to. Empty = every product (buy X get Y) / not used (order-wide types). */
  product_ids: string[];
  buy_qty: number;
  get_qty: number;
  min_subtotal: number;
}

/** Full row as stored in `discount_codes` (server / admin). */
export interface DiscountCodeRow extends DiscountRule {
  id: string;
  description: string;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface PricingLine {
  id: string;
  unitPrice: number;
  quantity: number;
  weightGrams: number;
}

export interface OrderPricing {
  subtotal: number;
  discountAmount: number;
  /** Set when a code was supplied but doesn't apply to this basket. */
  discountError: string | null;
  weightGrams: number;
  /** Delivery before any free-delivery rule. */
  standardDeliveryFee: number;
  deliveryFee: number;
  freeDeliveryReason: "offer" | "code" | null;
  /** How much more the basket needs for the free-delivery offer (0 when n/a). */
  amountToFreeDelivery: number;
  total: number;
}

export function describeDiscount(rule: Pick<DiscountRule, "discount_type" | "value" | "buy_qty" | "get_qty">): string {
  const v = Math.round(rule.value * 100) / 100;
  switch (rule.discount_type) {
    case "percent_order": return `${v}% off your order`;
    case "fixed_order": return `Rs. ${v.toLocaleString()} off your order`;
    case "percent_product": return `${v}% off selected products`;
    case "fixed_product": return `Rs. ${v.toLocaleString()} off each selected product`;
    case "buy_x_get_y": return rule.buy_qty === 1 && rule.get_qty === 1 ? "Buy 1 get 1 free" : `Buy ${rule.buy_qty} get ${rule.get_qty} free`;
    case "free_delivery": return "Free delivery";
  }
}

function discountFor(rule: DiscountRule, lines: PricingLine[], subtotal: number): number {
  const eligible = (id: string) => rule.product_ids.length === 0 || rule.product_ids.includes(id);
  const lineTotal = (l: PricingLine) => l.unitPrice * l.quantity;
  switch (rule.discount_type) {
    case "percent_order":
      return (subtotal * Math.min(rule.value, 100)) / 100;
    case "fixed_order":
      return Math.min(rule.value, subtotal);
    case "percent_product":
      return lines.filter((l) => rule.product_ids.includes(l.id))
        .reduce((sum, l) => sum + (lineTotal(l) * Math.min(rule.value, 100)) / 100, 0);
    case "fixed_product":
      return lines.filter((l) => rule.product_ids.includes(l.id))
        .reduce((sum, l) => sum + Math.min(rule.value, l.unitPrice) * l.quantity, 0);
    case "buy_x_get_y": {
      const group = Math.max(1, rule.buy_qty) + Math.max(1, rule.get_qty);
      return lines.filter((l) => eligible(l.id))
        .reduce((sum, l) => sum + Math.floor(l.quantity / group) * Math.max(1, rule.get_qty) * l.unitPrice, 0);
    }
    case "free_delivery":
      return 0;
  }
}

/** Why a code can't be used on this basket, or null when it applies. */
function ruleError(rule: DiscountRule, lines: PricingLine[], subtotal: number): string | null {
  if (subtotal < rule.min_subtotal) {
    return `This code needs a minimum order of Rs. ${Math.round(rule.min_subtotal).toLocaleString()}.`;
  }
  const productScoped = rule.discount_type === "percent_product" || rule.discount_type === "fixed_product";
  if (productScoped && !lines.some((l) => rule.product_ids.includes(l.id))) {
    return "This code doesn't apply to the products in your cart.";
  }
  if (rule.discount_type === "buy_x_get_y" && discountFor(rule, lines, subtotal) <= 0) {
    return `Add ${rule.buy_qty + rule.get_qty} of an eligible product to use this code.`;
  }
  return null;
}

export function computeOrderPricing(
  lines: PricingLine[],
  rates: DeliveryRates,
  rule: DiscountRule | null
): OrderPricing {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const weightGrams = lines.reduce((sum, l) => sum + (l.weightGrams || 0) * l.quantity, 0);

  const discountError = rule ? ruleError(rule, lines, subtotal) : null;
  const activeRule = rule && !discountError ? rule : null;
  const discountAmount = activeRule
    ? Math.min(subtotal, Math.round(discountFor(activeRule, lines, subtotal)))
    : 0;
  const basket = subtotal - discountAmount;

  const standardDeliveryFee = lines.length > 0 ? calculateDeliveryFee(weightGrams, rates) : 0;
  let freeDeliveryReason: OrderPricing["freeDeliveryReason"] = null;
  if (activeRule?.discount_type === "free_delivery") freeDeliveryReason = "code";
  else if (rates.free_delivery_enabled && basket >= rates.free_delivery_min_subtotal) freeDeliveryReason = "offer";
  const deliveryFee = freeDeliveryReason ? 0 : standardDeliveryFee;

  const amountToFreeDelivery =
    rates.free_delivery_enabled && !freeDeliveryReason && lines.length > 0
      ? Math.max(0, Math.ceil(rates.free_delivery_min_subtotal - basket))
      : 0;

  return {
    subtotal,
    discountAmount,
    discountError,
    weightGrams,
    standardDeliveryFee,
    deliveryFee,
    freeDeliveryReason,
    amountToFreeDelivery,
    total: basket + deliveryFee,
  };
}

/** Status checks that only depend on the code itself (not the basket). */
export function codeAvailabilityError(row: DiscountCodeRow, now = new Date()): string | null {
  if (!row.is_active) return "This discount code is not active.";
  if (row.starts_at && new Date(row.starts_at) > now) return "This discount code is not active yet.";
  if (row.expires_at && new Date(row.expires_at) <= now) return "This discount code has expired.";
  if (row.max_uses != null && row.used_count >= row.max_uses) return "This discount code has been fully used.";
  return null;
}

export function toDiscountRule(row: DiscountCodeRow): DiscountRule {
  return {
    code: row.code,
    discount_type: row.discount_type,
    value: Number(row.value) || 0,
    product_ids: row.product_ids || [],
    buy_qty: Number(row.buy_qty) || 1,
    get_qty: Number(row.get_qty) || 1,
    min_subtotal: Number(row.min_subtotal) || 0,
  };
}

export function normalizeCode(raw: unknown): string {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 40);
}
