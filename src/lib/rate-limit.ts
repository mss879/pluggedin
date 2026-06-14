/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * NOTE: This lives in process memory. On a single long-lived server (or low
 * traffic) it provides solid protection. On multi-instance / serverless
 * deployments each instance keeps its own counters, so for hard guarantees at
 * scale swap this for a shared store (Upstash Ratelimit / Vercel KV) using the
 * same `rateLimit()` signature.
 */

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// Periodically purge expired buckets so the map can't grow unbounded.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * @param identifier  Unique key (typically `${routeName}:${ip}`).
 * @param limit       Max requests allowed per window.
 * @param windowMs    Window length in milliseconds.
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(identifier);

  if (!existing || existing.resetAt <= now) {
    buckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Best-effort client IP extraction from common proxy headers. */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Rejects cross-site POSTs to mutating endpoints. Allows same-origin requests
 * and requests with no Origin header (e.g. server-to-server, curl health
 * checks) so we don't break non-browser callers, while blocking the common CSRF
 * / abuse vector of another website POSTing to our API.
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser / same-origin navigations

  const host = request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
