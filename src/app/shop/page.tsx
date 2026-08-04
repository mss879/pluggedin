import { Metadata } from "next";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { MOCK_PRODUCTS } from "../products";
import ShopClient from "./ShopClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
          category: item.category || "Tech & Gadgets",
          price: typeof item.price === "number" ? `Rs. ${Math.round(item.price).toLocaleString()}` : (typeof item.price === "string" && !item.price.startsWith("Rs.") ? `Rs. ${item.price}` : item.price || "Rs. 0"),
          slashedPrice: item.slashed_price ? `Rs. ${Math.round(item.slashed_price).toLocaleString()}` : "",
          discount: item.discount || "",
          description: item.description || "",
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
    console.warn("Failed to fetch products on server for shop:", e);
  }
  return MOCK_PRODUCTS.map(({ icon, ...p }) => p);
}

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pluggedin.lk"),
  title: "Shop All Essentials | PluggedIn Premium Creator Workspace",
  description: "Browse our diverse selection of personal electronics, smart gadgets, and home essentials.",
  openGraph: {
    title: "Shop All Essentials | PluggedIn Premium Creator Workspace",
    description: "Browse our diverse selection of personal electronics, smart gadgets, and home essentials.",
    url: "https://www.pluggedin.lk/shop",
    images: ["/banner_1.webp"],
  },
};

export default async function ShopPage() {
  const products = await getProducts();
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Shop All Essentials | PluggedIn",
    "url": "https://www.pluggedin.lk/shop",
    "description": "Browse our diverse selection of personal electronics, smart gadgets, and home essentials.",
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": products.length,
      "itemListElement": products.map((product: any, index: number) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `https://www.pluggedin.lk/product/${product.id}`,
        "name": product.name
      }))
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50/50 flex items-center justify-center font-outfit">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Loading catalog...</span>
          </div>
        </div>
      }>
        <ShopClient initialProducts={products as any} />
      </Suspense>
    </>
  );
}
