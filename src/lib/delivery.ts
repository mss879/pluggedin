/**
 * Delivery areas & charges, managed from Admin → Delivery and stored in the
 * `delivery_zones` table. No SDK import so storefront components can use it.
 */
export interface DeliveryZone {
  id: string;
  name: string;
  price: number;
}

export function normalizeDeliveryZones(rows: { id: string; name: string; price: unknown }[] | null | undefined): DeliveryZone[] {
  return (rows || []).map((r) => ({ id: r.id, name: r.name, price: Number(r.price) || 0 }));
}

/** "Rs. 350" or "FREE" */
export function formatDeliveryFee(fee: number): string {
  return fee > 0 ? `Rs. ${Math.round(fee).toLocaleString()}` : "FREE";
}
