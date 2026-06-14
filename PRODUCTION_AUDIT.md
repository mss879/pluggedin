# PluggedIn Storefront — Production Readiness Audit

**Date:** 2026-06-14
**Scope:** `/Users/shahidshamir/Desktop/Pluggedin` (Next.js 16.2.9 / React 19 / Supabase / Resend)
**Verdict:** ⚠️ **Not production-ready yet.** The store is functional and well-built on the front end, but it has **3 critical** and several **high-severity** issues — most importantly server-side price trust, no rate limiting, and an admin area whose only gate is a client-side flag. Fix the Critical and High items below before going live.

> Note: a second project, `tie-store` (in `../tie business/`), is a front-end-only prototype with no backend or security surface. This audit covers **Pluggedin**, the production candidate.

---

## ✅ Remediation status — 2026-06-14

Most findings have been **fixed in code** and verified (clean `next build`, runtime probes pass: security headers + CSP present, cross-site origin → 403, validation → 400, price-guard rejects non-catalog products, rate-limiter → 429, all pages render 200).

| Item | Status |
|------|--------|
| C1 price tampering | ✅ Fixed — `orders/create` recomputes total from DB; client price/total ignored |
| C2 rate limiting | ✅ Fixed — `src/lib/rate-limit.ts` (orders 5/min, contact 3/min, analytics 30/min) + origin checks |
| C3 admin gate | ✅ Hardened — layout validates real Supabase session + admin email (was localStorage-only) |
| H1 storage bucket | ⏳ **Needs migration** — `20260614000001_secure_storage_and_cleanup.sql` (run in Supabase) |
| H2 XSS sanitize | ✅ Fixed — `src/lib/sanitize.ts` (DOMPurify) on product descriptions |
| H3 IP privacy | ✅ Fixed — IP anonymized (last octet zeroed) before storage |
| H4 security headers | ✅ Fixed — `next.config.ts` (CSP gated to prod) |
| H5 silent checkout failure | ✅ Fixed — error state + retry; cart kept; no fake "success" |
| M1 error leakage | ✅ Fixed — generic client messages, details server-logged only |
| M2 input caps / items | ✅ Fixed — length caps + items structure/quantity validation |
| M3 email HTML injection | ✅ Fixed — `escapeHtml()` on all user values |
| M4 weak order IDs | ✅ Fixed — `crypto.randomUUID()` |
| M6 service-role fallback | ✅ Improved — warns if missing; status allow-listed |
| M7 CORS/origin | ✅ Fixed — same-origin check on mutating routes |
| O2 PII in logs | ✅ Fixed — emails/payloads no longer logged |

**Still requires you (not code):**
1. **Run the SQL migration** `supabase/migrations/20260614000001_secure_storage_and_cleanup.sql` in Supabase (locks the product image bucket to admin). *(H1)*
2. **Disable public sign-ups** in Supabase → Auth → Providers, so `authenticated` ≠ anyone. *(H1/O4)*
3. **Set `SUPABASE_SERVICE_ROLE_KEY`** in the host env (not `NEXT_PUBLIC_`). *(M6)*
4. Confirm the `20260614000000` RLS migration is applied to prod; verify Resend domain DNS. *(O4)*

**Intentionally deferred (high-risk refactors / infra decisions, not done to avoid breaking functionality):**
- **P1/P2** media → CDN + re-enabling image optimization (deliberately disabled by you earlier; visual-impact decision).
- **P3** splitting the 2,500-line client components (large refactor).
- **M5** moving admin JWT from localStorage to httpOnly cookies (needs `@supabase/ssr` re-architecture; RLS already protects data).
- **O1** test suite. **O3** seed-data cleanup is available (commented) in the migration above.
- One stray file-sync duplicate to delete manually: `public/Products_drifting_in_frame_202606111905 2.mp4`.

---

## Severity summary

| # | Severity | Issue | Area |
|---|----------|-------|------|
| C1 | 🔴 Critical | Client controls order price / total (price tampering) | Security / $$$ |
| C2 | 🔴 Critical | No rate limiting on any public API (spam, DB flood, **email bombing / Resend cost**) | Security / Cost |
| C3 | 🔴 Critical | Admin area protected only by a client-side `localStorage` flag | Security |
| H1 | 🟠 High | Storage bucket writable by *any* authenticated user, not just admin | Security |
| H2 | 🟠 High | Unsanitized HTML render of product description (`dangerouslySetInnerHTML`) → stored XSS | Security |
| H3 | 🟠 High | Raw IP stored without consent (privacy/GDPR) | Privacy |
| H4 | 🟠 High | No security headers (CSP, HSTS, X-Frame-Options, etc.) | Security |
| H5 | 🟠 High | Checkout silently "succeeds" on API failure → lost orders | Reliability |
| M1 | 🟡 Medium | Raw DB error messages returned to client (info disclosure) | Security |
| M2 | 🟡 Medium | No input length caps / unvalidated `items` JSON | Abuse / DB bloat |
| M3 | 🟡 Medium | Email HTML built by string concat with unescaped input | Injection |
| M4 | 🟡 Medium | Weak order-ID randomness (16-bit) → collisions | Correctness |
| M5 | 🟡 Medium | Admin JWT in `localStorage` (XSS-exfiltratable) | Security |
| M6 | 🟡 Medium | `update-status` falls back to anon key if service role missing | Security |
| P1–P4 | 🔵 Perf | 39 MB of un-CDN'd assets, optimization disabled, huge client bundles, heavy fonts | Performance |
| O1–O4 | ⚪ Ops | No tests, PII in logs, USD seed data, missing config verification | Ops / Quality |

---

## 🔴 Critical

### C1 — Order price and total are trusted from the client
**Files:** `src/app/checkout/CheckoutClient.tsx:97-126`, `src/app/api/orders/create/route.ts:8-64`, `supabase/migrations/20260612000003_orders.sql`

The cart lives entirely in `localStorage` (`pluggedin_cart`). The checkout sends client-computed `total_amount` (`cartSubtotal`) **and** per-item `price` to `/api/orders/create`, which inserts them verbatim:

```ts
// CheckoutClient.tsx
total_amount: cartSubtotal,          // computed in the browser
items: cart.map(i => ({ ..., price: i.product.price })) // browser-supplied prices
```

The API route validates name/email/phone but **never recomputes the price from the database**. RLS allows the anonymous insert (`Allow anonymous order inserts ... WITH CHECK (true)`). An attacker can place an order for any product at **any price** (e.g. Rs. 1), corrupting order records, the confirmation email, and the admin dashboard. Today payment is Cash-on-Delivery so the loss is "fraudulent cheap orders," but the moment online card payment is added this becomes direct financial loss.

**Fix:** In the API route, ignore client prices entirely. Look up each `item.id` in the `products` table server-side, compute `quantity × db_price`, sum to the authoritative total, and persist *that*. Reject the order if a product id doesn't exist or quantity is invalid.

### C2 — No rate limiting on public API routes
**Files:** `src/app/api/orders/create/route.ts`, `src/app/api/contact/create/route.ts`, `src/app/api/analytics/track/route.ts`

None of the public endpoints throttle requests. Concrete consequences:
- **Email bombing & cost blowout:** every `orders/create` call triggers a Resend email to a client-supplied address (`route.ts:76`). A script can fire thousands → exhaust your Resend quota, rack up cost, and tank sender reputation/deliverability.
- **DB flooding:** `analytics/track` and `contact/create` insert a row per request with no limit → unbounded table growth and Supabase cost.

**Fix:** Add rate limiting (e.g. Upstash Ratelimit / Vercel KV, or middleware keyed on IP) — e.g. orders 5/min/IP, contact 3/min/IP, analytics 30/min/IP. Add a hidden honeypot field or a CAPTCHA/Turnstile on the contact form. Consider a daily order cap per IP.

### C3 — Admin area is gated only on the client
**Files:** `src/app/admin/layout.tsx:16-33`, `src/app/admin/login/page.tsx:41-44`

`AdminLayout` decides access purely by checking for a `localStorage` key:
```ts
const session = localStorage.getItem("pluggedin_admin_session");
if (!session && pathname !== "/admin/login") router.replace("/admin/login");
```
Anyone can open dev tools, set that key, and render the entire admin UI.

**Mitigating factor (important):** the *data* is protected — admin reads go through the Supabase client carrying the real admin JWT, and the hardened RLS policies (`20260614000000_secure_rls_policies.sql`) restrict orders/contacts/analytics SELECT to `admin@pluggedin.com`. A fake-admin with just the localStorage flag sees an empty shell. So this is not a data-breach today, but it's fragile, not defense-in-depth, and any future endpoint that forgets RLS is instantly exposed.

**Fix:** Enforce auth server-side. Move the Supabase session to cookies (`@supabase/ssr`) and protect `/admin/*` in `middleware.ts` by verifying the JWT and the admin email before the page renders. Keep RLS as the second layer.

---

## 🟠 High

### H1 — Storage bucket writable by any authenticated user
**File:** `supabase/migrations/20260613000002_create_products_storage_bucket.sql`

Table policies were tightened to the admin email, but the storage policies were **not**:
```sql
CREATE POLICY "Admin Insert Access" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products');  -- ANY authenticated user
```
If Supabase email signups are enabled (the default), anyone can register, become `authenticated`, and upload/overwrite/delete product images.

**Fix:** Add `AND auth.jwt() ->> 'email' = 'admin@pluggedin.com'` to the insert/update/delete storage policies, mirroring the table policies. **And** disable public signups in the Supabase dashboard (Auth → Providers) — see O4.

### H2 — Unsanitized HTML rendering (stored XSS sink)
**Files:** `src/app/HomeClient.tsx:2307`, `src/app/product/[id]/ProductDetailClient.tsx:268`, `src/components/RichTextEditor.tsx:21-33`

Product descriptions are authored in a `contentEditable` rich-text editor that stores **raw HTML**, then rendered with `dangerouslySetInnerHTML={{ __html: product.description }}` with no sanitization. Writes are admin-only (good), so this isn't trivially exploitable by the public, but there is no sanitization layer, and any stored markup executes in every visitor's browser.

**Fix:** Sanitize on render (and ideally on save) with `isomorphic-dompurify`, allow-listing safe tags/attributes. The JSON-LD `dangerouslySetInnerHTML` blocks (`page.tsx`, `shop/page.tsx`, etc.) are fine — those serialize trusted objects.

### H3 — Raw IP address stored without consent
**Files:** `src/app/api/analytics/track/route.ts:15-32`, `supabase/migrations/20260612000002_analytics.sql`

Every visit stores the raw client IP and user-agent. That's personal data under GDPR/PDPA with no consent banner, retention policy, or anonymization.

**Fix:** Either drop the `ip` column, hash/truncate it (e.g. zero the last octet), or gate analytics behind a cookie-consent opt-in. Add a retention/cleanup policy. Document it in the privacy policy.

### H4 — No security headers
**File:** `next.config.ts` (empty)

No CSP, HSTS, `X-Frame-Options`/`frame-ancestors` (clickjacking), `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`.

**Fix:** Add a `headers()` block in `next.config.ts` (or `middleware.ts`). Start with `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`, and a `Content-Security-Policy` (will need `'unsafe-inline'` handling for the JSON-LD/font setup — test carefully).

### H5 — Checkout silently "succeeds" when the order API fails
**File:** `src/app/checkout/CheckoutClient.tsx:133-145`

```ts
} catch (err) {
  orderIdRef = `OFFLINE-${...}`;  // fake id
}
setPlacingStatus("success");      // shows success regardless
saveCart([]);                     // clears the cart
```
If the API errors (DB down, validation, network), the customer sees a success screen with a bogus `OFFLINE-xxxx` reference and their cart is wiped — but **no order exists**. That's silent lost revenue and a support nightmare.

**Fix:** On failure, show an error state, keep the cart, and let the user retry. Only clear the cart and show success on a confirmed `data.success`.

---

## 🟡 Medium

- **M1 — Raw error leakage.** Routes return `error.message` / Supabase errors to the client (`orders/create:68,94`, `contact/create:70`, etc.). Return generic messages; log details server-side only.
- **M2 — No input caps / unvalidated `items`.** No max length on `shipping_address`, `message`, name, or the `items` array; `items` JSON structure is never validated before insert. Cap field lengths and validate `items` shape/size.
- **M3 — Email HTML injection.** `src/lib/email.ts:77-94,154,209,215` interpolate `customerName`, `shippingAddress`, `item.name`, `item.color`, etc. straight into HTML without escaping. Attacker-controlled `items` fields can inject markup. HTML-escape all interpolated values.
- **M4 — Weak order IDs.** `orders/create:50` uses `Math.floor(Math.random()*65536)` (16-bit) per day → birthday collisions after a few hundred orders/day; the `.insert` then fails. Use `crypto.randomUUID()` or a DB sequence.
- **M5 — Admin JWT in `localStorage`.** `admin/login/page.tsx:41` stores the access token in `localStorage` (readable by any JS / XSS). Prefer httpOnly cookies via `@supabase/ssr`.
- **M6 — Service-role fallback.** `orders/update-status:22` falls back to the anon key if `SUPABASE_SERVICE_ROLE_KEY` is unset. Make the service role key required in production and fail closed. Also: admin identity is a single hardcoded email — fine for one operator, but plan a roles table if the team grows.
- **M7 — Open CORS / no origin check.** Public APIs accept POSTs from any origin. Combine with C2's rate limiting and add a same-origin check for mutating routes.

---

## 🔵 Performance

- **P1 — 39 MB of assets in `/public`, served from the app origin.** ~10 MP4s (several 4–5 MB each: `Automatic_pet_feeder_commercial` 5.1 MB, `Floating_category_cards` 4.6 MB, etc.). These should live on a CDN / Supabase Storage / a video host, with poster images, multiple resolutions, and lazy loading below the fold. Preload only the single above-the-fold hero.
- **P2 — Optimization was deliberately disabled.** Git history shows lazy-loading turned off on all homepage media and Next image optimization disabled for category images "for instant load." That's counterproductive — it inflates the initial payload and hurts LCP. Re-enable `next/image` optimization and lazy-load anything below the fold.
- **P3 — Very large client components.** `HomeClient.tsx` 2,572 lines, `admin/page.tsx` 2,339, `shop/ShopClient.tsx` 1,377, all `"use client"`. Big hydration/TBT cost. Dynamic imports help (already used), but move static/presentational parts to Server Components and split these monoliths.
- **P4 — Heavy fonts.** Three Google families (Syne, Outfit ×5 weights, Inter ×6 weights) in `layout.tsx`. Trim to the weights actually used.

---

## ⚪ Ops / Quality

- **O1 — No automated tests** anywhere. Add at least API-route tests for order pricing (C1) and validation, plus a checkout smoke test.
- **O2 — PII in server logs.** `email.ts:289` and order routes `console.log` full Resend responses and order/customer data. Strip PII from production logs.
- **O3 — Stale seed data.** Orders/analytics are seeded with USD prices (`$299`) and US data while the catalog was converted to LKR. Clean seeds before launch or they'll appear in the live admin dashboard.
- **O4 — Verify Supabase config (can't be checked from code):**
  1. Confirm the `20260614000000_secure_rls_policies.sql` migration is actually applied to the production DB.
  2. **Disable public signups** (Auth → Providers) so `authenticated` ≠ "anyone" (ties to H1).
  3. Ensure `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` are set in the host (Vercel) env, and that the service role key is **never** `NEXT_PUBLIC_`.
  4. Verify the Resend sending domain (`pluggedin.lk`) is DNS-verified (SPF/DKIM).
- **Dependency audit:** only 2 moderate advisories (postcss CSS-stringify XSS, build-time only, via Next's bundled copy). Low real-world risk; keep Next patched. TypeScript `strict` is on and the build does **not** ignore TS/ESLint errors — good.

### Things already done well ✅
- RLS enabled and (after the 2026-06-14 migration) correctly restricts orders/contacts/analytics to the admin email; public read only where appropriate.
- `update-status` route properly verifies the bearer token + admin email server-side.
- Secrets are gitignored (`.env*`) and untracked; anon key is the only `NEXT_PUBLIC_` Supabase var.
- Solid SEO: metadata, JSON-LD, `sitemap.ts`, `robots.ts` disallowing `/admin` and `/checkout`, `metadataBase`.
- Server-side input validation (regex) on order and contact forms.

---

## Recommended order of work
1. **C1** price recompute, **C2** rate limiting + email-send protection, **C3** server-side admin auth (middleware). *(Block launch on these.)*
2. **H1** storage policy + disable signups, **H5** checkout failure handling, **H4** security headers, **H2** sanitize HTML, **H3** IP privacy.
3. **M1–M7** hardening, then **P1–P4** performance, then **O1–O4** ops.
