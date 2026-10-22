/**
 * Weight-based delivery charges, managed from Admin → Delivery and stored in
 * the `delivery_settings` table (single row). Each product has a weight in
 * grams; the charge is calculated from the total weight of the order.
 *
 * No SDK import so storefront components can use it.
 */
export interface DeliveryRates {
  /** Charge for orders up to `base_weight_grams`. */
  base_fee: number;
  /** Weight covered by the base fee (1000 g = 1 kg). */
  base_weight_grams: number;
  /** Added for every extra kg, or part of a kg, above the base weight. */
  extra_fee_per_kg: number;
}

export const DEFAULT_DELIVERY_RATES: DeliveryRates = {
  base_fee: 450,
  base_weight_grams: 1000,
  extra_fee_per_kg: 100,
};

export function normalizeDeliveryRates(row: Partial<Record<keyof DeliveryRates, unknown>> | null | undefined): DeliveryRates {
  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    base_fee: num(row?.base_fee, DEFAULT_DELIVERY_RATES.base_fee),
    base_weight_grams: num(row?.base_weight_grams, DEFAULT_DELIVERY_RATES.base_weight_grams) || DEFAULT_DELIVERY_RATES.base_weight_grams,
    extra_fee_per_kg: num(row?.extra_fee_per_kg, DEFAULT_DELIVERY_RATES.extra_fee_per_kg),
  };
}

/**
 * e.g. with the defaults: 800 g → 450, 1000 g → 450, 1200 g → 550,
 * 2000 g → 550, 2100 g → 650.
 */
export function calculateDeliveryFee(totalWeightGrams: number, rates: DeliveryRates): number {
  const weight = Math.max(0, totalWeightGrams || 0);
  const extraKg = Math.ceil(Math.max(0, weight - rates.base_weight_grams) / 1000);
  return rates.base_fee + extraKg * rates.extra_fee_per_kg;
}

/** "750 g" / "2.35 kg" */
export function formatWeight(grams: number): string {
  const g = Math.max(0, Math.round(grams || 0));
  return g < 1000 ? `${g} g` : `${parseFloat((g / 1000).toFixed(2))} kg`;
}

/** "Rs. 450" or "FREE" */
export function formatDeliveryFee(fee: number): string {
  return fee > 0 ? `Rs. ${Math.round(fee).toLocaleString()}` : "FREE";
}
