"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Preloader from "../components/Preloader";
import LazyVideo from "../components/LazyVideo";
import { supabase } from "../lib/supabase";
import { sanitizeHtml } from "@/lib/sanitize";
import Footer from "../components/Footer";

interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  slashedPrice: string;
  discount: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  tags?: string[];
  images?: string[];
  colors?: string[];
  features?: string[];
}

interface CartItem {
  product: Product;
  quantity: number;
  color: string;
}

const getProductColors = (product: Product): string[] => {
  switch (product.category) {
    case "Audio":
      return ["Space Purple", "Matte Black", "Silver Gray"];
    case "Charging":
      return ["Carbon Black", "Arctic White"];
    case "Keyboards":
      return ["Onyx Black", "Chalk White", "Neon Purple"];
    case "Sleeves":
      return ["Ash Grey", "Midnight Black"];
    case "Lighting":
      return ["Matte Black", "Silver"];
    case "Risers":
      return ["Silver Gray", "Charcoal Black"];
    case "Mouse":
      return ["Onyx Black", "Chalk White"];
    case "Speaker":
      return ["Onyx Black", "Lunar Grey"];
    case "Webcam":
      return ["Matte Black"];
    case "Mic":
      return ["Onyx Black", "Frost White", "Space Purple"];
    case "Stand":
      return ["Onyx Black", "Lunar Grey"];
    case "Backpack":
      return ["Slate Grey", "Onyx Black"];
    default:
      return [product.color.charAt(0).toUpperCase() + product.color.slice(1)];
  }
};

const getColorHex = (colorName: string): string => {
  const name = colorName.toLowerCase();
  if (name.includes("purple")) return "#8b5cf6";
  if (name.includes("slate") || name.includes("charcoal")) return "#475569";
  if (name.includes("grey") || name.includes("gray") || name.includes("ash")) return "#9ca3af";
  if (name.includes("black") || name.includes("onyx") || name.includes("carbon") || name.includes("midnight")) return "#18181b";
  if (name.includes("white") || name.includes("chalk") || name.includes("frost") || name.includes("arctic")) return "#f4f4f5";
  if (name.includes("silver") || name.includes("lunar")) return "#e4e4e7";
  return "#a855f7"; // fallback purple
};

const getIconForProduct = (id: string, category: string, color: string): React.ReactNode => {
  // Find in MOCK_PRODUCTS if ID matches
  const match = MOCK_PRODUCTS.find(p => p.id === id);
  if (match) return match.icon;

  // Otherwise, default icons based on category
  const lowerCat = category.toLowerCase();
  const iconColor = color ? `text-${color}-600` : "text-purple-600";
  
  if (lowerCat.includes("kitchen") || lowerCat.includes("home")) {
    return (
      <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    );
  }
  if (lowerCat.includes("tech") || lowerCat.includes("gadget")) {
    return (
      <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    );
  }
  if (lowerCat.includes("mobile") || lowerCat.includes("auto")) {
    return (
      <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM12 7v6" />
      </svg>
    );
  }
  if (lowerCat.includes("best") || lowerCat.includes("seller")) {
    return (
      <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.907a1 1 0 00.95-.69l1.519-4.674z" />
      </svg>
    );
  }
  if (lowerCat.includes("trend")) {
    return (
      <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    );
  }
  // Default fallback (Gear icon)
  return (
    <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  );
};

const MOCK_PRODUCTS: Product[] = [
  {
    id: "headphones",
    name: "Pro Noise-Cancelling Headphones",
    category: "Best sellers",
    price: "Rs. 90,000",
    slashedPrice: "Rs. 120,000",
    discount: "25% OFF",
    description: "Studio-grade sound, ultimate comfort & active noise cancellation.",
    color: "purple",
    icon: (
      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: "charger",
    name: "Smart Dual Wireless Charger",
    category: "Tech & Gadgets",
    price: "Rs. 27,000",
    slashedPrice: "Rs. 36,000",
    discount: "25% OFF",
    description: "Fast-charging pad for your phone and watch with a sleek leather surface.",
    color: "amber",
    icon: (
      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    id: "keyboard",
    name: "Creations Mechanical Keyboard",
    category: "Best sellers",
    price: "Rs. 48,000",
    slashedPrice: "Rs. 63,000",
    discount: "24% OFF",
    description: "Hot-swappable tactile switches, wooden base frame, retro keycaps.",
    color: "blue",
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    )
  },
  {
    id: "sleeve",
    name: "Minimalist Tech Sleeve",
    category: "Tech & Gadgets",
    price: "Rs. 13,500",
    slashedPrice: "Rs. 18,000",
    discount: "25% OFF",
    description: "Water-resistant canvas organizer for cords, power banks, and cards.",
    color: "emerald",
    icon: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  {
    id: "lightbar",
    name: "Ambient LED Desk Bar",
    category: "Home and kitchen",
    price: "Rs. 24,000",
    slashedPrice: "Rs. 33,000",
    discount: "28% OFF",
    description: "Monitor-mounted lighting with smart hue adjustment and music sync.",
    color: "pink",
    icon: (
      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  },
  {
    id: "riser",
    name: "Carbon Fiber Laptop Lift",
    category: "Tech & Gadgets",
    price: "Rs. 19,500",
    slashedPrice: "Rs. 27,000",
    discount: "27% OFF",
    description: "Lightweight, ultra-durable carbon fiber laptop riser.",
    color: "slate",
    icon: (
      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
      </svg>
    )
  },
  {
    id: "mouse",
    name: "Precision Workspace Mouse",
    category: "Tech & Gadgets",
    price: "Rs. 39,000",
    slashedPrice: "Rs. 54,000",
    discount: "28% OFF",
    description: "Ergonomic workspace mouse with smart scroll wheel and silent clicks.",
    color: "slate",
    icon: (
      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3a6 6 0 00-6 6v6a6 6 0 0012 0V9a6 6 0 00-6-6zm0 4v3" />
      </svg>
    )
  },
  {
    id: "speaker",
    name: "Hi-Fi Studio Monitor Speaker",
    category: "Home and kitchen",
    price: "Rs. 105,000",
    slashedPrice: "Rs. 138,000",
    discount: "24% OFF",
    description: "High-resolution desktop monitor speakers with premium carbon cone drivers.",
    color: "purple",
    icon: (
      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    )
  },
  {
    id: "webcam",
    name: "4K Creator Webcam",
    category: "Trending",
    price: "Rs. 60,000",
    slashedPrice: "Rs. 81,000",
    discount: "26% OFF",
    description: "Ultra-wide 4K webcam with automatic framing and high dynamic range.",
    color: "blue",
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: "mic",
    name: "USB Condenser Microphone",
    category: "Trending",
    price: "Rs. 54,000",
    slashedPrice: "Rs. 72,000",
    discount: "25% OFF",
    description: "Cardioid condenser microphone with dynamic noise suppression filter.",
    color: "emerald",
    icon: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    )
  },
  {
    id: "stand",
    name: "MagSafe Desk Mount",
    category: "Mobile & Auto",
    price: "Rs. 15,000",
    slashedPrice: "Rs. 21,000",
    discount: "30% OFF",
    description: "Magnetic phone mount machined from solid aerospace-grade aluminum.",
    color: "amber",
    icon: (
      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM12 7v6" />
      </svg>
    )
  },
  {
    id: "backpack",
    name: "Urban Tech Backpack",
    category: "Mobile & Auto",
    price: "Rs. 42,000",
    slashedPrice: "Rs. 57,000",
    discount: "26% OFF",
    description: "Weatherproof layout with dedicated laptop compartment and luggage pass-through.",
    color: "slate",
    icon: (
      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    )
  }
];

export default function HomeClient({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preloadedAssets, setPreloadedAssets] = useState<{ videoUrl: string; logoUrl: string; isVideoMobile: boolean } | null>(null);

  useEffect(() => {
    setIsClient(true);
    try {
      const seen = sessionStorage.getItem("pluggedin_preloader_seen");
      if (seen === "true") {
        setIsLoading(false);
      }
    } catch (e) {
      console.error(e);
    }

    // Lock scroll on home page mount
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.height = "100vh";
    document.body.style.height = "100vh";
    document.documentElement.style.width = "100vw";
    document.body.style.width = "100vw";

    return () => {
      // Restore scroll when navigating away
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.documentElement.style.height = "";
      document.body.style.height = "";
      document.documentElement.style.width = "";
      document.body.style.width = "";
    };
  }, []);

  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [videoSource, setVideoSource] = useState<string>("/Products_drifting_in_frame_202606111905.mp4");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setVideoSource(
          preloadedAssets?.isVideoMobile
            ? preloadedAssets.videoUrl
            : "/Improve_product_movement_erratic_202606140038.mp4"
        );
      } else {
        setVideoSource(
          (preloadedAssets && !preloadedAssets.isVideoMobile)
            ? preloadedAssets.videoUrl
            : "/Products_drifting_in_frame_202606111905.mp4"
        );
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [preloadedAssets]);

  // Track scroll position of the bento drawer sheet relative to viewport height
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const clientHeight = e.currentTarget.clientHeight;
    // When the user scrolls past the viewport height, the hero background video is completely covered
    const visible = scrollTop < clientHeight - 20; // 20px buffer before it fully disappears
    if (visible !== isHeroVisible) {
      setIsHeroVisible(visible);
    }
  };

  // Play/pause the background video programmatically when it is active/covered
  useEffect(() => {
    if (!heroVideoRef.current) return;
    if (isHeroVisible) {
      heroVideoRef.current.play().catch(err => {
        // Safe check for autoplay interrupt restrictions
        console.log("Hero background video playback status:", err);
      });
    } else {
      heroVideoRef.current.pause();
    }
  }, [isHeroVisible]);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [searchToast, setSearchToast] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(() =>
    initialProducts.map((p) => ({
      ...p,
      colors: p.colors || [],
      images: p.images || [],
      tags: p.tags || [],
      features: p.features || [],
      icon: getIconForProduct(p.id, p.category, p.color),
    }))
  );
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionProducts, setCollectionProducts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Cart States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeColor, setActiveColor] = useState<string>("");
  const [activeQuantity, setActiveQuantity] = useState<number>(1);
  const [cartAnimate, setCartAnimate] = useState(false);

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Sync with localStorage on mount
  useEffect(() => {
    const syncCart = () => {
      try {
        const savedCart = localStorage.getItem("pluggedin_cart");
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        } else {
          setCart([]);
        }
      } catch (e) {
        console.error("Failed to load cart from localStorage", e);
      }
    };
    syncCart();
    window.addEventListener("cart-updated", syncCart);
    return () => {
      window.removeEventListener("cart-updated", syncCart);
    };
  }, []);

  // Fetch products and collections from Supabase on mount (fall back to MOCK_PRODUCTS if offline/unconfigured)
  useEffect(() => {
    const fetchStorefrontData = async () => {
      try {
        if (supabase) {
          const [productsRes, collectionsRes, collectionProductsRes] = await Promise.all([
            supabase.from("products").select("*"),
            supabase.from("collections").select("*"),
            supabase.from("collection_products").select("*")
          ]);

          if (!productsRes.error && productsRes.data && productsRes.data.length > 0) {
            const mapped = productsRes.data.map((item: any) => ({
              id: item.id,
              name: item.name,
              category: item.category,
              price: `Rs. ${Math.round(item.price).toLocaleString()}`,
              slashedPrice: item.slashed_price ? `Rs. ${Math.round(item.slashed_price).toLocaleString()}` : "",
              discount: item.discount || "",
              description: item.description,
              color: item.color || "purple",
              colors: item.colors || [],
              images: item.images || [],
              tags: item.tags || [],
              features: item.features || [],
              metaTitle: item.meta_title || "",
              icon: getIconForProduct(item.id, item.category, item.color)
            }));
            setProducts(mapped);
          }

          if (!collectionsRes.error && collectionsRes.data) {
            setCollections(collectionsRes.data);
          }
          if (!collectionProductsRes.error && collectionProductsRes.data) {
            setCollectionProducts(collectionProductsRes.data);
          }
        }
      } catch (err) {
        console.warn("Failed to load storefront products or collections from Supabase, using mock fallback:", err);
      }
    };
    fetchStorefrontData();

    // Load recent searches
    try {
      const saved = localStorage.getItem("pluggedin_recent_searches");
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load recent searches", e);
    }
  }, []);

  // Debounced interactive search querying synced products locally
  useEffect(() => {
    const performSearch = () => {
      const trimmedQuery = searchQuery.trim().toLowerCase();
      if (!trimmedQuery) {
        setSearchResults([]);
        setFocusedIndex(-1);
        return;
      }

      setIsSearchingDb(true);
      try {
        const localResults = products.filter(p => 
          p.name.toLowerCase().includes(trimmedQuery) ||
          p.category.toLowerCase().includes(trimmedQuery) ||
          p.description.toLowerCase().includes(trimmedQuery) ||
          (p.tags && p.tags.some(tag => tag.toLowerCase().includes(trimmedQuery)))
        );
        setSearchResults(localResults);
      } catch (err) {
        console.warn("Search error:", err);
      } finally {
        setIsSearchingDb(false);
        setFocusedIndex(-1);
      }
    };

    const delayDebounce = setTimeout(() => {
      performSearch();
    }, 100);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, products]);

  // Save to localStorage when cart changes
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      // Strip non-serializable `icon` (React.ReactNode) before persisting
      const serializableCart = newCart.map((item) => ({
        ...item,
        product: { ...item.product, icon: undefined },
      }));
      localStorage.setItem("pluggedin_cart", JSON.stringify(serializableCart));
      window.dispatchEvent(new Event("cart-updated"));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  };

  const addToCart = (product: Product, quantity: number, color: string) => {
    const existingIndex = cart.findIndex(
      (item) => item.product.id === product.id && item.color === color
    );
    let newCart = [...cart];
    if (existingIndex > -1) {
      newCart[existingIndex].quantity += quantity;
    } else {
      newCart.push({ product, quantity, color });
    }
    saveCart(newCart);

    // Trigger cart badge animation
    setCartAnimate(true);
    setTimeout(() => setCartAnimate(false), 800);

    // Toast notification
    setSearchToast(`Added ${quantity}x ${product.name} (${color}) to cart!`);
    setTimeout(() => setSearchToast(null), 3000);
  };

  const removeFromCart = (productId: string, color: string) => {
    const newCart = cart.filter(
      (item) => !(item.product.id === productId && item.color === color)
    );
    saveCart(newCart);
    
    setSearchToast(`Removed item from cart`);
    setTimeout(() => setSearchToast(null), 3000);
  };

  const updateQuantity = (productId: string, color: string, delta: number) => {
    const existingIndex = cart.findIndex(
      (item) => item.product.id === productId && item.color === color
    );
    if (existingIndex > -1) {
      let newCart = [...cart];
      const newQty = newCart[existingIndex].quantity + delta;
      if (newQty <= 0) {
        newCart = newCart.filter(
          (item) => !(item.product.id === productId && item.color === color)
        );
      } else {
        newCart[existingIndex].quantity = newQty;
      }
      saveCart(newCart);
    }
  };

  const clearCart = () => {
    saveCart([]);
  };

  const parsePrice = (priceStr: string) => {
    const cleanStr = priceStr.replace(/rs\.?/i, "").replace(/[^0-9.]/g, "");
    return parseFloat(cleanStr) || 0;
  };

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + parsePrice(item.product.price) * item.quantity,
    0
  );

  // Reset active quantity and active color when active product changes
  useEffect(() => {
    if (activeProduct) {
      setActiveQuantity(1);
      const colors = getProductColors(activeProduct);
      setActiveColor(colors[0] || activeProduct.color);
    }
  }, [activeProduct]);

  const handleSelectProduct = (product: Product) => {
    setIsSearching(false);
    setSearchQuery("");
    router.push(`/product/${product.id}`);
    
    // Save to recent searches if query was typed
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      const updated = [q, ...recentSearches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      try {
        localStorage.setItem("pluggedin_recent_searches", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save recent searches", e);
      }
    }
    
    setSearchQuery("");
    
    // Show a quick success toast
    setSearchToast(`Viewing ${product.name}`);
    setTimeout(() => setSearchToast(null), 3000);
  };

  // Keyboard navigation logic
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsSearching(false);
      setSearchQuery("");
      const btn = document.getElementById("search-bar-toggle-button");
      if (btn) btn.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const count = searchResults.length;
        if (count === 0) return -1;
        return prev < count - 1 ? prev + 1 : 0;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const count = searchResults.length;
        if (count === 0) return -1;
        return prev > 0 ? prev - 1 : count - 1;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
        handleSelectProduct(searchResults[focusedIndex]);
      } else if (searchResults.length > 0) {
        handleSelectProduct(searchResults[0]);
      }
    }
  };

  // Click outside listener
  useEffect(() => {
    if (!isSearching) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("#interactive-search-container") && 
        !target.closest("#search-bar-toggle-button")
      ) {
        setIsSearching(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearching]);

  // Focus input when opened
  useEffect(() => {
    if (isSearching) {
      const input = document.getElementById("interactive-search-input") as HTMLInputElement;
      if (input) {
        setTimeout(() => input.focus(), 150);
      }
      setFocusedIndex(-1);
    }
  }, [isSearching]);

  // Helper function to highlight matches
  const highlightMatch = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const cleanQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = text.split(new RegExp(`(${cleanQuery})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-purple-200/60 text-purple-950 font-bold rounded-sm px-0.5 no-underline">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Dynamic collections filtering for Section 4 (Trending) and Section 5 (New In)
  const trendingProducts = (() => {
    const coll = collections.find(c => c.id.toLowerCase() === "trending-products" || c.id.toLowerCase() === "trending");
    if (!coll) {
      // Fallback: original mock IDs + category match
      return products.filter(p => ["headphones", "charger", "keyboard", "sleeve", "lightbar", "riser", "mouse"].includes(p.id) || p.category.toLowerCase() === "trending");
    }
    if (coll.type === "smart") {
      const matchTags = (coll.rules?.tags || []).map((t: string) => t.toLowerCase());
      return products.filter(p => {
        const pTags = (p.tags || []).map((t: string) => t.toLowerCase());
        return matchTags.some((t: string) => pTags.includes(t));
      });
    } else {
      return products.filter(p => 
        collectionProducts.some(cp => cp.collection_id === coll.id && cp.product_id === p.id)
      );
    }
  })();

  const newInProducts = (() => {
    const coll = collections.find(c => c.id.toLowerCase() === "new-in");
    if (!coll) {
      // Fallback: original mock IDs
      return products.filter(p => ["speaker", "webcam", "mic", "stand", "backpack"].includes(p.id));
    }
    if (coll.type === "smart") {
      const matchTags = (coll.rules?.tags || []).map((t: string) => t.toLowerCase());
      return products.filter(p => {
        const pTags = (p.tags || []).map((t: string) => t.toLowerCase());
        return matchTags.some((t: string) => pTags.includes(t));
      });
    } else {
      return products.filter(p => 
        collectionProducts.some(cp => cp.collection_id === coll.id && cp.product_id === p.id)
      );
    }
  })();

  return (
    <>
      {(!isClient || isLoading) && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#fbfbfe] select-none text-zinc-800 font-mono">
          {isClient ? (
            <Preloader
              onComplete={(assets) => {
                try {
                  sessionStorage.setItem("pluggedin_preloader_seen", "true");
                } catch (e) {
                  console.error(e);
                }
                setPreloadedAssets(assets);
                setIsLoading(false);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-12 h-12 border-[4px] border-purple-500/20 border-t-purple-600 rounded-full animate-spin" />
              <span className="text-[10px] font-bold tracking-[0.3em] text-purple-650 uppercase">
                LOADING ARCHITECTURE...
              </span>
            </div>
          )}
        </div>
      )}
      <div
        className={`w-screen h-screen overflow-hidden bg-white p-1.5 lg:p-2.5 flex flex-col justify-stretch relative font-outfit select-none transition-all duration-[1600ms] ease-out ${
          (!isClient || isLoading) ? "opacity-0 scale-90 translate-y-12 pointer-events-none" : "opacity-100 scale-100 translate-y-0"
        }`}
        style={{
          transform: (!isClient || isLoading) ? "perspective(1200px) rotateX(10deg)" : "perspective(1200px) rotateX(0deg)",
          transformOrigin: "bottom center",
        }}
      >

      {/* Custom SVG Background Shape with Rounded Corners & Smoothed Center Dip */}
      <div className="absolute inset-1.5 lg:inset-2.5 z-0 pointer-events-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)] drop-shadow-[0_4px_8px_rgba(0,0,0,0.06)]">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <defs>
            <clipPath id="card-clip" clipPathUnits="objectBoundingBox">
              <path
                d="M 0.032 0.00167 
                   L 0.32 0.00167 
                   C 0.34 0.00167, 0.35 0.11833, 0.37 0.11833 
                   L 0.63 0.11833 
                   C 0.65 0.11833, 0.66 0.00167, 0.68 0.00167 
                   L 0.968 0.00167 
                   A 0.031 0.05167 0 0 1 0.999 0.05333 
                   L 0.999 0.93333 
                   A 0.03 0.05 0 0 1 0.969 0.98333 
                   L 0.031 0.98333 
                   A 0.03 0.05 0 0 1 0.001 0.93333 
                   L 0.001 0.05333 
                   A 0.031 0.05167 0 0 1 0.032 0.00167 Z"
              />
            </clipPath>
            <clipPath id="card-clip-mobile" clipPathUnits="objectBoundingBox">
              <path
                d="M 0.08 0.00167 
                   L 0.92 0.00167 
                   A 0.08 0.04 0 0 1 0.999 0.04167 
                   L 0.999 0.95833 
                   A 0.08 0.04 0 0 1 0.92 0.99833 
                   L 0.08 0.99833 
                   A 0.08 0.04 0 0 1 0.001 0.95833 
                   L 0.001 0.04167 
                   A 0.08 0.04 0 0 1 0.08 0.00167 Z"
              />
            </clipPath>
          </defs>

          {/* Desktop/Tablet Card Shape (with Logo Cutout) */}
          <g className="hidden md:block">
            {/* 1. Back 3D Extrusion Layer */}
            <path
              d="M 32 1 
                 L 320 1 
                 C 340 1, 350 71, 370 71 
                 L 630 71 
                 C 650 71, 660 1, 680 1 
                 L 968 1 
                 A 31 31 0 0 1 999 32 
                 L 999 560 
                 A 30 30 0 0 1 969 590 
                 L 31 590 
                 A 30 30 0 0 1 1 560 
                 L 1 32 
                 A 31 31 0 0 1 32 1 Z"
              fill="#9674eb"
              stroke="#9674eb"
              strokeWidth="8"
              transform="translate(0, 8)"
            />

            {/* 2. Main card shape front face */}
            <path
              d="M 32 1 
                 L 320 1 
                 C 340 1, 350 71, 370 71 
                 L 630 71 
                 C 650 71, 660 1, 680 1 
                 L 968 1 
                 A 31 31 0 0 1 999 32 
                 L 999 560 
                 A 30 30 0 0 1 969 590 
                 L 31 590 
                 A 30 30 0 0 1 1 560 
                 L 1 32 
                 A 31 31 0 0 1 32 1 Z"
              fill="white"
              stroke="#c1a8f6"
              strokeWidth="8"
              opacity="0.95"
            />
          </g>

          {/* Mobile Card Shape (Clean rounded rect with shallow logo cutout) */}
          <g className="block md:hidden">
            {/* 1. Back 3D Extrusion Layer */}
            <path
              d="M 80 1 
                 L 920 1 
                 A 80 24 0 0 1 999 25 
                 L 999 575 
                 A 80 24 0 0 1 920 599 
                 L 80 599 
                 A 80 24 0 0 1 1 575 
                 L 1 25 
                 A 80 24 0 0 1 80 1 Z"
              fill="#9674eb"
              stroke="#9674eb"
              strokeWidth="8"
              transform="translate(0, 8)"
            />

            {/* 2. Main card shape front face */}
            <path
              d="M 80 1 
                 L 920 1 
                 A 80 24 0 0 1 999 25 
                 L 999 575 
                 A 80 24 0 0 1 920 599 
                 L 80 599 
                 A 80 24 0 0 1 1 575 
                 L 1 25 
                 A 80 24 0 0 1 80 1 Z"
              fill="white"
              stroke="#c1a8f6"
              strokeWidth="8"
              opacity="0.95"
            />
          </g>
        </svg>
      </div>

      {/* Background Video clipped to the card shape (fills container, white overlays blend it seamlessly) */}
      <div
        className="absolute inset-1.5 lg:inset-2.5 z-0 overflow-hidden pointer-events-none"
        style={{ clipPath: "var(--card-clip-path)" }}
      >
        <video
          ref={heroVideoRef}
          className="w-full h-full object-cover"
          style={{ display: (isHeroVisible && !isLoading) ? "block" : "none" }}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          src={preloadedAssets ? videoSource : undefined}
        >
          {!preloadedAssets && (
            <>
              <source src="/Improve_product_movement_erratic_202606140038.mp4" type="video/mp4" media="(max-width: 767px)" />
              <source src="/Products_drifting_in_frame_202606111905.mp4" type="video/mp4" />
            </>
          )}
        </video>
        {/* Top-to-Bottom Gradient: protects the navbar options and logo area from overlapping video content */}
        <div
          className="absolute top-0 left-0 right-0 h-[100px] lg:h-[130px] pointer-events-none backdrop-blur-[2px]"
          style={{
            background: "linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.92) 35%, rgba(255, 255, 255, 0.55) 65%, rgba(255, 255, 255, 0.15) 85%, rgba(255, 255, 255, 0) 100%)"
          }}
        />
        {/* Bottom-to-Top Gradient: protects the bottom content area from overlapping video content */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[35px] lg:h-[50px] pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.7) 20%, rgba(255, 255, 255, 0.35) 45%, rgba(255, 255, 255, 0.1) 70%, rgba(255, 255, 255, 0) 100%)"
          }}
        />
      </div>

      {/* Main Inner Custom Shape Card */}
      <main className="absolute inset-0 overflow-hidden flex flex-col justify-between z-10">

        {/* Content Wrapper */}
        <div 
          onScroll={handleScroll}
          className="relative z-10 w-full h-full overflow-y-auto scrollbar-thin flex flex-col p-0 min-h-0 pb-20 md:pb-0"
        >

          {/* Sticky Hero Section Wrapper (remains fixed on first fold, covered by solid white sheet on scroll) */}
          <div className="sticky top-0 z-10 w-full min-h-full flex flex-col justify-between shrink-0 pointer-events-none pt-6 lg:pt-8 px-6 lg:px-8 pb-4 relative">

            {/* Logo inside the card wrapper, nestled in the top center cutout (fluidly scaled with parent Y-height) */}
            <div
              className={`absolute top-[2.2%] md:top-[2.0%] left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center justify-center w-[32%] md:w-[22%] lg:w-[23%] h-[5.5%] md:h-[8.0%] transition-all duration-[1000ms] delay-[300ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isLoading ? "opacity-0 -translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100"
              }`}
            >
              <a href="#" className="block w-full h-full hover:opacity-75 transition-opacity duration-300 relative">
                <Image
                  src={preloadedAssets?.logoUrl || "/logo.webp"}
                  alt="Pluggedin Logo"
                  fill
                  sizes="(max-width: 768px) 32vw, 23vw"
                  style={{ objectFit: "contain" }}
                  preload={true}
                  loading="eager"
                />
              </a>
            </div>

          {/* Header Navigation Layer (pushed away from the center cutout) */}
          <header className="w-full flex items-center justify-between h-[40px] md:h-[50px] pointer-events-none -mt-1 md:-mt-1.5 lg:-mt-2 shrink-0">

            {/* Left Nav Block */}
            <div
              className={`flex items-center gap-2 sm:gap-4 lg:gap-6 w-[35%] justify-center -ml-4 lg:-ml-8 pointer-events-auto transition-all duration-[800ms] delay-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isLoading ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
              } ${isSearching ? "opacity-0 pointer-events-none scale-95" : ""}`}
            >
              <div className="hidden md:flex items-center gap-2 sm:gap-4 lg:gap-6">
                {[
                  { name: "ABOUT", href: "/about", isExternal: true },
                  { name: "BLOG", href: "/blog", isExternal: true },
                  { name: "SHOP", href: "/shop", isExternal: true },
                  { name: "TRENDING", href: "/shop?collection=trending", isExternal: true },
                ].map((link) => (
                  link.isExternal ? (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="text-[10px] sm:text-xs lg:text-sm font-bold tracking-widest text-black hover:text-zinc-600 transition-colors duration-300 relative group"
                    >
                      {link.name}
                      <span className="absolute bottom-[-4px] left-0 w-0 h-[1.5px] bg-zinc-950 transition-all duration-300 group-hover:w-full" />
                    </Link>
                  ) : (
                    <a
                      key={link.name}
                      href={link.href}
                      className="text-[10px] sm:text-xs lg:text-sm font-bold tracking-widest text-black hover:text-zinc-600 transition-colors duration-300 relative group"
                    >
                      {link.name}
                      <span className="absolute bottom-[-4px] left-0 w-0 h-[1.5px] bg-zinc-950 transition-all duration-300 group-hover:w-full" />
                    </a>
                  )
                ))}
              </div>
            </div>

            {/* Center Spacer for Logo Cutout */}
            <div className="w-[30%]" />

            {/* Right Nav Block (links centered in the gap, action icons aligned right) */}
            <div
              className={`flex items-center w-[35%] pointer-events-auto pr-1 lg:pr-3 transition-all duration-[800ms] delay-[550ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isLoading ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
              }`}
            >
              <div 
                className={`hidden lg:flex flex-grow items-center justify-center gap-4 lg:gap-6 transition-all duration-500 ease-out origin-center ${
                  isSearching 
                    ? "opacity-0 -translate-x-4 pointer-events-none max-w-0 overflow-hidden" 
                    : "opacity-100 translate-x-4"
                }`}
              >
                {[
                  { name: "NEW IN", href: "/shop?collection=new-in", isExternal: true },
                  { name: "CONTACT", href: "/contact", isExternal: true }
                ].map((item) => (
                  item.isExternal ? (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="text-xs lg:text-sm font-bold tracking-widest text-black hover:text-zinc-600 transition-colors duration-300 relative group"
                    >
                      {item.name}
                      <span className="absolute bottom-[-4px] left-0 w-0 h-[1.5px] bg-zinc-950 transition-all duration-300 group-hover:w-full" />
                    </Link>
                  ) : (
                    <a
                      key={item.name}
                      href={item.href}
                      className="text-xs lg:text-sm font-bold tracking-widest text-black hover:text-zinc-600 transition-colors duration-300 relative group"
                    >
                      {item.name}
                      <span className="absolute bottom-[-4px] left-0 w-0 h-[1.5px] bg-zinc-950 transition-all duration-300 group-hover:w-full" />
                    </a>
                  )
                ))}
              </div>

              {/* Action Buttons (Search & Cart) / Search Input Container */}
              <div 
                id="interactive-search-container"
                className="relative flex items-center justify-end ml-auto shrink-0"
              >
                {/* Expanding Search Bar Input */}
                <div
                  className={`flex items-center bg-white/75 backdrop-blur-xl border border-purple-300/40 border-b-[3px] border-purple-600/30 rounded-full shadow-[0_4px_16px_rgba(139,92,246,0.1),inset_0_1.5px_1.5px_rgba(255,255,255,0.6)] px-4 py-1.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isSearching
                      ? "w-[calc(100vw-40px)] sm:w-[300px] md:w-[380px] lg:w-[450px] opacity-100 scale-100"
                      : "w-0 opacity-0 scale-95 pointer-events-none overflow-hidden border-none shadow-none py-0 px-0"
                  }`}
                >
                  <svg className="w-5 h-5 text-purple-600 shrink-0 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    id="interactive-search-input"
                    type="text"
                    placeholder="Search essentials, tech, gear..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setFocusedIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-xs sm:text-sm font-semibold text-zinc-950 placeholder-zinc-400 focus:outline-none py-1"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-zinc-400 hover:text-zinc-600 p-1 mr-1 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsSearching(false);
                      setSearchQuery("");
                    }}
                    className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-900 rounded-full p-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Standard Search Trigger and Cart Buttons */}
                <div
                  className={`hidden md:flex items-center gap-4 lg:gap-5 transition-all duration-300 ${
                    isSearching 
                      ? "opacity-0 scale-95 pointer-events-none w-0 overflow-hidden" 
                      : "opacity-100 scale-100"
                  }`}
                >
                  {/* Search Trigger Button */}
                  <button
                    id="search-bar-toggle-button"
                    onClick={() => setIsSearching(true)}
                    className="bg-purple-600/10 backdrop-blur-md text-purple-950 border border-purple-300/30 border-b-[3px] border-purple-600/40 p-3 lg:p-3.5 rounded-full hover:bg-purple-600/20 hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-[1px] transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0 shadow-[0_4px_12px_rgba(139,92,246,0.15),inset_0_1.5px_1.5px_rgba(255,255,255,0.4)]"
                  >
                    <svg className="w-5 h-5 lg:w-5.5 lg:h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>

                  {/* Cart Button Container with Hover Dropdown */}
                  <div className="relative group/cart">
                    <button 
                      onClick={() => setIsCartOpen(true)}
                      className="relative border-0 bg-transparent text-zinc-950 hover:text-zinc-700 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0 p-1"
                    >
                      <svg className="w-7 h-7 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {/* Quantity Badge */}
                      {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
                        <span className={`absolute -top-1.5 -right-1.5 bg-purple-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-md border border-white transition-all duration-300 ${
                          cartAnimate ? "animate-bounce scale-110 shadow-[0_0_12px_rgba(139,92,246,0.5)]" : ""
                        }`}>
                          {cart.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                      )}
                    </button>

                    {/* Desktop Hover Cart Preview Dropdown */}
                    <div className="absolute top-[35px] right-0 w-[280px] sm:w-[320px] bg-white/95 backdrop-blur-xl border border-zinc-200/50 shadow-2xl rounded-2xl overflow-hidden opacity-0 translate-y-2 pointer-events-none group-hover/cart:opacity-100 group-hover/cart:translate-y-0 group-hover/cart:pointer-events-auto transition-all duration-300 z-50 text-left origin-top-right p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                        <h4 className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
                          Cart Preview
                        </h4>
                        <span className="text-[10px] font-bold text-purple-600">
                          {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                        </span>
                      </div>

                      {cart.length === 0 ? (
                        <div className="py-6 flex flex-col items-center justify-center gap-2 text-zinc-400">
                          <svg className="w-8 h-8 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <span className="text-xs font-semibold select-none">Your cart is empty</span>
                        </div>
                      ) : (
                        <>
                          {/* Items List (max 3 items) */}
                          <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                            {cart.slice(0, 3).map((item, idx) => (
                              <div key={`${item.product.id}-${item.color}`} className="flex gap-2.5 items-center">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-50 border border-zinc-100 flex-shrink-0 flex items-center justify-center p-0.5">
                                  <Image 
                                    src={item.product.images && item.product.images.length > 0 ? item.product.images[0] : `/products/${item.product.id}.webp`}
                                    alt={item.product.name}
                                    width={40}
                                    height={40}
                                    style={{ objectFit: "contain" }}
                                    loading="eager"
                                  />
                                </div>
                                <div className="flex-grow min-w-0">
                                  <h5 className="text-[11px] font-bold text-zinc-950 truncate">
                                    {item.product.name}
                                  </h5>
                                  <p className="text-[9px] text-zinc-500 font-semibold truncate mt-0.5">
                                    Color: {item.color} • Qty: {item.quantity}
                                  </p>
                                </div>
                                <div className="text-[11px] font-bold text-purple-950 flex-shrink-0">
                                  {item.product.price}
                                </div>
                              </div>
                            ))}
                            {cart.length > 3 && (
                              <p className="text-[9px] text-zinc-400 font-semibold text-center italic mt-1">
                                + {cart.length - 3} more items in cart
                              </p>
                            )}
                          </div>

                          {/* Divider */}
                          <div className="border-t border-zinc-100 pt-2 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                                Subtotal
                              </span>
                              <span className="text-xs font-black text-purple-950 font-outfit">
                                Rs. {cartSubtotal.toLocaleString()}
                              </span>
                            </div>
                            <button
                              onClick={() => setIsCartOpen(true)}
                              className="w-full bg-zinc-950 text-white text-[10px] font-bold tracking-widest py-2 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer border-0 mt-1 shadow-md shadow-zinc-950/10"
                            >
                              VIEW FULL CART
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Search Dropdown / Autocomplete Results */}
                <div
                  className={`absolute top-[55px] right-0 w-[calc(100vw-40px)] sm:w-[350px] md:w-[420px] lg:w-[480px] bg-white/95 backdrop-blur-xl border border-zinc-200/50 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 z-50 text-left origin-top-right flex flex-col max-h-[450px] ${
                    isSearching
                      ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                      : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
                  }`}
                >
                  {/* Suggestions State (Empty query) */}
                  {!searchQuery.trim() && (
                    <div className="p-5 flex flex-col gap-4">
                      {recentSearches.length > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-2.5">
                            <h4 className="text-[10px] font-bold tracking-[0.25em] text-zinc-400 uppercase">
                              Recent Searches
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRecentSearches([]);
                                try {
                                  localStorage.removeItem("pluggedin_recent_searches");
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="text-[9px] font-bold text-zinc-400 hover:text-purple-650 transition-colors uppercase tracking-widest cursor-pointer border-0 bg-transparent"
                            >
                              Clear
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {recentSearches.map((term) => (
                              <button
                                key={term}
                                onClick={() => {
                                  setSearchQuery(term);
                                  const input = document.getElementById("interactive-search-input") as HTMLInputElement;
                                  if (input) input.focus();
                                }}
                                className="text-[11px] sm:text-xs font-semibold px-3 py-1.5 bg-purple-500/[0.03] border border-purple-200/30 text-zinc-700 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1.5 hover:bg-purple-50 hover:text-purple-700"
                              >
                                <svg className="w-3 h-3 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {term}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={recentSearches.length > 0 ? "border-t border-zinc-100 pt-4" : ""}>
                        <h4 className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase mb-2.5">
                          Trending Searches
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {["Headphones", "Mechanical Keyboard", "Wireless Charger", "Tech Sleeve", "Laptop Lift"].map((term) => (
                            <button
                              key={term}
                              onClick={() => {
                                setSearchQuery(term);
                                const input = document.getElementById("interactive-search-input") as HTMLInputElement;
                                if (input) input.focus();
                              }}
                              className="text-[11px] sm:text-xs font-semibold px-3 py-1.5 bg-zinc-100 hover:bg-purple-50 hover:text-purple-700 text-zinc-700 rounded-full transition-all duration-200 cursor-pointer border border-zinc-200/40"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-zinc-100 pt-4">
                        <h4 className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase mb-2.5">
                          Browse Categories
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: "Home and kitchen", color: "text-pink-700 bg-pink-50 border-pink-200/30" },
                            { name: "Tech & Gadgets", color: "text-blue-700 bg-blue-50 border-blue-200/30" },
                            { name: "Mobile & Auto", color: "text-emerald-700 bg-emerald-50 border-emerald-200/30" },
                            { name: "Best sellers", color: "text-purple-700 bg-purple-50 border-purple-200/30" },
                            { name: "Trending", color: "text-amber-700 bg-amber-50 border-amber-200/30" }
                          ].map((cat) => (
                            <button
                              key={cat.name}
                              onClick={() => {
                                setSearchQuery(cat.name);
                                const input = document.getElementById("interactive-search-input") as HTMLInputElement;
                                if (input) input.focus();
                              }}
                              className={`text-[11px] sm:text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${cat.color} hover:brightness-95`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Matches State (Typing query) */}
                  {searchQuery.trim() && (
                    <>
                      <div className="p-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                        <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
                          {isSearchingDb ? "Searching..." : `Search Results (${searchResults.length})`}
                        </span>
                        {!isSearchingDb && (
                          <span className="text-[9px] text-zinc-400 hidden sm:inline-block">
                            Use ↑↓ to navigate • Enter to view
                          </span>
                        )}
                      </div>

                      <div className="overflow-y-auto flex-1 max-h-[350px] divide-y divide-zinc-100/50">
                        {isSearchingDb ? (
                          <div className="py-12 flex flex-col items-center justify-center gap-3">
                            {/* Beautiful Glassmorphic Loader */}
                            <div className="relative w-8 h-8">
                              <div className="absolute inset-0 rounded-full border-2 border-purple-500/10"></div>
                              <div className="absolute inset-0 rounded-full border-2 border-t-purple-600 animate-spin"></div>
                            </div>
                            <span className="text-[10px] font-bold tracking-widest text-zinc-450 uppercase animate-pulse">
                              Searching database...
                            </span>
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((product, index) => {
                            const isFocused = focusedIndex === index;
                            
                            // Category colors setup
                            const colorMap: Record<string, string> = {
                              purple: "bg-purple-100 text-purple-600",
                              amber: "bg-amber-100 text-amber-600",
                              blue: "bg-blue-100 text-blue-600",
                              emerald: "bg-emerald-100 text-emerald-600",
                              pink: "bg-pink-100 text-pink-600",
                              slate: "bg-slate-100 text-slate-600",
                            };

                            return (
                              <button
                                key={product.id}
                                onClick={() => handleSelectProduct(product)}
                                onMouseEnter={() => setFocusedIndex(index)}
                                className={`w-full flex items-start p-3 text-left transition-all duration-200 outline-none ${
                                  isFocused 
                                    ? "bg-purple-50/80 border-l-[3.5px] border-purple-600 pl-2" 
                                    : "hover:bg-zinc-50/60 border-l-[3.5px] border-transparent"
                                }`}
                              >
                                <div className={`p-2 rounded-xl shrink-0 mr-3 ${colorMap[product.color] || "bg-zinc-100"}`}>
                                  {product.icon}
                                </div>
                                <div className="flex-grow min-w-0 pr-2">
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <h5 className="text-xs sm:text-sm font-bold text-zinc-950 truncate">
                                      {highlightMatch(product.name, searchQuery)}
                                    </h5>
                                    <span className="text-xs font-extrabold text-purple-950 shrink-0 font-syne">
                                      {product.price}
                                    </span>
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-zinc-500 line-clamp-1 leading-normal font-medium">
                                    {highlightMatch(product.description ? product.description.replace(/<[^>]*>/g, '') : '', searchQuery)}
                                  </p>
                                  <span className="inline-block text-[8px] font-extrabold tracking-wider text-zinc-400 uppercase mt-1">
                                    {product.category}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                            <div className="p-3 bg-zinc-50 rounded-full text-zinc-400 mb-3 border border-zinc-200/20">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h5 className="text-xs sm:text-sm font-bold text-zinc-700 mb-1">
                              No creator essentials match
                            </h5>
                            <p className="text-[10px] sm:text-xs text-zinc-400 max-w-[240px] leading-relaxed">
                              Try searching for something else like &ldquo;headphones&rdquo;, &ldquo;keyboard&rdquo;, or &ldquo;charger&rdquo;.
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

          </header>

          {/* Hero Section Content centered */}
          <div className="flex-grow flex flex-col justify-center items-center text-center px-6 lg:px-16 py-4 pointer-events-auto shrink-0">
            <div className="max-w-md lg:max-w-lg flex flex-col items-center justify-center">
              <span
                className={`text-[9px] lg:text-xs font-bold tracking-[0.3em] text-zinc-600 mb-2 lg:mb-3 transition-all duration-[800ms] delay-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isLoading ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
                }`}
              >
                PLUGGEDIN // ESSENTIALS 2026
              </span>
              <h1
                className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 font-syne leading-[1.1] mb-4 lg:mb-6 transition-all duration-[1000ms] delay-[750ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isLoading ? "opacity-0 translate-y-6" : "opacity-100 translate-y-0"
                }`}
              >
                TECH & STYLE<br />
                <span className="text-zinc-600 font-medium">IN PERFECT SYNC.</span>
              </h1>
              <p
                className={`text-xs lg:text-sm text-zinc-700 leading-relaxed mb-6 lg:mb-8 font-medium transition-all duration-[1000ms] delay-[850ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isLoading ? "opacity-0 translate-y-6" : "opacity-100 translate-y-0"
                }`}
              >
                A curated fusion of premium personal electronics, smart devices, and elevated lifestyle accessories built for the modern creator.
              </p>
              <div
                className={`flex items-center justify-center gap-4 transition-all duration-[1000ms] delay-[950ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isLoading ? "opacity-0 translate-y-6 scale-95" : "opacity-100 translate-y-0 scale-100"
                }`}
              >
                <button className="bg-zinc-950 text-white text-[10px] lg:text-xs font-bold tracking-widest px-6 lg:px-8 py-3 lg:py-3.5 rounded-full hover:bg-zinc-800 transition-all duration-300 shadow-lg shadow-zinc-950/20 hover:scale-105 active:scale-95 cursor-pointer">
                  SHOP ELECTRONICS
                </button>
                <button className="bg-white/60 backdrop-blur-md border border-white text-zinc-900 text-[10px] lg:text-xs font-bold tracking-widest px-6 lg:px-8 py-3 lg:py-3.5 rounded-full hover:bg-white hover:border-zinc-300 transition-all duration-300 shadow-sm hover:scale-105 active:scale-95 cursor-pointer">
                  EXPLORE LIFESTYLE
                </button>
              </div>
            </div>
          </div>

          </div>

          {/* Solid White Content Wrapper (covers video on scroll) */}
          <div className="relative z-20 bg-white w-full px-6 lg:px-8 pt-12 pb-16 lg:pb-20 rounded-t-[2.5rem] md:rounded-t-[3.5rem] border-t border-purple-100/50 shadow-[0_-25px_50px_rgba(139,92,246,0.06)] shrink-0">
            {/* Section 1: Infinite Carousel */}
            <div className="w-full py-8 border-y border-purple-100/30 bg-purple-50/5 relative overflow-hidden rounded-2xl">
              {/* Ambient Background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent pointer-events-none" />
              
              <div className="hover-pause flex flex-col gap-4">
                {/* Marquee Row 1 */}
                <div className="flex overflow-hidden select-none gap-4">
                  <div className="marquee-scroll flex gap-8 whitespace-nowrap text-xs md:text-sm font-bold tracking-widest text-zinc-900 font-syne uppercase">
                    {Array(4).fill([
                      "Smart Design", "Studio Gear", "Elevated Daily", "Premium Audio", 
                      "Ultra Durable", "Minimalist Essentials", "Pluggedin Labs", "High Performance"
                    ]).flat().map((item, idx) => (
                      <span key={idx} className="flex items-center gap-4">
                        <span>{item}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_#8b5cf6]" />
                      </span>
                    ))}
                  </div>
                </div>

                {/* Marquee Row 2 */}
                <div className="flex overflow-hidden select-none gap-4">
                  <div className="marquee-scroll-reverse flex gap-8 whitespace-nowrap text-xs md:text-sm font-bold tracking-widest text-purple-600 font-syne uppercase">
                    {Array(4).fill([
                      "Tech & Style", "Noise Cancelling", "Fast Wireless Charger", "Tactile Switches",
                      "Water Resistant", "Ambient LED", "Carbon Fiber Lift", "Creators Choice"
                    ]).flat().map((item, idx) => (
                      <span key={idx} className="flex items-center gap-4">
                        <span>{item}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Bento Grid Categories */}
            <div className="hidden md:flex w-full py-16 px-2 sm:px-4 flex-col gap-8 content-visibility-lazy">
              <div className="flex flex-col items-center text-center max-w-xl mx-auto mb-4">
                <span className="text-[10px] font-bold tracking-[0.25em] text-purple-600 uppercase mb-2">
                  Curated Collections
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-outfit tracking-tight">
                  SHOP BY CATEGORY
                </h2>
                <div className="w-12 h-[3px] bg-purple-500 mt-3 rounded-full" />
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mx-auto">
                {/* Card 1: Home and kitchen (span-2) */}
                <div 
                  onClick={() => router.push("/shop?category=Home and kitchen")}
                  className="md:col-span-2 group relative h-[350px] rounded-3xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.08)] border border-zinc-200/40 bg-zinc-50 cursor-pointer flex flex-col justify-between p-6 md:p-8"
                >
                  {/* Background Image */}
                  <div className="absolute inset-0 z-0">
                    <Image 
                      src="/categories/home_kitchen.webp?v=3" 
                      alt="Home and kitchen" 
                      fill
                      sizes="(max-width: 768px) 100vw, 66vw"
                      style={{ objectFit: "cover" }}
                      className="transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      loading="eager"
                      unoptimized
                      />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-95" />
                  </div>

                  {/* Content Overlay */}
                  <div className="relative z-10 flex flex-col justify-between h-full w-full">
                    <div className="flex justify-end w-full">
                      <span className="text-white/60 text-xs font-medium">EXPLORE →</span>
                    </div>
                    
                    <div className="max-w-md text-left">
                      <h3 className="text-xl md:text-2xl font-extrabold text-white font-outfit">
                        Home & Kitchen Essentials
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-3 relative z-20 pointer-events-auto">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/shop?category=Home and kitchen&tag=lightbar");
                          }}
                          className="text-[9px] font-bold tracking-widest text-pink-300 bg-pink-955/40 hover:bg-pink-900/50 backdrop-blur-md px-3 py-1 rounded-full border border-pink-500/30 uppercase transition-all"
                        >
                          #lightbar
                        </span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/shop?category=Home and kitchen&tag=speaker");
                          }}
                          className="text-[9px] font-bold tracking-widest text-pink-300 bg-pink-955/40 hover:bg-pink-900/50 backdrop-blur-md px-3 py-1 rounded-full border border-pink-500/30 uppercase transition-all"
                        >
                          #speaker
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Tech & Gadgets (span-1) */}
                <div 
                  onClick={() => router.push("/shop?category=Tech & Gadgets")}
                  className="md:col-span-1 group relative h-[350px] rounded-3xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.08)] border border-zinc-200/40 bg-zinc-50 cursor-pointer flex flex-col justify-between p-6"
                >
                  {/* Background Image */}
                  <div className="absolute inset-0 z-0">
                    <Image 
                      src="/categories/tech_gadgets.webp?v=2" 
                      alt="Tech & Gadgets" 
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: "cover" }}
                      className="transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      loading="eager"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-95" />
                  </div>

                  {/* Content Overlay */}
                  <div className="relative z-10 flex flex-col justify-between h-full w-full">
                    <div className="flex justify-end w-full">
                      <span className="text-white/60 text-xs font-medium">EXPLORE →</span>
                    </div>
                    
                    <div className="text-left">
                      <h3 className="text-xl font-extrabold text-white font-outfit">
                        Workspace Tech & Gadgets
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-3 relative z-20 pointer-events-auto">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/shop?category=Tech & Gadgets&tag=keyboard");
                          }}
                          className="text-[9px] font-bold tracking-widest text-blue-300 bg-blue-955/40 hover:bg-blue-900/50 backdrop-blur-md px-3 py-1 rounded-full border border-blue-500/30 uppercase transition-all"
                        >
                          #keyboard
                        </span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/shop?category=Tech & Gadgets&tag=mouse");
                          }}
                          className="text-[9px] font-bold tracking-widest text-blue-300 bg-blue-955/40 hover:bg-blue-900/50 backdrop-blur-md px-3 py-1 rounded-full border border-blue-500/30 uppercase transition-all"
                        >
                          #mouse
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Trending (span-1) */}
                <div 
                  onClick={() => router.push("/shop?category=Trending")}
                  className="md:col-span-1 group relative h-[350px] rounded-3xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.08)] border border-zinc-200/40 bg-zinc-50 cursor-pointer flex flex-col justify-between p-6"
                >
                  {/* Background Image */}
                  <div className="absolute inset-0 z-0">
                    <Image 
                      src="/categories/trending.webp?v=2" 
                      alt="Trending" 
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: "cover" }}
                      className="transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      loading="eager"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-95" />
                  </div>

                  {/* Content Overlay */}
                  <div className="relative z-10 flex flex-col justify-between h-full w-full">
                    <div className="flex justify-end w-full">
                      <span className="text-white/60 text-xs font-medium">EXPLORE →</span>
                    </div>
                    
                    <div className="text-left">
                      <h3 className="text-xl font-extrabold text-white font-outfit">
                        Trending Creator Essentials
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-3 relative z-20 pointer-events-auto">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/shop?category=Trending&tag=mic");
                          }}
                          className="text-[9px] font-bold tracking-widest text-amber-300 bg-amber-955/40 hover:bg-amber-900/50 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/30 uppercase transition-all"
                        >
                          #mic
                        </span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/shop?category=Trending&tag=webcam");
                          }}
                          className="text-[9px] font-bold tracking-widest text-amber-300 bg-amber-955/40 hover:bg-amber-900/50 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/30 uppercase transition-all"
                        >
                          #webcam
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Mobile & Auto (span-1) */}
                <div 
                  onClick={() => router.push("/shop?category=Mobile & Auto")}
                  className="md:col-span-1 group relative h-[350px] rounded-3xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.08)] border border-zinc-200/40 bg-zinc-50 cursor-pointer flex flex-col justify-between p-6"
                >
                  {/* Background Image */}
                  <div className="absolute inset-0 z-0">
                    <Image 
                      src="/categories/mobile_auto.webp?v=2" 
                      alt="Mobile & Auto" 
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: "cover" }}
                      className="transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      loading="eager"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-95" />
                  </div>

                  {/* Content Overlay */}
                  <div className="relative z-10 flex flex-col justify-between h-full w-full">
                    <div className="flex justify-end w-full">
                      <span className="text-white/60 text-xs font-medium">EXPLORE →</span>
                    </div>
                    
                    <div className="text-left">
                      <h3 className="text-xl font-extrabold text-white font-outfit">
                        Mobile & Auto Gear
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-3 relative z-20 pointer-events-auto">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/shop?category=Mobile & Auto&tag=backpack");
                          }}
                          className="text-[9px] font-bold tracking-widest text-emerald-300 bg-emerald-955/40 hover:bg-emerald-900/50 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30 uppercase transition-all"
                        >
                          #backpack
                        </span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/shop?category=Mobile & Auto&tag=stand");
                          }}
                          className="text-[9px] font-bold tracking-widest text-emerald-300 bg-emerald-955/40 hover:bg-emerald-900/50 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30 uppercase transition-all"
                        >
                          #stand
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 5: Best sellers (span-1) */}
                <div 
                  onClick={() => router.push("/shop?category=Best sellers")}
                  className="md:col-span-1 group relative h-[350px] rounded-3xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.08)] border border-zinc-200/40 bg-zinc-50 cursor-pointer flex flex-col justify-between p-6"
                >
                  {/* Background Image */}
                  <div className="absolute inset-0 z-0">
                    <Image 
                      src="/categories/best_sellers.webp?v=2" 
                      alt="Best sellers" 
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: "cover" }}
                      className="transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      loading="eager"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-95" />
                  </div>

                  {/* Content Overlay */}
                  <div className="relative z-10 flex flex-col justify-between h-full w-full">
                    <div className="flex justify-end w-full">
                      <span className="text-white/60 text-xs font-medium">EXPLORE →</span>
                    </div>
                    
                    <div className="text-left">
                      <h3 className="text-xl font-extrabold text-white font-outfit">
                        Best Sellers Hub
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-3 relative z-20 pointer-events-auto">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/shop?category=Best sellers&tag=headphones");
                          }}
                          className="text-[9px] font-bold tracking-widest text-purple-300 bg-purple-955/40 hover:bg-purple-900/50 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/30 uppercase transition-all"
                        >
                          #headphones
                        </span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/shop?category=Best sellers&tag=keyboard");
                          }}
                          className="text-[9px] font-bold tracking-widest text-purple-300 bg-purple-955/40 hover:bg-purple-900/50 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/30 uppercase transition-all"
                        >
                          #keyboard
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Full-Width Cinematic Video Banner */}
            <div className="relative z-20 w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] -mx-6 lg:-mx-8 aspect-video max-h-[380px] md:max-h-[600px] mt-16 overflow-hidden border-t border-purple-100/30 group cursor-pointer content-visibility-lazy">
              {/* Commercial video banner */}
              <LazyVideo 
                className="w-full h-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-102"
                autoPlay
                loop
                muted
                playsInline
                src="/Create_commercial_for_web_store_202606112343.mp4"
              />
              
              {/* Premium Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />

              {/* Content Overlay */}
              <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 md:p-12">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold tracking-[0.3em] text-purple-300 bg-purple-950/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-purple-500/20">
                    PLUGGEDIN // FEATURED VIDEO
                  </span>
                </div>

                <div className="max-w-xl text-left">
                  <h3 className="text-2xl md:text-4xl font-extrabold text-white font-outfit tracking-tight leading-tight">
                    ELEVATED ESSENTIALS.<br />
                    BUILT FOR MODERN CREATORS.
                  </h3>
                </div>
              </div>
            </div>

            {/* Section 4: Trending Products (Full Width) */}
            <div className="relative z-20 w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] -mx-6 lg:-mx-8 bg-white border-t border-purple-100/30 pt-16 pb-8 px-6 lg:px-8 flex flex-col gap-8 content-visibility-lazy">
              <div className="flex flex-col items-start text-left w-full px-6 lg:px-8 mb-4">
                <span className="text-[10px] font-bold tracking-[0.25em] text-purple-600 uppercase mb-2">
                  Creator Essentials
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-outfit tracking-tight">
                  TRENDING PRODUCTS
                </h2>
                <div className="w-12 h-[3px] bg-purple-500 mt-2.5 rounded-full" />
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full px-6 lg:px-8">
                {trendingProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => router.push(`/product/${product.id}`)}
                    className="group bg-white border border-zinc-100/80 rounded-3xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.06)] hover:border-purple-200/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col cursor-pointer relative"
                  >
                    {/* Image Container with soft gradient background & elegant padding */}
                    <div className="relative aspect-[5/4] w-full overflow-hidden bg-gradient-to-br from-zinc-50/50 to-white/30 p-6 flex items-center justify-center border-b border-zinc-100/50">
                      <Image
                        src={(product.images && product.images.length > 0) ? product.images[0] : `/products/${product.id}.webp`}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        style={{ objectFit: "contain" }}
                        className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 !p-6"
                        loading="eager"
                      />
                      
                      {/* Floating Discount Badge */}
                      {product.discount && (
                        <div className="absolute top-3.5 left-3.5 z-10">
                          <span className="bg-red-500 text-white text-[8px] font-black tracking-widest px-2.5 py-1 rounded-lg shadow-md shadow-red-500/10 uppercase">
                            {product.discount}
                          </span>
                        </div>
                      )}

                      {/* Floating Add to Cart Button for Mobile */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const colors = getProductColors(product);
                          addToCart(product, 1, colors[0] || product.color);
                        }}
                        className="md:hidden absolute bottom-3 right-3 bg-purple-600 active:bg-purple-700 text-white p-2.5 rounded-full shadow-lg z-20 flex items-center justify-center border-0 active:scale-95 transition-all duration-150"
                        title="Add to Cart"
                      >
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>

                      {/* Floating Action Overlay: Slide-up Quick-Add Bar */}
                      <div className="absolute bottom-3.5 left-3.5 right-3.5 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10 flex gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/product/${product.id}`);
                          }}
                          className="flex-grow bg-white/95 backdrop-blur-md border border-zinc-200/50 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 text-zinc-900 text-[10px] font-extrabold tracking-widest py-2.5 rounded-xl shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          VIEW DETAILS
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const colors = getProductColors(product);
                            addToCart(product, 1, colors[0] || product.color);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white p-2.5 rounded-xl shadow-lg shadow-purple-600/10 transition-all duration-200 cursor-pointer border-0 flex items-center justify-center hover:scale-105 active:scale-95"
                          title="Add to Cart"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 32 32">
                            <g transform="translate(-156,-196)">
                              <path fillRule="evenodd" d="m 159,198.00586 c -0.55228,0 -1,0.44772 -1,1 0,0.55228 0.44772,1 1,1 h 1.18945 l 3.83203,18.20703 c 0.0979,0.46231 0.50597,0.79302 0.97852,0.79297 h 17 c 0.55228,0 1,-0.44772 1,-1 0,-0.55228 -0.44772,-1 -1,-1 h -16.18945 l -0.42188,-2 H 181 c 0.45916,1.8e-4 0.85946,-0.31232 0.9707,-0.75781 l 1.29492,-5.21485 C 184.90874,207.96028 186,206.10519 186,204.00586 c 0,-3.30186 -2.69814,-6 -6,-6 -2.60121,0 -4.8265,1.67494 -5.6543,4 h -11.69336 l -0.67382,-3.20508 C 161.88145,198.33756 161.47315,198.006 161,198.00586 Z m 21,2 c 2.22098,0 4,1.77902 4,4 0,2.22098 -1.77902,4 -4,4 -2.22098,0 -4,-1.77902 -4,-4 0,-2.22098 1.77902,-4 4,-4 z m -16.92578,4 H 174 c 0,3.30186 2.69814,6 6,6 0.33554,0 0.6635,-0.0305 0.98438,-0.084 l -0.76563,3.08398 H 165 c -0.01,0.002 -0.0196,0.004 -0.0293,0.006 z" />
                              <path fillRule="evenodd" d="m 169,220.00586 c -1.64501,0 -3,1.35499 -3,3 0,1.64501 1.35499,3 3,3 1.64501,0 3,-1.35499 3,-3 0,-1.64501 -1.35499,-3 -3,-3 z m 0,2 c 0.56413,0 1,0.43587 1,1 0,0.56413 -0.43587,1 -1,1 -0.56413,0 -1,-0.43587 -1,-1 0,-0.56413 0.43587,-1 1,-1 z" />
                              <path fillRule="evenodd" d="m 179,220.00586 c -1.64501,0 -3,1.35499 -3,3 0,1.64501 1.35499,3 3,3 1.64501,0 3,-1.35499 3,-3 0,-1.64501 -1.35499,-3 -3,-3 z m 0,2 c 0.56413,0 1,0.43587 1,1 0,0.56413 -0.43587,1 -1,1 -0.56413,0 -1,-0.43587 -1,-1 0,-0.56413 0.43587,-1 1,-1 z" />
                              <path fillRule="evenodd" d="m 180,201.00586 a 1,1 0 0 0 -1,1 v 1 h -1 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 1 v 1 a 1,1 0 0 0 1,1 1,1 0 0 0 1,-1 v -1 h 1 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 h -1 v -1 a 1,1 0 0 0 -1,-1 z" />
                            </g>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-5 flex flex-col gap-1 flex-grow text-left">
                      <span className="text-[8px] font-bold tracking-widest text-purple-600 uppercase">
                        {product.category}
                      </span>
                      <h4 className="text-xs sm:text-sm font-extrabold text-zinc-950 font-outfit group-hover:text-purple-700 transition-colors duration-200 truncate mt-1">
                        {product.name}
                      </h4>
                      
                      {/* Premium Pricing presentation */}
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-base sm:text-lg font-black text-zinc-950 font-outfit tracking-tight">
                          {product.price}
                        </span>
                        <span className="text-xs text-zinc-400 line-through font-bold">
                          {product.slashedPrice}
                        </span>
                      </div>

                      {/* Premium card divider footer */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-100/70">
                        <span className="text-[8px] font-bold text-emerald-600 tracking-wider uppercase flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          Free Shipping
                        </span>
                        <span className="text-[8px] font-bold text-zinc-400 tracking-wider uppercase">
                          In Stock
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4.5: Dual Video Banner (Full Width, No Gaps) */}
            <div className="relative z-20 w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] -mx-6 lg:-mx-8 bg-white border-t border-b border-purple-100/10 overflow-hidden content-visibility-lazy">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 w-full">
                <div className="relative aspect-video w-full overflow-hidden">
                  <LazyVideo 
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    src="/Wireless_noodle_maker_commercial_202606120110.mp4"
                  />
                  <div className="absolute inset-0 bg-purple-950/5 pointer-events-none" />
                </div>
                <div className="relative aspect-video w-full overflow-hidden">
                  <LazyVideo 
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    src="/Automatic_pet_feeder_commercial_202606120038.mp4"
                  />
                  <div className="absolute inset-0 bg-purple-950/5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Section 5: New In Products (Full Width) */}
            <div className="relative z-20 w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] -mx-6 lg:-mx-8 bg-white border-t border-purple-100/30 py-16 px-6 lg:px-8 flex flex-col gap-8 content-visibility-lazy">
              <div className="flex flex-col items-start text-left w-full px-6 lg:px-8 mb-4">
                <span className="text-[10px] font-bold tracking-[0.25em] text-purple-600 uppercase mb-2">
                  Latest Arrivals
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-outfit tracking-tight">
                  NEW IN
                </h2>
                <div className="w-12 h-[3px] bg-purple-500 mt-3 rounded-full" />
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 w-full px-6 lg:px-8">
                {newInProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => router.push(`/product/${product.id}`)}
                    className="group bg-white border border-zinc-100/80 rounded-3xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.06)] hover:border-purple-200/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col cursor-pointer relative"
                  >
                    {/* Image Container with soft gradient background & elegant padding */}
                    <div className="relative aspect-[5/4] w-full overflow-hidden bg-gradient-to-br from-zinc-50/50 to-white/30 p-6 flex items-center justify-center border-b border-zinc-100/50">
                      <Image
                        src={(product.images && product.images.length > 0) ? product.images[0] : `/products/${product.id}.webp`}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        style={{ objectFit: "contain" }}
                        className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 !p-6"
                        loading="eager"
                      />
                      
                      {/* Floating Discount Badge */}
                      {product.discount && (
                        <div className="absolute top-3.5 left-3.5 z-10">
                          <span className="bg-red-500 text-white text-[8px] font-black tracking-widest px-2.5 py-1 rounded-lg shadow-md shadow-red-500/10 uppercase">
                            {product.discount}
                          </span>
                        </div>
                      )}

                      {/* Floating Add to Cart Button for Mobile */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const colors = getProductColors(product);
                          addToCart(product, 1, colors[0] || product.color);
                        }}
                        className="md:hidden absolute bottom-3 right-3 bg-purple-600 active:bg-purple-700 text-white p-2.5 rounded-full shadow-lg z-20 flex items-center justify-center border-0 active:scale-95 transition-all duration-150"
                        title="Add to Cart"
                      >
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>

                      {/* Floating Action Overlay: Slide-up Quick-Add Bar */}
                      <div className="absolute bottom-3.5 left-3.5 right-3.5 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10 flex gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/product/${product.id}`);
                          }}
                          className="flex-grow bg-white/95 backdrop-blur-md border border-zinc-200/50 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 text-zinc-900 text-[10px] font-extrabold tracking-widest py-2.5 rounded-xl shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          VIEW DETAILS
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const colors = getProductColors(product);
                            addToCart(product, 1, colors[0] || product.color);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white p-2.5 rounded-xl shadow-lg shadow-purple-600/10 transition-all duration-200 cursor-pointer border-0 flex items-center justify-center hover:scale-105 active:scale-95"
                          title="Add to Cart"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 32 32">
                            <g transform="translate(-156,-196)">
                              <path fillRule="evenodd" d="m 159,198.00586 c -0.55228,0 -1,0.44772 -1,1 0,0.55228 0.44772,1 1,1 h 1.18945 l 3.83203,18.20703 c 0.0979,0.46231 0.50597,0.79302 0.97852,0.79297 h 17 c 0.55228,0 1,-0.44772 1,-1 0,-0.55228 -0.44772,-1 -1,-1 h -16.18945 l -0.42188,-2 H 181 c 0.45916,1.8e-4 0.85946,-0.31232 0.9707,-0.75781 l 1.29492,-5.21485 C 184.90874,207.96028 186,206.10519 186,204.00586 c 0,-3.30186 -2.69814,-6 -6,-6 -2.60121,0 -4.8265,1.67494 -5.6543,4 h -11.69336 l -0.67382,-3.20508 C 161.88145,198.33756 161.47315,198.006 161,198.00586 Z m 21,2 c 2.22098,0 4,1.77902 4,4 0,2.22098 -1.77902,4 -4,4 -2.22098,0 -4,-1.77902 -4,-4 0,-2.22098 1.77902,-4 4,-4 z m -16.92578,4 H 174 c 0,3.30186 2.69814,6 6,6 0.33554,0 0.6635,-0.0305 0.98438,-0.084 l -0.76563,3.08398 H 165 c -0.01,0.002 -0.0196,0.004 -0.0293,0.006 z" />
                              <path fillRule="evenodd" d="m 169,220.00586 c -1.64501,0 -3,1.35499 -3,3 0,1.64501 1.35499,3 3,3 1.64501,0 3,-1.35499 3,-3 0,-1.64501 -1.35499,-3 -3,-3 z m 0,2 c 0.56413,0 1,0.43587 1,1 0,0.56413 -0.43587,1 -1,1 -0.56413,0 -1,-0.43587 -1,-1 0,-0.56413 0.43587,-1 1,-1 z" />
                              <path fillRule="evenodd" d="m 179,220.00586 c -1.64501,0 -3,1.35499 -3,3 0,1.64501 1.35499,3 3,3 1.64501,0 3,-1.35499 3,-3 0,-1.64501 -1.35499,-3 -3,-3 z m 0,2 c 0.56413,0 1,0.43587 1,1 0,0.56413 -0.43587,1 -1,1 -0.56413,0 -1,-0.43587 -1,-1 0,-0.56413 0.43587,-1 1,-1 z" />
                              <path fillRule="evenodd" d="m 180,201.00586 a 1,1 0 0 0 -1,1 v 1 h -1 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 1 v 1 a 1,1 0 0 0 1,1 1,1 0 0 0 1,-1 v -1 h 1 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 h -1 v -1 a 1,1 0 0 0 -1,-1 z" />
                            </g>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-5 flex flex-col gap-1 flex-grow text-left">
                      <span className="text-[8px] font-bold tracking-widest text-purple-600 uppercase">
                        {product.category}
                      </span>
                      <h4 className="text-xs sm:text-sm font-extrabold text-zinc-950 font-outfit group-hover:text-purple-700 transition-colors duration-200 truncate mt-1">
                        {product.name}
                      </h4>
                      
                      {/* Premium Pricing presentation */}
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-base sm:text-lg font-black text-zinc-950 font-outfit tracking-tight">
                          {product.price}
                        </span>
                        <span className="text-xs text-zinc-400 line-through font-bold">
                          {product.slashedPrice}
                        </span>
                      </div>

                      {/* Premium card divider footer */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-100/70">
                        <span className="text-[8px] font-bold text-emerald-600 tracking-wider uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Free Shipping
                        </span>
                        <span className="text-[8px] font-bold text-zinc-400 tracking-wider uppercase">
                          In Stock
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5.5: Lifestyle Image Gallery Banner (Full Width, No Gaps) */}
            <div className="relative z-20 w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] -mx-6 lg:-mx-8 bg-white border-t border-b border-purple-100/10 overflow-hidden content-visibility-lazy">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0 w-full">
                {[1, 2, 3].map((num) => (
                  <div key={num} className="relative aspect-[4/3] w-full overflow-hidden group/banner">
                    <Image
                      src={`/banner_${num}.webp`}
                      alt={`Lifestyle gallery banner ${num}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: "cover" }}
                      className="transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/banner:scale-105"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-purple-950/5 opacity-0 group-hover/banner:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5.3: Why Choose Us (Full Width) */}
            <div className="relative z-20 w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] -mx-6 lg:-mx-8 bg-white border-t border-purple-100/30 py-16 px-6 lg:px-8 flex flex-col gap-8 content-visibility-lazy">
              <div className="flex flex-col items-start text-left w-full px-6 lg:px-8 mb-4">
                <span className="text-[10px] font-bold tracking-[0.25em] text-purple-600 uppercase mb-2">
                  06 // OUR PROMISE
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-outfit tracking-tight uppercase">
                  WHY PLUGGEDIN?
                </h2>
                <div className="w-12 h-[3px] bg-purple-500 mt-3 rounded-full" />
              </div>

              {/* 3 Promise Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full px-6 lg:px-8">
                {/* Promise Card 1 */}
                <div className="group bg-gradient-to-br from-zinc-50 to-white border border-zinc-150 rounded-3xl p-8 shadow-[0_8px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.06)] hover:border-purple-200/60 hover:-translate-y-1.5 transition-all duration-300 text-left flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-sm">
                    {/* Studio-Grade Quality Icon */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-950 font-outfit mb-2 group-hover:text-purple-700 transition-colors duration-200 uppercase">
                      Studio-Grade Quality
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed font-medium">
                      Every element is rigorously engineered for high-performance creators. We bridge technical precision with cinematic styling.
                    </p>
                  </div>
                </div>

                {/* Promise Card 2 */}
                <div className="group bg-gradient-to-br from-zinc-50 to-white border border-zinc-150 rounded-3xl p-8 shadow-[0_8px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.06)] hover:border-purple-200/60 hover:-translate-y-1.5 transition-all duration-300 text-left flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-sm">
                    {/* Free Global Shipping Icon */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 012.5 2.5v.15m-1.385.385l-.79-.79-2.122-2.122a2 2 0 00-2.828 0L9.122 13.5a2 2 0 01-2.828 0L4.793 12H3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-950 font-outfit mb-2 group-hover:text-purple-700 transition-colors duration-200 uppercase">
                      Free Global Shipping
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed font-medium">
                      Enjoy 24-hour dispatch and free delivery on all orders over Rs. 45,000, including our full premium setups.
                    </p>
                  </div>
                </div>

                {/* Promise Card 3 */}
                <div className="group bg-gradient-to-br from-zinc-50 to-white border border-zinc-150 rounded-3xl p-8 shadow-[0_8px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.06)] hover:border-purple-200/60 hover:-translate-y-1.5 transition-all duration-300 text-left flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-sm">
                    {/* 30-Day Workspace Trial Icon */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-950 font-outfit mb-2 group-hover:text-purple-700 transition-colors duration-200 uppercase">
                      30-Day Workspace Trial
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed font-medium">
                      Integrate our products into your workflow. If it doesn't elevate your productivity, return it risk-free within 30 days.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5.7: FAQ Accordion List (Full Width) */}
            <div id="faq" className="relative z-20 w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] -mx-6 lg:-mx-8 bg-white py-16 px-6 lg:px-8 flex flex-col gap-8 border-t border-b border-purple-100/30 content-visibility-lazy">
              <div className="flex flex-col items-start text-left w-full px-6 lg:px-8 mb-4">
                <span className="text-[10px] font-bold tracking-[0.25em] text-purple-600 uppercase mb-2">
                  07 // FAQ
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-outfit tracking-tight uppercase">
                  FREQUENTLY ASKED QUESTIONS
                </h2>
                <div className="w-12 h-[3px] bg-purple-500 mt-3 rounded-full" />
              </div>

              {/* FAQ Accordions Container */}
              <div className="w-full max-w-4xl mx-auto px-6 lg:px-8 flex flex-col gap-4">
                {[
                  {
                    q: "Do products come with a warranty?",
                    a: "Yes, all PluggedIn premium electronics and smart setup accessories are backed by our comprehensive 2-year warranty. It covers any manufacturing defects, hardware malfunctions, or hardware failures under normal workspace usage."
                  },
                  {
                    q: "How long does shipping take?",
                    a: "Delivery typically takes 3 to 5 business days depending on your region. All smart setup packages and orders over Rs. 45,000 benefit from free shipping and automatic 24-hour priority dispatch."
                  },
                  {
                    q: "Can I return items under the trial?",
                    a: "Absolutely. We stand behind our workspace designs. We offer a 30-day workspace trial during which you can test the gear in your own setup. If it doesn't elevate your productivity, return it in original packaging for a full refund."
                  },
                  {
                    q: "Do you ship internationally?",
                    a: "Yes, we ship islandwide. All local shipments are fully tracked and insured. Express shipping is free for all orders exceeding Rs. 45,000, or available for a flat rate of Rs. 500 on smaller items."
                  }
                ].map((item, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="border border-zinc-200/60 rounded-2xl overflow-hidden bg-zinc-50/50 hover:bg-zinc-50 hover:border-purple-200/60 transition-all duration-300"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full flex justify-between items-center p-5 text-left font-outfit font-extrabold text-xs sm:text-sm text-zinc-950 hover:text-purple-700 transition-colors duration-200 cursor-pointer border-0 bg-transparent outline-none"
                      >
                        <span className="uppercase tracking-wide">{item.q}</span>
                        <span className={`ml-4 w-7 h-7 rounded-full bg-white border border-zinc-200 flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm ${
                          isOpen ? "rotate-45 text-purple-600 border-purple-200" : "text-zinc-500"
                        }`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                          </svg>
                        </span>
                      </button>

                      {/* Expandable answer */}
                      <div
                        className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
                          isOpen ? "max-h-[300px] border-t border-zinc-200/20" : "max-h-0"
                        }`}
                      >
                        <div className="p-5 text-xs sm:text-sm text-zinc-500 leading-relaxed font-medium bg-white">
                          {item.a}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 6: Premium Floating 3D Footer */}
            <Footer />

          </div>

        </div>

      </main>
    </div>

    {/* Product Detail Modal */}
    {activeProduct && (
      <div 
        onClick={() => setActiveProduct(null)}
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="bg-white/95 border border-purple-200/80 shadow-2xl rounded-3xl p-6 md:p-8 max-w-sm sm:max-w-md w-full relative z-[101] text-center transform scale-100 transition-all duration-300 animate-in zoom-in-95"
        >
          {/* Close Button */}
          <button
            onClick={() => setActiveProduct(null)}
            className="absolute top-4 right-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-full p-2 transition-colors cursor-pointer border-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Category Icon */}
          <div className="flex justify-center mb-5">
            <div className="p-5 bg-purple-50 rounded-2xl text-purple-600 border border-purple-100 shadow-inner inline-flex">
              {activeProduct.icon}
            </div>
          </div>

          {/* Content */}
          <span className="text-[10px] font-bold tracking-[0.25em] text-purple-600 uppercase mb-1 block">
            {activeProduct.category}
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-zinc-950 font-outfit mb-2">
            {activeProduct.name}
          </h3>
          <div className="text-lg font-black text-purple-950 mb-4 font-outfit">
            {activeProduct.price}
          </div>
          <div 
            className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-6 font-medium rich-text-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(activeProduct.description) }}
          />

          {/* Color Variant Selector */}
          <div className="mb-5 flex flex-col items-center">
            <span className="text-[9px] font-extrabold tracking-widest text-zinc-400 uppercase mb-2">
              Color: <span className="text-zinc-800 font-bold">{activeColor}</span>
            </span>
            <div className="flex gap-2.5 justify-center">
              {getProductColors(activeProduct).map((col) => {
                const hex = getColorHex(col);
                const isWhite = hex === "#ffffff" || hex === "#f4f4f5" || hex === "#f8fafc" || hex === "#e4e4e7";
                return (
                  <button
                    key={col}
                    onClick={() => setActiveColor(col)}
                    className={`w-7 h-7 rounded-full border transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer ${
                      activeColor === col 
                        ? "border-purple-600 ring-2 ring-purple-500/20 ring-offset-1 scale-105" 
                        : "border-zinc-200"
                    }`}
                    style={{ backgroundColor: hex }}
                    title={col}
                  >
                    {activeColor === col && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isWhite ? 'bg-zinc-800' : 'bg-white'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="mb-6 flex flex-col items-center">
            <span className="text-[9px] font-extrabold tracking-widest text-zinc-400 uppercase mb-2">
              Quantity
            </span>
            <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200/60 rounded-full px-2 py-1 shadow-inner">
              <button
                onClick={() => setActiveQuantity((q) => Math.max(1, q - 1))}
                className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-800 rounded-full hover:bg-zinc-200/60 transition-colors border-0 bg-transparent text-sm font-bold cursor-pointer"
              >
                —
              </button>
              <span className="w-8 text-center text-xs font-bold text-zinc-800 select-none">
                {activeQuantity}
              </span>
              <button
                onClick={() => setActiveQuantity((q) => Math.min(10, q + 1))}
                className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-800 rounded-full hover:bg-zinc-200/60 transition-colors border-0 bg-transparent text-sm font-bold cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                addToCart(activeProduct, activeQuantity, activeColor);
                setActiveProduct(null);
              }}
              className="w-full bg-zinc-950 text-white text-xs font-bold tracking-widest py-3 rounded-full hover:bg-zinc-800 transition-all duration-300 shadow-md shadow-zinc-950/10 cursor-pointer border-0"
            >
              ADD TO CART
            </button>
            <button 
              onClick={() => {
                addToCart(activeProduct, activeQuantity, activeColor);
                setActiveProduct(null);
                setIsCartOpen(true);
              }}
              className="w-full bg-purple-600 text-white text-xs font-bold tracking-widest py-3 rounded-full hover:bg-purple-700 transition-all duration-300 shadow-md shadow-purple-600/15 cursor-pointer border-0"
            >
              BUY NOW
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Slide-over Cart Drawer */}
    {isCartOpen && (
      <div className="fixed inset-0 z-[120] overflow-hidden">
        {/* Backdrop Overlay */}
        <div 
          onClick={() => setIsCartOpen(false)}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 animate-in fade-in cursor-pointer"
        />

        {/* Sliding Panel */}
        <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white flex flex-col shadow-2xl z-[121] transform animate-in slide-in-from-right duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
          
          {/* Drawer Header */}
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h2 className="text-sm font-extrabold text-zinc-950 font-outfit uppercase tracking-widest">
                Shopping Cart
              </h2>
              <span className="bg-purple-100 text-purple-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-outfit">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            
            <button
              onClick={() => setIsCartOpen(false)}
              className="bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-full p-2 transition-colors cursor-pointer border-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Body: Cart Items */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 scrollbar-thin">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-400 select-none">
                <div className="p-6 bg-purple-50 rounded-full text-purple-300 border border-purple-100/30 shadow-inner">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-sm font-extrabold text-zinc-950 uppercase tracking-widest font-outfit">Your cart is empty</h3>
                <p className="text-xs text-zinc-500 text-center max-w-[240px] leading-relaxed font-medium">
                  Looks like you haven't added any products to your setup yet.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-purple-600 text-white text-xs font-bold tracking-widest px-6 py-3 rounded-full hover:bg-purple-700 transition-all duration-300 mt-2 shadow-md shadow-purple-600/15 cursor-pointer border-0"
                >
                  START SHOPPING
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div 
                  key={`${item.product.id}-${item.color}`}
                  className="flex gap-4 items-center bg-white border border-zinc-200/50 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-zinc-100 flex-shrink-0 flex items-center justify-center p-1 relative">
                    <Image 
                      src={item.product.images && item.product.images.length > 0 ? item.product.images[0] : `/products/${item.product.id}.webp`} 
                      alt={item.product.name}
                      width={64}
                      height={64}
                      style={{ objectFit: "contain" }}
                      loading="eager"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-grow min-w-0 text-left">
                    <span className="text-[8px] font-bold tracking-widest text-purple-600 uppercase">
                      {item.product.category}
                    </span>
                    <h4 className="text-xs font-extrabold text-zinc-950 font-outfit truncate mt-0.5">
                      {item.product.name}
                    </h4>
                    <p className="text-[9px] text-zinc-500 font-bold mt-0.5">
                      Variant: <span className="text-zinc-700 font-extrabold">{item.color}</span>
                    </p>
                    
                    {/* Quantity Selector inside cart item */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center bg-zinc-50 border border-zinc-200/50 rounded-full px-1.5 py-0.5 shadow-inner">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.color, -1)}
                          className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-800 rounded-full hover:bg-zinc-200/50 transition-colors border-0 bg-transparent text-xs font-bold cursor-pointer"
                        >
                          —
                        </button>
                        <span className="w-6 text-center text-[10px] font-bold text-zinc-800 select-none">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.color, 1)}
                          className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-800 rounded-full hover:bg-zinc-200/50 transition-colors border-0 bg-transparent text-xs font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Price & Delete */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <div className="text-xs font-black text-purple-950 font-outfit">
                      Rs. {(parsePrice(item.product.price) * item.quantity).toLocaleString()}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id, item.color)}
                      className="text-zinc-400 hover:text-red-500 transition-colors bg-transparent border-0 cursor-pointer p-1 rounded-lg hover:bg-red-50"
                      title="Remove item"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span className="text-zinc-950 font-extrabold">Rs. {cartSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-550 font-semibold">
                  <span>Shipping</span>
                  <span className="text-emerald-600 font-extrabold text-[10px] tracking-wide">FREE</span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-550 font-semibold border-b border-zinc-200/50 pb-2">
                  <span>Estimated Taxes</span>
                  <span className="text-zinc-800 font-bold">Rs. 0</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-sm font-extrabold text-zinc-950 font-outfit uppercase tracking-widest">
                  <span>Total Amount</span>
                  <span className="text-purple-950 text-base font-black font-outfit">Rs. {cartSubtotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <Link
                  href="/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full bg-purple-600 text-white text-xs font-bold tracking-widest py-3.5 rounded-full hover:bg-purple-700 transition-all duration-300 shadow-md shadow-purple-600/15 cursor-pointer border-0 flex items-center justify-center gap-2 text-center"
                >
                  VIEW CART
                </Link>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full bg-transparent text-zinc-500 hover:text-zinc-800 text-[9px] font-bold tracking-widest py-2 rounded-full hover:bg-zinc-100 transition-colors border-0 cursor-pointer"
                >
                  CONTINUE SHOPPING
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Success Notification Toast */}
    {searchToast && (
      <div className="fixed bottom-6 right-6 bg-zinc-900/95 backdrop-blur-md text-white text-[10px] font-bold tracking-widest py-3 px-6 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
        <svg className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {searchToast.toUpperCase()}
      </div>
    )}
    </>
  );
}
