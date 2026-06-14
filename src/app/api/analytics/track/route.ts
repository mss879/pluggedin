import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIp, isAllowedOrigin } from "@/lib/rate-limit";

/**
 * Anonymize an IP for privacy (GDPR/PDPA): zero the last IPv4 octet, or keep
 * only the first 3 IPv6 hextets. We never store a full, identifiable address.
 */
function anonymizeIp(ip: string): string {
  if (!ip || ip === "unknown") return "0.0.0.0";
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  if (ip.includes(":")) {
    return ip.split(":").slice(0, 3).join(":") + "::";
  }
  return "0.0.0.0";
}

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit: 30 events / minute / IP
    const ip = getClientIp(request);
    const limit = rateLimit(`analytics:${ip}`, 30, 60_000);
    if (!limit.ok) {
      // Silently accept (no error surface) but skip the write to protect the DB
      return NextResponse.json({ success: true });
    }

    const body = await request.json().catch(() => ({}));
    const { path, referrer } = body;

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    const safePath = path.slice(0, 300);
    const safeReferrer = (typeof referrer === "string" ? referrer : "direct").slice(0, 300);
    const userAgent = (request.headers.get("user-agent") || "Unknown").slice(0, 400);
    const anonIp = anonymizeIp(ip);

    // Capture country from hosting environment headers (e.g. Vercel, Netlify)
    const country = request.headers.get("x-vercel-ip-country") ||
                    request.headers.get("cf-ipcountry") ||
                    "Unknown";

    if (supabase) {
      const { error } = await supabase
        .from("analytics_visits")
        .insert({
          path: safePath,
          referrer: safeReferrer || "direct",
          user_agent: userAgent,
          ip: anonIp,
          country,
        });

      if (error) {
        console.error("Failed to insert analytics row:", error);
        return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
      }
    } else {
      console.log(`[Offline Analytics Log] Visit tracked: ${safePath} (Referrer: ${safeReferrer})`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in analytics tracking route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
