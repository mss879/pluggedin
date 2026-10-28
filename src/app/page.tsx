import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { MOCK_PRODUCTS } from "./products";
import { normalizeStock, normalizeVariants } from "@/lib/variants";
import HomeClient, { type HomeTile } from "./HomeClient";
import { normalizeHomeSections, type HomeSection } from "@/lib/home-sections";

// Rendered on every request. This page shows content the admin edits
// (hero banners, products, collections). It used ISR (revalidate = 60), but on
// Netlify the runtime ISR regeneration fails: the build-time copy kept being
// served (so admin changes never appeared) and, once that cached copy was
// purged, visitors got a plain-text 500 "Internal Server Error".
export const dynamic = "force-dynamic";

// Collections drive the "Trending" and "New In" sections. They used to be
// fetched from the browser on mount, which forced the whole Supabase SDK into
// the homepage's client bundle and delayed those sections until after
// hydration. Fetching them here means the sections render in the HTML.
async function getCollections() {
  try {
    if (supabase) {
      const [collections, collectionProducts] = await Promise.all([
        supabase.from("collections").select("*"),
        supabase.from("collection_products").select("collection_id,product_id"),
      ]);
      return {
        collections: collections.error ? [] : collections.data ?? [],
        collectionProducts: collectionProducts.error ? [] : collectionProducts.data ?? [],
      };
    }
  } catch (e) {
    console.warn("Failed to fetch collections on server:", e);
  }
  return { collections: [], collectionProducts: [] };
}

async function getProducts() {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: typeof item.price === "number" ? `Rs. ${Math.round(item.price).toLocaleString()}` : (typeof item.price === "string" && !item.price.startsWith("Rs.") ? `Rs. ${item.price}` : item.price || "Rs. 0"),
          slashedPrice: item.slashed_price ? `Rs. ${Math.round(item.slashed_price).toLocaleString()}` : "",
          discount: item.discount || "",
          description: item.description,
          color: item.color || "purple",
          colors: item.colors || [],
          images: item.images || [],
          tags: item.tags || [],
          features: item.features || [],
          metaTitle: item.meta_title || "",
          stock: normalizeStock(item.stock),
          variants: normalizeVariants(item.variants, item.colors),
        }));
      }
    }
  } catch (e) {
    console.warn("Failed to fetch products on server:", e);
  }
  
  // Return local mock products without icon elements
  return MOCK_PRODUCTS.map(({ icon, ...p }) => p);
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "PluggedIn",
  "url": "https://www.pluggedin.lk",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.pluggedin.lk/shop?search={search_term_string}",
    "query-input": "required name=search_term_string"
  },
  "creator": {
    "@type": "Organization",
    "name": "ARC AI",
    "url": "https://www.arcai.agency",
    "description": "AI Automation and Software Company"
  }
};

const storeSchema = {
  "@context": "https://schema.org",
  "@type": "Store",
  "name": "PluggedIn",
  "url": "https://www.pluggedin.lk",
  "logo": "https://www.pluggedin.lk/logo.webp",
  "image": "https://www.pluggedin.lk/banner_1.webp",
  "description": "Elevate your creative setup with PluggedIn's premium creator gear. From tactile mechanical keyboards and smart desktop chargers to broadcast-quality microphones and studio monitors, we craft space-saving, premium essentials to power your productivity.",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "LK"
  },
  "priceRange": "$$",
  "creator": {
    "@type": "Organization",
    "name": "ARC AI",
    "url": "https://www.arcai.agency",
    "description": "AI Automation and Software Company"
  }
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pluggedin.lk"),
  title: "PluggedIn | Premium Workspace Essentials & Creator Gear",
  description: "Elevate your creative setup with PluggedIn's premium creator gear. From tactile mechanical keyboards and smart desktop chargers to broadcast-quality microphones and studio monitors, we craft space-saving, premium essentials to power your productivity.",
};

async function getHeroBanners() {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("hero_banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(5);

      if (!error && data && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch hero banners on server:", e);
  }
  return [];
}

// Homepage layout (Admin → Homepage Layout). Empty → the original layout.
async function getHomeSections(): Promise<HomeSection[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("home_sections")
        .select("*")
        .order("sort_order", { ascending: true });
      if (!error && data) return normalizeHomeSections(data);
    }
  } catch (e) {
    console.warn("Failed to fetch homepage layout on server:", e);
  }
  return [];
}

// Scrolling offer text under the hero (Admin → Offer Section), row 1 and row 2.
async function getMarqueeOffers(): Promise<{ text: string; row_number: number }[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("marquee_offers")
        .select("text, row_number")
        .order("created_at", { ascending: true });
      if (!error && data) return data;
    }
  } catch (e) {
    console.warn("Failed to fetch marquee offers on server:", e);
  }
  return [];
}

// "Shop by Category" bento tiles (Admin → Collections → Homepage Grid).
// Empty → HomeClient shows its built-in default tiles.
async function getHomeTiles(): Promise<HomeTile[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("home_collection_tiles")
        .select("id, title, image_url, link_url, tags, size")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!error && data) {
        return data.map((t: any) => ({
          id: t.id,
          title: t.title || "",
          image_url: t.image_url || "",
          link_url: t.link_url || "/shop",
          tags: Array.isArray(t.tags) ? t.tags : [],
          size: t.size === "wide" ? "wide" : "narrow",
        }));
      }
    }
  } catch (e) {
    console.warn("Failed to fetch homepage tiles on server:", e);
  }
  return [];
}

export default async function Page() {
  const [products, { collections, collectionProducts }, heroBanners, homeTiles, marqueeOffers, homeSections] = await Promise.all([
    getProducts(),
    getCollections(),
    getHeroBanners(),
    getHomeTiles(),
    getMarqueeOffers(),
    getHomeSections(),
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeSchema) }}
      />
      <HomeClient
        initialProducts={products as any}
        initialCollections={collections}
        initialCollectionProducts={collectionProducts}
        initialHeroBanners={heroBanners}
        initialHomeTiles={homeTiles}
        initialMarqueeOffers={marqueeOffers}
        initialHomeSections={homeSections}
      />
    </>
  );
}
