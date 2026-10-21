import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only helpers for authorising admin API requests.
 *
 * Admin access is two steps: a Supabase password sign-in for the admin email,
 * then an emailed 6-digit code (see /api/admin/2fa/*). A request is only fully
 * trusted once the Supabase session it carries (the `session_id` JWT claim)
 * has been recorded in `admin_verified_sessions`.
 */

export const ADMIN_EMAIL = "admin@pluggedin.com";

/** Inbox that receives the admin login codes. */
export const ADMIN_2FA_EMAIL = process.env.ADMIN_2FA_EMAIL || "pluggedin58@gmail.com";

/** How long a session stays verified before the code must be entered again. */
export const ADMIN_2FA_SESSION_HOURS = 12;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export interface AdminSession {
  userId: string;
  email: string;
  sessionId: string;
  /** Client that acts as the admin user (RLS applies). */
  userClient: SupabaseClient;
}

/** Service-role client for tables the browser must never touch. */
export function getServiceClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Login codes are stored hashed and bound to the session they were issued for. */
export function hashLoginCode(sessionId: string, code: string) {
  return createHash("sha256").update(`${sessionId}:${code}`).digest("hex");
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Validates the bearer token against Supabase Auth and confirms it belongs to
 * the admin. Does NOT check 2FA — use requireVerifiedAdmin for that.
 */
export async function getAdminSession(request: Request): Promise<AdminSession | null> {
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ") || !supabaseUrl || !anonKey) return null;
  const token = authHeader.substring(7);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: { user }, error } = await userClient.auth.getUser(token);
    if (error || !user || user.email !== ADMIN_EMAIL) return null;

    // Safe to read claims now that Supabase has validated the token
    const sessionId = decodeJwtPayload(token)?.session_id;
    if (typeof sessionId !== "string" || !sessionId) return null;

    return { userId: user.id, email: user.email, sessionId, userClient };
  } catch (err) {
    console.error("Admin token verification exception:", err);
    return null;
  }
}

/** True when this admin session has entered a valid emailed code. */
export async function isSessionVerified(session: AdminSession): Promise<boolean> {
  const { data, error } = await session.userClient.rpc("is_verified_admin");
  if (error) {
    console.error("is_verified_admin check failed:", error.message);
    return false;
  }
  return data === true;
}

/**
 * Returns the admin session when the request carries a password-authenticated
 * AND 2FA-verified admin token, otherwise null.
 */
export async function requireVerifiedAdmin(request: Request): Promise<AdminSession | null> {
  const session = await getAdminSession(request);
  if (!session) return null;
  return (await isSessionVerified(session)) ? session : null;
}
