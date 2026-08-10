import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazy Supabase accessor for STOREFRONT CLIENT COMPONENTS.
 *
 * Why this exists: `src/lib/supabase.ts` imports `@supabase/supabase-js` at the
 * top level and calls `createClient()` during module evaluation. Any client
 * component that imported it therefore pulled ~228 KB (≈59 KB gzipped) of
 * auth + realtime SDK into that route's first-load JS — and because
 * StickyNavbar lives in the root layout, that meant *every* page, including
 * the purely static policy and blog pages.
 *
 * This module has no static import of the SDK (the `import type` above is
 * erased at compile time), so the bundler can split it out. The SDK is only
 * fetched the first time a storefront component actually needs to query.
 *
 * Server components, route handlers and /admin should keep using
 * `src/lib/supabase.ts` directly — their bundles are not shipped to visitors,
 * and admin genuinely needs the auth client.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-id") &&
    !supabaseAnonKey.includes("your-anon-key")
);

let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Returns the storefront Supabase client, loading the SDK on first use.
 * Resolves to `null` when credentials are missing so callers can fall back to
 * mock data exactly as they did before.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);

  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(supabaseUrl as string, supabaseAnonKey as string, {
      // Anonymous storefront traffic never signs in. Disabling these avoids a
      // permanent 30s token-refresh timer, a localStorage read and a
      // visibilitychange listener on every page load.
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  );

  return clientPromise;
}
