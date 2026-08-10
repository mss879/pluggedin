import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { MOCK_PRODUCTS } from "./products";
import HomeClient from "./HomeClient";

// Previously `dynamic = "force-dynamic"` + `revalidate = 0`, which meant every
// single visitor waited on a live Supabase round trip before one byte of HTML
// was sent. The catalogue changes rarely, so serve a cached render and
// regenerate it in the background at most once a minute (ISR). Publishing a
// product change can push it out immediately with revalidatePath("/").
export const revalidate = 60;

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
          metaTitle: item.meta_title || ""
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

export default async function Page() {
  const [products, { collections, collectionProducts }, heroBanners] = await Promise.all([
    getProducts(),
    getCollections(),
    getHeroBanners(),
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
      />
    </>
  );
}
