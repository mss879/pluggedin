import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { isAllowedOrigin, rateLimit, getClientIp } from "@/lib/rate-limit";
import { getAdminSession, getServiceClient, hashLoginCode, ADMIN_2FA_EMAIL } from "@/lib/admin-auth";
import { sendAdminLoginCodeEmail } from "@/lib/email";

const CODE_TTL_MINUTES = 10;

/**
 * Emails a fresh 6-digit login code to the 2FA inbox. Requires a valid
 * password-authenticated admin session (bearer token).
 */
export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 5 codes / 10 minutes / IP
    const limit = rateLimit(`admin-2fa-send:${getClientIp(request)}`, 5, 10 * 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many codes requested. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const session = await getAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access: Administrator session required" }, { status: 401 });
    }

    const service = getServiceClient();
    if (!service) {
      console.error("[admin-2fa] SUPABASE_SERVICE_ROLE_KEY is not set; cannot issue login codes.");
      return NextResponse.json({ error: "Two-factor authentication is not configured on the server." }, { status: 500 });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const now = new Date();

    // Invalidate any earlier unused codes for this session
    await service
      .from("admin_otp_codes")
      .update({ consumed_at: now.toISOString() })
      .eq("session_id", session.sessionId)
      .is("consumed_at", null);

    const { error: insertError } = await service.from("admin_otp_codes").insert({
      session_id: session.sessionId,
      code_hash: hashLoginCode(session.sessionId, code),
      expires_at: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000).toISOString(),
    });
    if (insertError) {
      console.error("[admin-2fa] Failed to store login code:", insertError);
      return NextResponse.json({ error: "Could not create a login code. Please try again." }, { status: 500 });
    }

    const sent = await sendAdminLoginCodeEmail(ADMIN_2FA_EMAIL, code, CODE_TTL_MINUTES);
    if (!sent.success) {
      return NextResponse.json({ error: "Could not send the login code email. Please try again." }, { status: 502 });
    }

    // Only reveal a masked hint of where the code went
    const [user, domain] = ADMIN_2FA_EMAIL.split("@");
    const maskedEmail = `${user.slice(0, 2)}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;

    return NextResponse.json({ success: true, sentTo: maskedEmail, expiresInMinutes: CODE_TTL_MINUTES });
  } catch (error) {
    console.error("Error in admin 2FA send route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
