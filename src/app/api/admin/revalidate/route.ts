import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAllowedOrigin } from "@/lib/rate-limit";
import { requireVerifiedAdmin } from "@/lib/admin-auth";

/**
 * Storefront pages are cached (ISR). After the admin changes content shown on
 * them, this drops the cached copy so the next visit renders fresh data
 * instead of waiting out the revalidate window.
 */
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = await requireVerifiedAdmin(request);
  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized access: Administrator session required" },
      { status: 401 }
    );
  }

  revalidatePath("/");
  return NextResponse.json({ success: true });
}
