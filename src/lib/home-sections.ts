/**
 * Homepage layout (Admin → Homepage Layout): the blocks of the homepage, top
 * to bottom. Stored in the `home_sections` table; the footer is always last.
 */

export type HomeSectionType = "builtin" | "banner" | "collection";

export interface HomeSection {
  id: string;
  section_type: HomeSectionType;
  /** Which original block this is (builtin sections only). */
  builtin_key: string | null;
  title: string;
  subtitle: string;
  /** Banner image or .mp4 (desktop / tablet). */
  image_url: string;
  /** Optional banner image for phones; falls back to image_url. */
  mobile_image_url: string;
  link_url: string;
  button_text: string;
  /** Collection whose products are shown (collection sections only). */
  collection_id: string | null;
  product_limit: number;
  sort_order: number;
  is_active: boolean;
}

export interface BuiltinSectionInfo {
  key: string;
  label: string;
  description: string;
  /** Admin tab where its content is edited, if any. */
  editIn?: { tab: string; label: string };
}

/** The original homepage blocks, in their original order. */
export const BUILTIN_SECTIONS: BuiltinSectionInfo[] = [
  { key: "hero", label: "Hero banner slider", description: "The big sliding banners at the top.", editIn: { tab: "hero-banners", label: "Hero Banners" } },
  { key: "perks", label: "Delivery & COD perks bar", description: "Islandwide delivery / cash on delivery strip." },
  { key: "marquee", label: "Scrolling offers (marquee)", description: "The two moving lines of text.", editIn: { tab: "offer-section", label: "Offer Section" } },
  { key: "category_grid", label: "Shop by category grid", description: "The image tiles (desktop only).", editIn: { tab: "collections", label: "Collections → Homepage Grid" } },
  { key: "video_banner", label: "Video banner", description: "\"Curated living essentials elevated\" video." },
  { key: "trending", label: "Trending products", description: "Products of the \"trending\" collection.", editIn: { tab: "collections", label: "Collections" } },
  { key: "dual_video", label: "Two side-by-side videos", description: "Product commercial videos." },
  { key: "new_in", label: "New In products", description: "Products of the \"new-in\" collection.", editIn: { tab: "collections", label: "Collections" } },
  { key: "lifestyle_gallery", label: "Lifestyle image gallery", description: "Three lifestyle photos in a row." },
  { key: "why_us", label: "Why PluggedIn?", description: "The two promise cards." },
  { key: "faq", label: "FAQ", description: "Frequently asked questions." },
];

export const builtinInfo = (key: string | null) => BUILTIN_SECTIONS.find((b) => b.key === key);

/** Blocks that sit outside the white content area (full-page width with their own gutters). */
export const OUTER_BUILTINS = new Set(["hero", "perks"]);

/** The homepage as it was before layouts existed. */
export const DEFAULT_HOME_SECTIONS: HomeSection[] = BUILTIN_SECTIONS.map((b, i) => ({
  id: `builtin-${b.key}`,
  section_type: "builtin",
  builtin_key: b.key,
  title: "",
  subtitle: "",
  image_url: "",
  mobile_image_url: "",
  link_url: "",
  button_text: "",
  collection_id: null,
  product_limit: 8,
  sort_order: i + 1,
  is_active: true,
}));

/** Cleans rows from the database, in display order. Unknown builtin keys are dropped. */
export function normalizeHomeSections(rows: unknown): HomeSection[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r && ["builtin", "banner", "collection"].includes(r.section_type))
    .filter((r) => r.section_type !== "builtin" || builtinInfo(r.builtin_key))
    .map((r) => ({
      id: String(r.id),
      section_type: r.section_type as HomeSectionType,
      builtin_key: r.builtin_key ?? null,
      title: r.title || "",
      subtitle: r.subtitle || "",
      image_url: r.image_url || "",
      mobile_image_url: r.mobile_image_url || "",
      link_url: r.link_url || "",
      button_text: r.button_text || "",
      collection_id: r.collection_id ?? null,
      product_limit: Math.min(24, Math.max(1, Number(r.product_limit) || 8)),
      sort_order: Number(r.sort_order) || 0,
      is_active: r.is_active !== false,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export const isVideoUrl = (url: string) => /\.(mp4|webm)(\?|#|$)/i.test(url);
