import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { isAllowedOrigin, rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  getAdminSession,
  getServiceClient,
  hashLoginCode,
  ADMIN_2FA_SESSION_HOURS,
} from "@/lib/admin-auth";

const MAX_ATTEMPTS_PER_CODE = 5;

/**
 * Checks the 6-digit code for the caller's session and, if correct, marks the
 * session as 2FA-verified.
 */
export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 10 attempts / 10 minutes / IP
    const limit = rateLimit(`admin-2fa-verify:${getClientIp(request)}`, 10, 10 * 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const session = await getAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access: Administrator session required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const code = String(body?.code || "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Please enter the 6-digit code." }, { status: 400 });
    }

    const service = getServiceClient();
    if (!service) {
      console.error("[admin-2fa] SUPABASE_SERVICE_ROLE_KEY is not set; cannot verify login codes.");
      return NextResponse.json({ error: "Two-factor authentication is not configured on the server." }, { status: 500 });
    }

    const nowIso = new Date().toISOString();
    const { data: otp, error: fetchError } = await service
      .from("admin_otp_codes")
      .select("id, code_hash, attempts")
      .eq("session_id", session.sessionId)
      .is("consumed_at", null)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("[admin-2fa] Failed to load login code:", fetchError);
      return NextResponse.json({ error: "Could not verify the code. Please try again." }, { status: 500 });
    }
    if (!otp || otp.attempts >= MAX_ATTEMPTS_PER_CODE) {
      return NextResponse.json(
        { error: "This code has expired or too many attempts were made. Please request a new code." },
        { status: 400 }
      );
    }

    const expected = Buffer.from(otp.code_hash, "hex");
    const actual = Buffer.from(hashLoginCode(session.sessionId, code), "hex");
    const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!matches) {
      await service
        .from("admin_otp_codes")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otp.id);
      const remaining = MAX_ATTEMPTS_PER_CODE - otp.attempts - 1;
      return NextResponse.json(
        {
          error: remaining > 0
            ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
            : "Incorrect code. Please request a new code.",
        },
        { status: 400 }
      );
    }

    await service.from("admin_otp_codes").update({ consumed_at: nowIso }).eq("id", otp.id);

    const { error: verifyError } = await service.from("admin_verified_sessions").upsert({
      session_id: session.sessionId,
      verified_at: nowIso,
      expires_at: new Date(Date.now() + ADMIN_2FA_SESSION_HOURS * 3_600_000).toISOString(),
    });
    if (verifyError) {
      console.error("[admin-2fa] Failed to mark session verified:", verifyError);
      return NextResponse.json({ error: "Could not complete login. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in admin 2FA verify route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
