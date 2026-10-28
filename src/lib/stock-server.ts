import { getServiceClient } from "./admin-auth";
import type { VariantSelection } from "./variants";

/** One order line as the stock functions expect it. */
export interface StockLine {
  id: string;
  quantity: number;
  options: VariantSelection;
}

const OUT_OF_STOCK = "out_of_stock:";

/**
 * Takes stock for a whole order, all or nothing (see reserve_product_stock in
 * the stock migration). Server-only: uses the service role.
 */
export async function reserveStock(lines: StockLine[]): Promise<{ ok: true } | { ok: false; outOfStock?: string }> {
  const service = getServiceClient();
  if (!service) {
    console.error("[stock] SUPABASE_SERVICE_ROLE_KEY is not set; cannot reserve stock.");
    return { ok: false };
  }
  const { error } = await service.rpc("reserve_product_stock", { p_items: lines });
  if (!error) return { ok: true };
  if (error.message?.startsWith(OUT_OF_STOCK)) {
    return { ok: false, outOfStock: error.message.slice(OUT_OF_STOCK.length).trim() };
  }
  console.error("[stock] reserve failed:", error);
  return { ok: false };
}

/** Puts stock back (the order failed to save, or was cancelled). */
export async function releaseStock(lines: StockLine[]): Promise<void> {
  const service = getServiceClient();
  if (!service) return;
  const { error } = await service.rpc("release_product_stock", { p_items: lines });
  if (error) console.error("[stock] release failed:", error);
}

/** Stock lines for a saved order (only lines that recorded their options). */
export function stockLinesFromOrderItems(items: unknown): StockLine[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((i) => i && typeof i.id === "string" && Number(i.quantity) > 0)
    .map((i) => ({
      id: i.id,
      quantity: Number(i.quantity),
      options: i.options && typeof i.options === "object" ? i.options : {},
    }));
}
