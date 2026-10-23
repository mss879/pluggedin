import { getServiceClient } from "./admin-auth";
import { codeAvailabilityError, normalizeCode, type DiscountCodeRow } from "./pricing";

/**
 * Server-only lookup of a discount code. The `discount_codes` table is not
 * readable by shoppers (that would expose every code), so this uses the
 * service role.
 */
export async function lookupDiscountCode(
  rawCode: unknown
): Promise<{ row: DiscountCodeRow; error?: undefined } | { row?: undefined; error: string; status: number }> {
  const code = normalizeCode(rawCode);
  if (!code) return { error: "Please enter a discount code.", status: 400 };

  const service = getServiceClient();
  if (!service) {
    console.error("[discounts] SUPABASE_SERVICE_ROLE_KEY is not set; discount codes are unavailable.");
    return { error: "Discount codes are unavailable right now.", status: 503 };
  }

  const { data, error } = await service
    .from("discount_codes")
    .select("id, code, description, discount_type, value, product_ids, buy_qty, get_qty, min_subtotal, max_uses, used_count, starts_at, expires_at, is_active")
    .eq("code", code)
    .maybeSingle();
  if (error) {
    console.error("[discounts] lookup failed:", error);
    return { error: "Couldn't check that code. Please try again.", status: 500 };
  }
  if (!data) return { error: "That discount code doesn't exist.", status: 404 };

  const row = data as DiscountCodeRow;
  const unavailable = codeAvailabilityError(row);
  if (unavailable) return { error: unavailable, status: 400 };
  return { row };
}

export async function claimDiscountUse(id: string): Promise<boolean> {
  const service = getServiceClient();
  if (!service) return false;
  const { data, error } = await service.rpc("claim_discount_code_use", { p_id: id });
  if (error) {
    console.error("[discounts] claim failed:", error);
    return false;
  }
  return data === true;
}

export async function releaseDiscountUse(id: string): Promise<void> {
  const service = getServiceClient();
  if (!service) return;
  const { error } = await service.rpc("release_discount_code_use", { p_id: id });
  if (error) console.error("[discounts] release failed:", error);
}
