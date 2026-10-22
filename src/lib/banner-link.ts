/**
 * Turns the link pasted into a hero banner (Admin → Hero Banners) into
 * something safe to navigate to.
 *
 * - Links to this site (pluggedin.lk, any subdomain, or a path like
 *   "/product/mouse") become in-site paths so they navigate without a full
 *   page reload.
 * - Other http(s) links are treated as external.
 * - Anything else (javascript:, mailto:, garbage) is rejected.
 */
const SITE_HOST = "pluggedin.lk";

export interface BannerLink {
  href: string;
  external: boolean;
}

export function resolveBannerLink(raw: string | null | undefined): BannerLink | null {
  const value = (raw || "").trim();
  if (!value) return null;

  if (value.startsWith("/") && !value.startsWith("//")) {
    return { href: value, external: false };
  }

  let url: URL;
  try {
    // Allow "www.pluggedin.lk/product/x" without the https:// prefix
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  if (host === SITE_HOST || host.endsWith(`.${SITE_HOST}`)) {
    return { href: `${url.pathname}${url.search}${url.hash}` || "/", external: false };
  }
  return { href: url.toString(), external: true };
}
