import { NextResponse } from "next/server";
import { isAllowedOrigin, rateLimit, getClientIp } from "@/lib/rate-limit";
import { lookupDiscountCode } from "@/lib/discounts-server";
import { describeDiscount, toDiscountRule } from "@/lib/pricing";

/**
 * Checkout "Apply" button: confirms a code exists and is currently usable and
 * returns its rule so the browser can preview the discount. Whether it fits
 * the basket (minimum order, eligible products) is checked by the shared
 * pricing code, and everything is re-checked when the order is placed.
 */
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Slow down code guessing: 20 checks / 10 minutes / IP
  const limit = rateLimit(`discount-validate:${getClientIp(request)}`, 20, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const result = await lookupDiscountCode(body?.code);
  if (!result.row) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const rule = toDiscountRule(result.row);
  return NextResponse.json({
    success: true,
    rule,
    label: result.row.description || describeDiscount(rule),
  });
}
