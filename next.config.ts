import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Production CSP. Kept permissive enough for the app's inline styles, inline
// JSON-LD scripts, Google Fonts, Supabase, and self-hosted media so it doesn't
// break functionality. Tighten further (e.g. nonces, drop 'unsafe-inline') once
// verified. Not applied in dev because Next's HMR relies on eval/inline.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co",
  "media-src 'self' https: blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  ...(isProd
    ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }]
    : []),
];

// Files in public/ are served unhashed, so Next sends them with
// `Cache-Control: public, max-age=0` and every visit re-validates them. A week
// of caching removes that round trip for the videos, posters and logos.
// Deliberately NOT `immutable`/1-year: these filenames are stable, so a
// year-long lock would leave visitors stuck with an old video after a swap.
const staticMediaCacheHeader = [
  {
    key: "Cache-Control",
    value: "public, max-age=604800, stale-while-revalidate=86400",
  },
];

const nextConfig: NextConfig = {
  images: {
    // AVIF first: typically 20-30% smaller than WebP at the same quality, with
    // WebP as the fallback for older clients.
    formats: ["image/avif", "image/webp"],
    // Required from Next 16 — the allowlist of `quality` values.
    qualities: [70, 75, 90],
    // Keep optimized derivatives around instead of re-encoding constantly.
    // Matched to the public/ Cache-Control below so a replaced source image is
    // picked up within the same window rather than being pinned for a month.
    minimumCacheTTL: 604800,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ffjakxowbqfrvuyvlpeh.supabase.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/:path*.(mp4|webm|webp|avif|jpg|jpeg|png|svg|ico|woff|woff2)",
        headers: staticMediaCacheHeader,
      },
    ];
  },
};

export default nextConfig;
