import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { MOCK_PRODUCTS } from "./products";
import HomeClient from "./HomeClient";

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
          price: `Rs. ${Math.round(item.price).toLocaleString()}`,
          slashedPrice: item.slashed_price ? `Rs. ${Math.round(item.slashed_price).toLocaleString()}` : "",
          discount: item.discount || "",
          description: item.description,
          color: item.color || "purple",
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

export default async function Page() {
  const products = await getProducts();
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
      <HomeClient initialProducts={products as any} />
    </>
  );
}
