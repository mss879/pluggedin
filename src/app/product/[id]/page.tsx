import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { MOCK_PRODUCTS, getCategoryIcon, Product } from "../../products";
import ProductDetailClient from "./ProductDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      
      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          category: data.category,
          price: typeof data.price === "number" ? `Rs. ${Math.round(data.price).toLocaleString()}` : data.price,
          slashedPrice: data.slashed_price ? `Rs. ${Math.round(data.slashed_price).toLocaleString()}` : "",
          discount: data.discount || "",
          description: data.description,
          color: data.color || "purple",
          icon: getCategoryIcon(data.category, data.id),
          images: data.images || [],
          tags: data.tags || [],
          features: data.features || [],
          metaTitle: data.meta_title || "",
        };
      }
    }
  } catch (e) {
    console.warn("Failed to fetch product on server, falling back to mock:", e);
  }

  // Fallback to local mock data
  const mockProduct = MOCK_PRODUCTS.find((p) => p.id === id);
  return mockProduct || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: "Product Not Found | PluggedIn",
    };
  }

  const titleText = product.metaTitle || `${product.name} | PluggedIn Premium Creator Gear`;

  return {
    title: titleText,
    description: product.description,
    alternates: {
      canonical: `https://pluggedin.lk/product/${product.id}`,
    },
    openGraph: {
      title: titleText,
      description: product.description,
      url: `https://pluggedin.lk/product/${product.id}`,
      type: "website",
      images: product.images && product.images.length > 0 ? [product.images[0]] : ["/logo.webp"],
    },
    twitter: {
      card: "summary_large_image",
      title: titleText,
      description: product.description,
      images: product.images && product.images.length > 0 ? [product.images[0]] : ["/logo.webp"],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
