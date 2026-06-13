import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { MOCK_PRODUCTS, getCategoryIcon } from "./products";
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
          metaTitle: item.meta_title || "",
          icon: getCategoryIcon(item.category, item.id)
        }));
      }
    }
  } catch (e) {
    console.warn("Failed to fetch products on server:", e);
  }
  
  // Return local mapped mock products
  return MOCK_PRODUCTS.map(p => ({
    ...p,
    icon: p.icon || getCategoryIcon(p.category, p.id)
  }));
}

export const metadata: Metadata = {
  metadataBase: new URL("https://pluggedin.lk"),
  title: "PluggedIn | Premium Workspace Essentials & Creator Gear",
  description: "Elevate your creative setup with PluggedIn's premium creator gear. From tactile mechanical keyboards and smart desktop chargers to broadcast-quality microphones and studio monitors, we craft space-saving, premium essentials to power your productivity.",
};

export default async function Page() {
  const products = await getProducts();
  return <HomeClient initialProducts={products as any} />;
}
