"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MOCK_PRODUCTS, getCategoryIcon, Product } from "../products";
import RichTextEditor from "../../components/RichTextEditor";
import {
  BANK_RECEIPT_DEADLINE_NOTICE,
  EMPTY_PAYMENT_SETTINGS,
  normalizePaymentSettings,
  type PaymentSettings,
} from "@/lib/payment-settings";
import {
  DEFAULT_DELIVERY_RATES,
  DELIVERY_SETTINGS_COLUMNS,
  calculateDeliveryFee,
  formatDeliveryFee,
  formatWeight,
  normalizeDeliveryRates,
} from "@/lib/delivery";
import { resolveBannerLink } from "@/lib/banner-link";
import {
  DISCOUNT_TYPE_LABELS,
  codeAvailabilityError,
  describeDiscount,
  normalizeCode,
  type DiscountCodeRow,
  type DiscountType,
} from "@/lib/pricing";

/** Discount form values as edited in Admin → Discounts. */
interface DiscountForm {
  code: string;
  description: string;
  discount_type: DiscountType;
  value: string;
  product_ids: string[];
  buy_qty: string;
  get_qty: string;
  min_subtotal: string;
  max_uses: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
}

const EMPTY_DISCOUNT_FORM: DiscountForm = {
  code: "",
  description: "",
  discount_type: "percent_order",
  value: "",
  product_ids: [],
  buy_qty: "1",
  get_qty: "1",
  min_subtotal: "",
  max_uses: "",
  starts_at: "",
  expires_at: "",
  is_active: true,
};

/** ISO timestamp -> value for <input type="datetime-local"> (local time) */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function generateDiscountCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return "PLUG-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

interface Collection {
  id: string;
  name: string;
  description: string;
  type: "manual" | "smart";
  rules: { tags: string[] };
  created_at?: string;
}

interface VisitLog {
  id: string;
  path: string;
  referrer: string;
  user_agent: string;
  ip?: string;
  country: string;
  created_at: string;
}

interface OrderItem {
  id: string;
  name: string;
  color: string;
  quantity: number;
  price: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  phone_number?: string;
  shipping_address: string;
  items: OrderItem[];
  total_amount: number;
  payment_method?: string;
  /** Bank transfer only. null/undefined = still awaiting the customer's bank slip. */
  payment_status?: "receipt_received" | "receipt_not_received" | null;
  payment_reviewed_at?: string | null;
  delivery_zone?: string | null;
  delivery_fee?: number | null;
  discount_code?: string | null;
  discount_amount?: number | null;
  status: "pending" | "fulfilled" | "shipped" | "delivered" | "cancelled";
  created_at: string;
  updated_at?: string;
}

interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  reason: "general_inquiries" | "product_inquiries" | "shipping_inquiries";
  message: string;
  created_at: string;
}

interface MarqueeOffer {
  id: string;
  text: string;
  row_number: number;
  created_at?: string;
}

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  tag: string;
  /** Desktop / tablet image (or .mp4) */
  image_url: string;
  /** Optional image for phones (< 768px). Falls back to image_url when empty. */
  mobile_image_url?: string;
  /** Optional: clicking anywhere on the banner opens this URL */
  link_url?: string;
  primary_cta_text: string;
  primary_cta_href: string;
  secondary_cta_text: string;
  secondary_cta_href: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Navigation Tabs state
  // "dashboard", "catalog", "add-product", "collections", "analytics", "orders", "bank-transfer", "delivery", "discounts", "contact-inquiries", "offer-section"
  const [activeTab, setActiveTab] = useState("dashboard");
  const [productsOpen, setProductsOpen] = useState(true);

  // Authentication State
  const [adminUser, setAdminUser] = useState<string>("");

  // Database States
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderView, setOrderView] = useState<"all" | "bank_transfer">("all");
  const [reviewingReceiptId, setReviewingReceiptId] = useState<string | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(EMPTY_PAYMENT_SETTINGS);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  // Delivery rates as editable strings (Admin → Delivery)
  const [deliveryRatesForm, setDeliveryRatesForm] = useState({
    base_fee: String(DEFAULT_DELIVERY_RATES.base_fee),
    base_weight_grams: String(DEFAULT_DELIVERY_RATES.base_weight_grams),
    extra_fee_per_kg: String(DEFAULT_DELIVERY_RATES.extra_fee_per_kg),
    free_delivery_enabled: DEFAULT_DELIVERY_RATES.free_delivery_enabled,
    free_delivery_min_subtotal: String(DEFAULT_DELIVERY_RATES.free_delivery_min_subtotal),
  });
  const [savingDeliveryRates, setSavingDeliveryRates] = useState(false);
  // Discount codes (Admin → Discounts)
  const [discountCodes, setDiscountCodes] = useState<DiscountCodeRow[]>([]);
  const [discountForm, setDiscountForm] = useState<DiscountForm>(EMPTY_DISCOUNT_FORM);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [contactInquiries, setContactInquiries] = useState<ContactInquiry[]>([]);
  const [activeInquiry, setActiveInquiry] = useState<ContactInquiry | null>(null);
  const [marqueeOffers, setMarqueeOffers] = useState<MarqueeOffer[]>([]);
  const [newOfferText, setNewOfferText] = useState("");
  const [newOfferRow, setNewOfferRow] = useState<number>(1);
  const [savingOffer, setSavingOffer] = useState(false);

  // Hero Banners State
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [bannerForm, setBannerForm] = useState<Partial<HeroBanner>>({
    title: "",
    subtitle: "",
    badge: "⚡ FAST ISLANDWIDE SHIPPING",
    tag: "FEATURED COLLECTION 2026",
    image_url: "",
    mobile_image_url: "",
    link_url: "",
    primary_cta_text: "SHOP CREATOR GEAR",
    primary_cta_href: "/shop",
    secondary_cta_text: "EXPLORE COLLECTION",
    secondary_cta_href: "/shop?collection=trending",
    sort_order: 1,
    is_active: true,
  });
  const [uploadingBannerImage, setUploadingBannerImage] = useState<"image_url" | "mobile_image_url" | null>(null);
  const [savingBanner, setSavingBanner] = useState(false);
  const [collectionProducts, setCollectionProducts] = useState<{ collection_id: string; product_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Add Product Form State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodMetaTitle, setProdMetaTitle] = useState("");
  const [prodWeight, setProdWeight] = useState("");
  const [prodCategory, setProdCategory] = useState("Home and kitchen");
  const [prodPrice, setProdPrice] = useState("");
  const [prodSlashedPrice, setProdSlashedPrice] = useState("");
  const [prodDescription, setProdDescription] = useState("");
  const [prodTags, setProdTags] = useState("");
  const [prodColors, setProdColors] = useState("");
  const [prodFeatures, setProdFeatures] = useState("");
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Collection Form & View State
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null);
  const [collName, setCollName] = useState("");
  const [collDescription, setCollDescription] = useState("");
  const [collType, setCollType] = useState<"manual" | "smart">("manual");
  const [collTags, setCollTags] = useState("");
  const [collSelectedProducts, setCollSelectedProducts] = useState<string[]>([]);
  const [quickAddProductId, setQuickAddProductId] = useState<string>("");

  // Load Admin session & data on mount
  useEffect(() => {
    const sessionStr = localStorage.getItem("pluggedin_admin_session");
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      setAdminUser(session.email || "admin@pluggedin.co");
    }

    async function loadData() {
      setLoading(true);
      try {
        if (supabase) {
          // 1. Fetch Products
          try {
            const { data: prodData, error: prodErr } = await supabase
              .from("products")
              .select("*")
              .order("created_at", { ascending: false });
            if (prodErr) throw prodErr;

            if (prodData && prodData.length > 0) {
              const mappedProds: Product[] = prodData.map((item) => ({
                id: item.id,
                name: item.name,
                category: item.category,
                price: typeof item.price === "number" ? `Rs. ${Math.round(item.price).toLocaleString()}` : item.price,
                slashedPrice: item.slashed_price ? `Rs. ${Math.round(item.slashed_price).toLocaleString()}` : "",
                discount: item.discount || "",
                description: item.description,
                color: item.color || "purple",
                colors: item.colors || [],
                icon: getCategoryIcon(item.category, item.id),
                images: item.images || [],
                tags: item.tags || [],
                features: item.features || [],
                metaTitle: item.meta_title || "",
                weightGrams: Number(item.weight_grams) || 0,
              }));
              setProducts(mappedProds);
            } else {
              setProducts(MOCK_PRODUCTS);
            }
          } catch (e) {
            console.error("Failed to load products:", e);
            setProducts(MOCK_PRODUCTS);
          }

          // 2. Fetch Collections
          try {
            const { data: collData, error: collErr } = await supabase
              .from("collections")
              .select("*")
              .order("created_at", { ascending: false });
            if (collErr) throw collErr;
            if (collData && collData.length > 0) {
              setCollections(collData);
            } else {
              throw new Error("Collections empty");
            }
          } catch (e) {
            console.error("Failed to load collections:", e);
            setCollections([
              {
                id: "audio-elite",
                name: "Audio Elite",
                description: "Broadcast quality mics, reference studio monitors, and comfort-focused ANC headphones.",
                type: "smart",
                rules: { tags: ["audio"] },
              },
              {
                id: "desk-accessories",
                name: "Desk Accessories",
                description: "Elevate your desk layout with premium work gear.",
                type: "smart",
                rules: { tags: ["gear"] },
              },
              {
                id: "creator-bundle",
                name: "Creator Essentials Bundle",
                description: "The ultimate starter pack for streaming and programming.",
                type: "manual",
                rules: { tags: [] },
              },
            ]);
          }

          // Fetch Collection-Products relationships
          try {
            const { data: cpData, error: cpErr } = await supabase
              .from("collection_products")
              .select("*");
            if (cpErr) throw cpErr;
            if (cpData && cpData.length > 0) {
              setCollectionProducts(cpData);
            } else {
              throw new Error("Collection-products empty");
            }
          } catch (e) {
            console.error("Failed to load collection_products:", e);
            setCollectionProducts([
              { collection_id: "creator-bundle", product_id: "keyboard" },
              { collection_id: "creator-bundle", product_id: "mic" }
            ]);
          }

          // 3. Fetch Analytics
          try {
            const { data: visitData, error: visitErr } = await supabase
              .from("analytics_visits")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(500);
            if (visitErr) throw visitErr;
            if (visitData && visitData.length > 0) {
              setVisits(visitData);
            } else {
              throw new Error("Visits empty");
            }
          } catch (e) {
            console.error("Failed to load analytics_visits:", e);
            setVisits([
              { id: "1", path: "/", referrer: "direct", user_agent: "Mozilla", country: "United States", created_at: new Date(Date.now() - 3600000).toISOString() },
              { id: "2", path: "/product/headphones", referrer: "google.com", user_agent: "Chrome", country: "United States", created_at: new Date(Date.now() - 7200000).toISOString() },
              { id: "3", path: "/product/keyboard", referrer: "instagram.com", user_agent: "Safari", country: "United Kingdom", created_at: new Date(Date.now() - 10000000).toISOString() },
              { id: "4", path: "/", referrer: "youtube.com", user_agent: "Firefox", country: "Canada", created_at: new Date(Date.now() - 15000000).toISOString() },
              { id: "5", path: "/product/charger", referrer: "direct", user_agent: "Chrome", country: "Germany", created_at: new Date(Date.now() - 18000000).toISOString() },
              { id: "6", path: "/product/mic", referrer: "twitter.com", user_agent: "Edge", country: "Australia", created_at: new Date(Date.now() - 25000000).toISOString() },
            ]);
          }

          // 4. Fetch Orders
          try {
            const { data: orderData, error: orderErr } = await supabase
              .from("orders")
              .select("*")
              .order("created_at", { ascending: false });
            if (orderErr) throw orderErr;
            if (orderData && orderData.length > 0) {
              setOrders(orderData);
            } else {
              throw new Error("Orders empty");
            }
          } catch (e) {
            console.error("Failed to load orders:", e);
            setOrders([
              {
                id: "ORD-20260612-921A",
                customer_name: "Sarah Jenkins",
                customer_email: "sarah.j@example.com",
                shipping_address: "1524 Pine Street, San Francisco, CA, 94109",
                items: [{ id: "headphones", name: "Pro Noise-Cancelling Headphones", color: "Space Purple", quantity: 1, price: "Rs. 90,000" }],
                total_amount: 90000.00,
                status: "pending",
                created_at: new Date(Date.now() - 14400000).toISOString()
              },
              {
                id: "ORD-20260611-304B",
                customer_name: "Alex Rivera",
                customer_email: "alex.rivera@example.com",
                shipping_address: "892 Broadway Apt 4B, New York, NY, 10003",
                items: [
                  { id: "keyboard", name: "Creations Mechanical Keyboard", color: "Onyx Black", quantity: 1, price: "Rs. 48,000" },
                  { id: "charger", name: "Smart Dual Wireless Charger", color: "Carbon Black", quantity: 1, price: "Rs. 27,000" }
                ],
                total_amount: 75000.00,
                status: "shipped",
                created_at: new Date(Date.now() - 86400000).toISOString()
              },
              {
                id: "ORD-20260610-855C",
                customer_name: "Evelyn Chen",
                customer_email: "evelyn.chen@gmail.com",
                shipping_address: "724 Olympic Blvd, Los Angeles, CA, 90015",
                items: [{ id: "backpack", name: "Urban Tech Backpack", color: "Slate Grey", quantity: 1, price: "Rs. 42,000" }],
                total_amount: 42000.00,
                status: "delivered",
                created_at: new Date(Date.now() - 172800000).toISOString()
              }
            ]);
          }

          // 5. Fetch Contact Inquiries
          try {
            const { data: contactData, error: contactErr } = await supabase
              .from("contact_inquiries")
              .select("*")
              .order("created_at", { ascending: false });
            if (contactErr) throw contactErr;
            if (contactData && contactData.length > 0) {
              setContactInquiries(contactData);
            } else {
              throw new Error("Contact inquiries empty");
            }
          } catch (e) {
            console.error("Failed to load contact_inquiries:", e);
            setContactInquiries([
              {
                id: "INQ-1",
                name: "Liam Johnson",
                email: "liam.johnson@example.com",
                reason: "general_inquiries",
                message: "Hello, I love your workspace aesthetic! Do you offer bulk discounts for corporate setup upgrades?",
                created_at: new Date(Date.now() - 86400000).toISOString(),
              },
              {
                id: "INQ-2",
                name: "Sophia Smith",
                email: "sophia.smith@example.com",
                reason: "product_inquiries",
                message: "Hi, is the mechanical keyboard compatible with macOS function keys out of the box?",
                created_at: new Date(Date.now() - 43200000).toISOString(),
              },
              {
                id: "INQ-3",
                name: "Jackson Davis",
                email: "jackson.davis@example.com",
                reason: "shipping_inquiries",
                message: "Hello, do you ship to international locations like Switzerland and Germany? If so, what is the ETA?",
                created_at: new Date(Date.now() - 7200000).toISOString(),
              }
            ]);
          }

          // 6. Fetch Marquee Offers
          try {
            const { data: offerData, error: offerErr } = await supabase
              .from("marquee_offers")
              .select("*")
              .order("created_at", { ascending: true });
            if (offerErr) throw offerErr;
            if (offerData && offerData.length > 0) {
              setMarqueeOffers(offerData);
            } else {
              throw new Error("Marquee offers empty");
            }
          } catch (e) {
            console.error("Failed to load marquee_offers:", e);
            setMarqueeOffers([
              { id: "MO-1", text: "Summer Sale: 20% Off All Audio Devices", row_number: 1 },
              { id: "MO-2", text: "Islandwide Express Delivery Available", row_number: 1 },
              { id: "MO-3", text: "Use Code CREATE20 for extra discounts", row_number: 1 },
              { id: "MO-4", text: "Limited stock on mechanical keyboards", row_number: 1 },
              { id: "MO-5", text: "Premium creator bundles now available", row_number: 1 },
              { id: "MO-6", text: "Elevate your desk setup with 15% off", row_number: 1 },
              { id: "MO-7", text: "Tactile switches special promotion active", row_number: 1 },
              { id: "MO-8", text: "Shop the high performance range", row_number: 1 },
              { id: "MO-9", text: "Exclusive subscriber discounts inside", row_number: 2 },
              { id: "MO-10", text: "Buy now and pay later with zero interest", row_number: 2 },
              { id: "MO-11", text: "Ambient LED lightbars: 30% discount", row_number: 2 },
              { id: "MO-12", text: "Carbon fiber monitor risers special offer", row_number: 2 },
              { id: "MO-13", text: "Upgrade to studio audio today", row_number: 2 },
              { id: "MO-14", text: "All desk accessories starting at Rs. 9,000", row_number: 2 },
              { id: "MO-15", text: "Smart wireless chargers best price", row_number: 2 },
              { id: "MO-16", text: "Water resistant travel cases on sale", row_number: 2 }
            ]);
          }

          // 7. Fetch Bank Transfer Payment Settings
          try {
            const { data: settingsData, error: settingsErr } = await supabase
              .from("payment_settings")
              .select("bank_name, account_name, account_number, branch, payment_note")
              .eq("id", 1)
              .maybeSingle();
            if (settingsErr) throw settingsErr;
            setPaymentSettings(normalizePaymentSettings(settingsData));
          } catch (e) {
            console.error("Failed to load payment_settings:", e);
          }

          // 8. Fetch Delivery Rates
          try {
            const { data: ratesData, error: ratesErr } = await supabase
              .from("delivery_settings")
              .select(DELIVERY_SETTINGS_COLUMNS)
              .eq("id", 1)
              .maybeSingle();
            if (ratesErr) throw ratesErr;
            const rates = normalizeDeliveryRates(ratesData);
            setDeliveryRatesForm({
              base_fee: String(rates.base_fee),
              base_weight_grams: String(rates.base_weight_grams),
              extra_fee_per_kg: String(rates.extra_fee_per_kg),
              free_delivery_enabled: rates.free_delivery_enabled,
              free_delivery_min_subtotal: String(rates.free_delivery_min_subtotal),
            });
          } catch (e) {
            console.error("Failed to load delivery_settings:", e);
          }

          // 8b. Fetch Discount Codes
          try {
            const { data: codeData, error: codeErr } = await supabase
              .from("discount_codes")
              .select("*")
              .order("created_at", { ascending: false });
            if (codeErr) throw codeErr;
            setDiscountCodes((codeData || []) as DiscountCodeRow[]);
          } catch (e) {
            console.error("Failed to load discount_codes:", e);
          }

          // 9. Fetch Hero Banners
          try {
            const { data: bannerData, error: bannerErr } = await supabase
              .from("hero_banners")
              .select("*")
              .order("sort_order", { ascending: true });
            if (bannerErr) throw bannerErr;
            if (bannerData && bannerData.length > 0) {
              setHeroBanners(bannerData);
            } else {
              throw new Error("Hero banners empty");
            }
          } catch (e) {
            console.error("Failed to load hero_banners:", e);
            setHeroBanners([
              {
                id: "HB-1",
                title: "ELEVATE YOUR CREATIVE SETUP",
                subtitle: "A curated collection of space-saving workspace essentials, tactile mechanical keyboards, smart desktop chargers & studio gear built for creator performance.",
                badge: "⚡ FAST ISLANDWIDE SHIPPING",
                tag: "FEATURED COLLECTION 2026",
                image_url: "/posters/hero.webp",
                primary_cta_text: "SHOP CREATOR GEAR",
                primary_cta_href: "/shop",
                secondary_cta_text: "EXPLORE TRENDING",
                secondary_cta_href: "/shop?collection=trending",
                sort_order: 1,
                is_active: true,
              },
              {
                id: "HB-2",
                title: "CRAFTSMANSHIP REDEFINED",
                subtitle: "Ultra-responsive tactile switches, custom acoustic damping, and studio-grade audio components engineered for seamless everyday speed.",
                badge: "🛡️ 1-YEAR OFFICIAL WARRANTY",
                tag: "MECHANICAL & AUDIO GEAR",
                image_url: "/posters/Create_commercial_for_web_store_202606112343.webp",
                primary_cta_text: "SHOP KEYBOARDS",
                primary_cta_href: "/shop",
                secondary_cta_text: "VIEW NEW ARRIVALS",
                secondary_cta_href: "/shop?collection=new-in",
                sort_order: 2,
                is_active: true,
              },
              {
                id: "HB-3",
                title: "CLEAN DESK. ZERO CLUTTER.",
                subtitle: "Smart wireless charging docks, carbon fiber laptop lifts & glare-free monitor lightbars to transform your workspace into a productive sanctuary.",
                badge: "🚚 SAME DAY DISPATCH",
                tag: "DESK ACCESSORIES & LIGHTING",
                image_url: "/banner_1.webp",
                primary_cta_text: "EXPLORE ACCESSORIES",
                primary_cta_href: "/shop",
                secondary_cta_text: "DISCOVER ALL PRODUCTS",
                secondary_cta_href: "/shop",
                sort_order: 3,
                is_active: true,
              }
            ]);
          }
        } else {
          // Offline Fallbacks
          setProducts(MOCK_PRODUCTS);
          setCollections([
            {
              id: "audio-elite",
              name: "Audio Elite",
              description: "Broadcast quality mics, reference studio monitors, and comfort-focused ANC headphones.",
              type: "smart",
              rules: { tags: ["audio"] },
            },
            {
              id: "desk-accessories",
              name: "Desk Accessories",
              description: "Elevate your desk layout with premium work gear.",
              type: "smart",
              rules: { tags: ["gear"] },
            },
            {
              id: "creator-bundle",
              name: "Creator Essentials Bundle",
              description: "The ultimate starter pack for streaming and programming.",
              type: "manual",
              rules: { tags: [] },
            },
          ]);
          setCollectionProducts([
            { collection_id: "creator-bundle", product_id: "keyboard" },
            { collection_id: "creator-bundle", product_id: "mic" }
          ]);
          // Mock some visit data
          setVisits([
            { id: "1", path: "/", referrer: "direct", user_agent: "Mozilla", country: "United States", created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: "2", path: "/product/headphones", referrer: "google.com", user_agent: "Chrome", country: "United States", created_at: new Date(Date.now() - 7200000).toISOString() },
            { id: "3", path: "/product/keyboard", referrer: "instagram.com", user_agent: "Safari", country: "United Kingdom", created_at: new Date(Date.now() - 10000000).toISOString() },
            { id: "4", path: "/", referrer: "youtube.com", user_agent: "Firefox", country: "Canada", created_at: new Date(Date.now() - 15000000).toISOString() },
            { id: "5", path: "/product/charger", referrer: "direct", user_agent: "Chrome", country: "Germany", created_at: new Date(Date.now() - 18000000).toISOString() },
            { id: "6", path: "/product/mic", referrer: "twitter.com", user_agent: "Edge", country: "Australia", created_at: new Date(Date.now() - 25000000).toISOString() },
          ]);
          // Mock orders fallback
          setOrders([
            {
              id: "ORD-20260612-921A",
              customer_name: "Sarah Jenkins",
              customer_email: "sarah.j@example.com",
              shipping_address: "1524 Pine Street, San Francisco, CA, 94109",
              items: [{ id: "headphones", name: "Pro Noise-Cancelling Headphones", color: "Space Purple", quantity: 1, price: "Rs. 90,000" }],
              total_amount: 90000.00,
              status: "pending",
              created_at: new Date(Date.now() - 14400000).toISOString()
            },
            {
              id: "ORD-20260611-304B",
              customer_name: "Alex Rivera",
              customer_email: "alex.rivera@example.com",
              shipping_address: "892 Broadway Apt 4B, New York, NY, 10003",
              items: [
                { id: "keyboard", name: "Creations Mechanical Keyboard", color: "Onyx Black", quantity: 1, price: "Rs. 48,000" },
                { id: "charger", name: "Smart Dual Wireless Charger", color: "Carbon Black", quantity: 1, price: "Rs. 27,000" }
              ],
              total_amount: 75000.00,
              status: "shipped",
              created_at: new Date(Date.now() - 86400000).toISOString()
            },
            {
              id: "ORD-20260610-855C",
              customer_name: "Evelyn Chen",
              customer_email: "evelyn.chen@gmail.com",
              shipping_address: "724 Olympic Blvd, Los Angeles, CA, 90015",
              items: [{ id: "backpack", name: "Urban Tech Backpack", color: "Slate Grey", quantity: 1, price: "Rs. 42,000" }],
              total_amount: 42000.00,
              status: "delivered",
              created_at: new Date(Date.now() - 172800000).toISOString()
            }
          ]);
          // Mock contact inquiries fallback
          setContactInquiries([
            {
              id: "INQ-1",
              name: "Liam Johnson",
              email: "liam.johnson@example.com",
              reason: "general_inquiries",
              message: "Hello, I love your workspace aesthetic! Do you offer bulk discounts for corporate setup upgrades?",
              created_at: new Date(Date.now() - 86400000).toISOString(),
            },
            {
              id: "INQ-2",
              name: "Sophia Smith",
              email: "sophia.smith@example.com",
              reason: "product_inquiries",
              message: "Hi, is the mechanical keyboard compatible with macOS function keys out of the box?",
              created_at: new Date(Date.now() - 43200000).toISOString(),
            },
            {
              id: "INQ-3",
              name: "Jackson Davis",
              email: "jackson.davis@example.com",
              reason: "shipping_inquiries",
              message: "Hello, do you ship to international locations like Switzerland and Germany? If so, what is the ETA?",
              created_at: new Date(Date.now() - 7200000).toISOString(),
            }
          ]);
          // Mock marquee offers fallback
          setMarqueeOffers([
            { id: "MO-1", text: "Summer Sale: 20% Off All Audio Devices", row_number: 1 },
            { id: "MO-2", text: "Islandwide Express Delivery Available", row_number: 1 },
            { id: "MO-3", text: "Use Code CREATE20 for extra discounts", row_number: 1 },
            { id: "MO-4", text: "Limited stock on mechanical keyboards", row_number: 1 },
            { id: "MO-5", text: "Premium creator bundles now available", row_number: 1 },
            { id: "MO-6", text: "Elevate your desk setup with 15% off", row_number: 1 },
            { id: "MO-7", text: "Tactile switches special promotion active", row_number: 1 },
            { id: "MO-8", text: "Shop the high performance range", row_number: 1 },
            { id: "MO-9", text: "Exclusive subscriber discounts inside", row_number: 2 },
            { id: "MO-10", text: "Buy now and pay later with zero interest", row_number: 2 },
            { id: "MO-11", text: "Ambient LED lightbars: 30% discount", row_number: 2 },
            { id: "MO-12", text: "Carbon fiber monitor risers special offer", row_number: 2 },
            { id: "MO-13", text: "Upgrade to studio audio today", row_number: 2 },
            { id: "MO-14", text: "All desk accessories starting at Rs. 9,000", row_number: 2 },
            { id: "MO-15", text: "Smart wireless chargers best price", row_number: 2 },
            { id: "MO-16", text: "Water resistant travel cases on sale", row_number: 2 }
          ]);
        }
      } catch (err) {
        console.warn("Failed to load DB details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: "pending" | "fulfilled" | "shipped" | "delivered") => {
    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch("/api/orders/update-status", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ orderId, status: newStatus }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to update order status on server");
        }
      }
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    } catch (err: any) {
      alert(`Failed to update order status: ${err.message}`);
    }
  };

  const handleReviewBankReceipt = async (order: Order, received: boolean) => {
    const prompt = received
      ? `Confirm the bank slip for ${order.id} was received?\n\n${order.customer_email} will be emailed that payment was received and the order is proceeding.`
      : `Mark the bank transfer for ${order.id} as NOT received?\n\nThe order will be CANCELLED and ${order.customer_email} will be emailed.`;
    if (!confirm(prompt)) return;

    setReviewingReceiptId(order.id);
    try {
      let update: Partial<Order> = {
        payment_status: received ? "receipt_received" : "receipt_not_received",
        payment_reviewed_at: new Date().toISOString(),
        ...(received ? {} : { status: "cancelled" as const }),
      };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch("/api/orders/payment-receipt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ orderId: order.id, received }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to update the payment receipt on server");
        }
        update = data.order;
        if (!data.emailSent) {
          alert("Saved, but the customer email could not be sent. Please contact the customer directly.");
        }
      }
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...update } : o)));
    } catch (err: any) {
      alert(`Failed to update payment receipt: ${err.message}`);
    } finally {
      setReviewingReceiptId(null);
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPaymentSettings(true);
    try {
      const payload = {
        bank_name: paymentSettings.bank_name.trim(),
        account_name: paymentSettings.account_name.trim(),
        account_number: paymentSettings.account_number.trim(),
        branch: paymentSettings.branch.trim(),
        payment_note: paymentSettings.payment_note.trim(),
      };
      if (supabase) {
        const { error } = await supabase
          .from("payment_settings")
          .upsert({ id: 1, ...payload, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      setPaymentSettings(payload);
      setSaveStatus("Bank transfer details saved.");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      alert(`Failed to save bank transfer details: ${err.message}`);
    } finally {
      setSavingPaymentSettings(false);
    }
  };

  const resetDiscountForm = () => {
    setEditingDiscountId(null);
    setDiscountForm(EMPTY_DISCOUNT_FORM);
  };

  const handleEditDiscount = (row: DiscountCodeRow) => {
    setEditingDiscountId(row.id);
    setDiscountForm({
      code: row.code,
      description: row.description || "",
      discount_type: row.discount_type,
      value: String(Number(row.value) || ""),
      product_ids: row.product_ids || [],
      buy_qty: String(row.buy_qty || 1),
      get_qty: String(row.get_qty || 1),
      min_subtotal: Number(row.min_subtotal) ? String(Number(row.min_subtotal)) : "",
      max_uses: row.max_uses ? String(row.max_uses) : "",
      starts_at: toLocalInput(row.starts_at),
      expires_at: toLocalInput(row.expires_at),
      is_active: row.is_active,
    });
  };

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = discountForm;
    const code = normalizeCode(f.code);
    const type = f.discount_type;
    const value = Number(f.value);
    const needsValue = type !== "buy_x_get_y" && type !== "free_delivery";
    const needsProducts = type === "percent_product" || type === "fixed_product";
    const isPercent = type === "percent_order" || type === "percent_product";

    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      alert("Codes must be 3–40 characters: letters, numbers, - or _.");
      return;
    }
    if (needsValue && (!Number.isFinite(value) || value <= 0 || (isPercent && value > 100))) {
      alert(isPercent ? "Enter a percentage between 1 and 100." : "Enter a discount amount in Rs. greater than 0.");
      return;
    }
    if (needsProducts && f.product_ids.length === 0) {
      alert("Choose at least one product for this discount.");
      return;
    }
    const buyQty = Math.max(1, Math.round(Number(f.buy_qty) || 1));
    const getQty = Math.max(1, Math.round(Number(f.get_qty) || 1));
    const maxUses = f.max_uses.trim() ? Math.round(Number(f.max_uses)) : null;
    if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses < 1)) {
      alert("Usage limit must be 1 or more (leave empty for unlimited).");
      return;
    }
    const startsAt = f.starts_at ? new Date(f.starts_at).toISOString() : null;
    const expiresAt = f.expires_at ? new Date(f.expires_at).toISOString() : null;
    if (startsAt && expiresAt && expiresAt <= startsAt) {
      alert("The end date must be after the start date.");
      return;
    }

    const payload = {
      code,
      description: f.description.trim(),
      discount_type: type,
      value: needsValue ? Math.round(value * 100) / 100 : 0,
      product_ids: type === "buy_x_get_y" || needsProducts ? f.product_ids : [],
      buy_qty: type === "buy_x_get_y" ? buyQty : 1,
      get_qty: type === "buy_x_get_y" ? getQty : 1,
      min_subtotal: Math.max(0, Number(f.min_subtotal) || 0),
      max_uses: maxUses,
      starts_at: startsAt,
      expires_at: expiresAt,
      is_active: f.is_active,
      updated_at: new Date().toISOString(),
    };

    setSavingDiscount(true);
    try {
      if (!supabase) throw new Error("Database is not configured.");
      const query = editingDiscountId
        ? supabase.from("discount_codes").update(payload).eq("id", editingDiscountId).select("*")
        : supabase.from("discount_codes").insert(payload).select("*");
      const { data, error } = await query;
      if (error) {
        if (error.code === "23505") throw new Error(`The code "${code}" already exists. Choose a different code.`);
        throw error;
      }
      if (!data || data.length === 0) throw new Error(NOT_SAVED_MSG);
      const saved = data[0] as DiscountCodeRow;
      setDiscountCodes((prev) =>
        editingDiscountId ? prev.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...prev]
      );
      resetDiscountForm();
      setSaveStatus(`Discount code ${saved.code} saved.`);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      alert(`Failed to save discount code: ${err.message}`);
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleToggleDiscount = async (row: DiscountCodeRow) => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("discount_codes")
        .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .select("*");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(NOT_SAVED_MSG);
      setDiscountCodes((prev) => prev.map((d) => (d.id === row.id ? (data[0] as DiscountCodeRow) : d)));
    } catch (err: any) {
      alert(`Failed to update discount code: ${err.message}`);
    }
  };

  const handleDeleteDiscount = async (row: DiscountCodeRow) => {
    if (!confirm(`Delete discount code ${row.code}? Customers will no longer be able to use it.`)) return;
    try {
      if (!supabase) return;
      const { data, error } = await supabase.from("discount_codes").delete().eq("id", row.id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(NOT_SAVED_MSG);
      setDiscountCodes((prev) => prev.filter((d) => d.id !== row.id));
      if (editingDiscountId === row.id) resetDiscountForm();
    } catch (err: any) {
      alert(`Failed to delete discount code: ${err.message}`);
    }
  };

  const handleSaveDeliveryRates = async (e: React.FormEvent) => {
    e.preventDefault();
    const baseFee = Number(deliveryRatesForm.base_fee);
    const baseWeight = Number(deliveryRatesForm.base_weight_grams);
    const extraFee = Number(deliveryRatesForm.extra_fee_per_kg);
    const freeMin = Number(deliveryRatesForm.free_delivery_min_subtotal);
    if (![baseFee, extraFee, freeMin].every((n) => Number.isFinite(n) && n >= 0) || !Number.isFinite(baseWeight) || baseWeight <= 0) {
      alert("Please enter valid delivery rates (charges can be 0, the included weight must be more than 0).");
      return;
    }

    setSavingDeliveryRates(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("delivery_settings")
          .upsert({
            id: 1,
            base_fee: Math.round(baseFee * 100) / 100,
            base_weight_grams: Math.round(baseWeight),
            extra_fee_per_kg: Math.round(extraFee * 100) / 100,
            free_delivery_enabled: deliveryRatesForm.free_delivery_enabled,
            free_delivery_min_subtotal: Math.round(freeMin * 100) / 100,
            updated_at: new Date().toISOString(),
          })
          .select("id");
        if (error) throw error;
        if (!data || data.length === 0) throw new Error(NOT_SAVED_MSG);
      }
      setSaveStatus("Delivery rates saved.");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      alert(`Failed to save delivery rates: ${err.message}`);
    } finally {
      setSavingDeliveryRates(false);
    }
  };

  const handleDeleteInquiry = async (inquiryId: string) => {
    if (!confirm("Are you sure you want to delete this contact inquiry?")) return;

    try {
      if (supabase) {
        const { error } = await supabase.from("contact_inquiries").delete().eq("id", inquiryId);
        if (error) throw error;
      }
      setContactInquiries(contactInquiries.filter((inq) => inq.id !== inquiryId));
      if (activeInquiry?.id === inquiryId) {
        setActiveInquiry(null);
      }
    } catch (err: any) {
      alert(`Failed to delete contact inquiry: ${err.message}`);
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferText.trim()) return;

    setSavingOffer(true);
    const tempId = `MO-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    try {
      const payload = {
        text: newOfferText.trim(),
        row_number: newOfferRow,
      };

      let addedId = tempId;

      if (supabase) {
        const { data, error } = await supabase
          .from("marquee_offers")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        addedId = data?.id || tempId;
      }

      setMarqueeOffers((prev) => [
        ...prev,
        { id: addedId, text: newOfferText.trim(), row_number: newOfferRow }
      ]);
      setNewOfferText("");
    } catch (err: any) {
      alert(`Failed to add offer item: ${err.message}`);
    } finally {
      setSavingOffer(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this offer item?")) return;

    try {
      if (supabase) {
        const { error } = await supabase.from("marquee_offers").delete().eq("id", id);
        if (error) throw error;
      }
      setMarqueeOffers((prev) => prev.filter((o) => o.id !== id));
    } catch (err: any) {
      alert(`Failed to delete offer item: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("pluggedin_admin_session");
    await supabase?.auth.signOut();
    router.replace("/admin/login");
  };

  // -------------------------
  // PRODUCT FORM SUBMIT
  // -------------------------
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("Saving product...");

    const id = editingProductId || prodName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const priceNum = parseFloat(prodPrice.replace(/[^0-9.]/g, "")) || 0;
    const slashedPriceNum = prodSlashedPrice ? parseFloat(prodSlashedPrice.replace(/[^0-9.]/g, "")) || 0 : null;
    const discountVal = slashedPriceNum ? `${Math.round(((slashedPriceNum - priceNum) / slashedPriceNum) * 100)}% OFF` : "";

    const tagsArr = prodTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    const colorsArr = prodColors.split(",").map((c) => c.trim()).filter(Boolean);
    const featuresArr = prodFeatures.split(",").map((f) => f.trim()).filter(Boolean);
    const weightGrams = Math.max(0, Math.round(Number(prodWeight) || 0));

    const productPayload = {
      id,
      name: prodName,
      category: prodCategory,
      price: priceNum,
      slashed_price: slashedPriceNum,
      discount: discountVal,
      description: prodDescription,
      color: colorsArr[0]?.toLowerCase().includes("purple") ? "purple" : "slate",
      colors: colorsArr,
      images: prodImages.length > 0 ? prodImages : [`/products/${id}.webp`],
      tags: tagsArr,
      features: featuresArr,
      meta_title: prodMetaTitle,
      weight_grams: weightGrams,
      updated_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        let err;
        if (editingProductId) {
          const { error } = await supabase
            .from("products")
            .update(productPayload)
            .eq("id", editingProductId);
          err = error;
        } else {
          const { error } = await supabase
            .from("products")
            .insert({ ...productPayload, created_at: new Date().toISOString() });
          err = error;
        }

        if (err) throw err;
      }

      // Update state local catalog list
      const uiProduct: Product = {
        id,
        name: prodName,
        category: prodCategory,
        price: `Rs. ${Math.round(priceNum).toLocaleString()}`,
        slashedPrice: slashedPriceNum ? `Rs. ${Math.round(slashedPriceNum).toLocaleString()}` : "",
        discount: discountVal,
        description: prodDescription,
        color: colorsArr[0]?.toLowerCase().includes("purple") ? "purple" : "slate",
        colors: colorsArr,
        icon: getCategoryIcon(prodCategory, id),
        images: prodImages.length > 0 ? prodImages : [`/products/${id}.webp`],
        tags: tagsArr,
        features: featuresArr,
        metaTitle: prodMetaTitle,
        weightGrams,
      };

      if (editingProductId) {
        setProducts(products.map((p) => (p.id === editingProductId ? uiProduct : p)));
        setSaveStatus("Product updated successfully!");
      } else {
        setProducts([uiProduct, ...products]);
        setSaveStatus("Product added successfully!");
      }

      // Clear form
      resetProductForm();
      setTimeout(() => {
        setSaveStatus(null);
        setActiveTab("catalog");
      }, 1500);

    } catch (err: any) {
      console.error("Save product failed:", err);
      setSaveStatus(`Error saving: ${err.message}`);
    }
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProdName("");
    setProdCategory("Home and kitchen");
    setProdPrice("");
    setProdSlashedPrice("");
    setProdDescription("");
    setProdTags("");
    setProdColors("");
    setProdFeatures("");
    setProdImages([]);
    setProdMetaTitle("");
    setProdWeight("");
  };

  const handleEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdCategory(p.category);
    setProdPrice(p.price.replace(/Rs\.\s*|Rs\s*|,/gi, ""));
    setProdSlashedPrice(p.slashedPrice.replace(/Rs\.\s*|Rs\s*|,/gi, ""));
    setProdDescription(p.description);
    setProdTags((p.tags || []).join(", "));
    setProdColors((p.colors || []).join(", "));
    setProdFeatures((p.features || []).join(", "));
    setProdImages(p.images || []);
    setProdMetaTitle(p.metaTitle || "");
    setProdWeight(p.weightGrams ? String(p.weightGrams) : "");
    setActiveTab("add-product");
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm(`Are you sure you want to delete product ID: ${productId}?`)) return;

    try {
      if (supabase) {
        const { error } = await supabase.from("products").delete().eq("id", productId);
        if (error) throw error;
      }
      setProducts(products.filter((p) => p.id !== productId));
    } catch (err: any) {
      alert(`Failed to delete product: ${err.message}`);
    }
  };

  // -------------------------
  // IMAGE UPLOADS HANDLER
  // -------------------------
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (prodImages.length + files.length > 5) {
      alert("You can upload a maximum of 5 images.");
      return;
    }

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (supabase) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("products")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from("products").getPublicUrl(filePath);
          if (data?.publicUrl) {
            uploadedUrls.push(data.publicUrl);
          }
        } else {
          // Fallback Base64 for local offline demonstration
          const reader = new FileReader();
          const localUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          uploadedUrls.push(localUrl);
        }
      } catch (err: any) {
        console.error("Failed to upload image file:", err);
        alert(`Upload error: ${err.message || "Is your Supabase products storage bucket public?"}`);
      }
    }

    setProdImages([...prodImages, ...uploadedUrls]);
    setUploadingImages(false);
  };

  const removeUploadedImage = (index: number) => {
    setProdImages(prodImages.filter((_, i) => i !== index));
  };

  // -------------------------
  // COLLECTIONS HANDLER
  // -------------------------
  const handleEditCollection = (collection: Collection) => {
    setEditingCollectionId(collection.id);
    setCollName(collection.name);
    setCollDescription(collection.description || "");
    setCollType(collection.type);
    setCollTags((collection.rules?.tags || []).join(", "));
    if (collection.type === "manual") {
      const currentProdIds = collectionProducts
        .filter((cp) => cp.collection_id === collection.id)
        .map((cp) => cp.product_id);
      setCollSelectedProducts(currentProdIds);
    } else {
      setCollSelectedProducts([]);
    }
  };

  const handleCancelEditCollection = () => {
    setEditingCollectionId(null);
    setCollName("");
    setCollDescription("");
    setCollType("manual");
    setCollTags("");
    setCollSelectedProducts([]);
  };

  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(editingCollectionId);
    setSaveStatus(isEdit ? "Updating collection..." : "Creating collection...");

    const id = isEdit
      ? editingCollectionId!
      : collName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const tagsArr = collTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);

    const payload = {
      id,
      name: collName,
      description: collDescription,
      type: collType,
      rules: { tags: tagsArr },
      created_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        if (isEdit) {
          const { error } = await supabase.from("collections").update({
            name: collName,
            description: collDescription,
            type: collType,
            rules: { tags: tagsArr },
            updated_at: new Date().toISOString(),
          }).eq("id", id);
          if (error) throw error;

          if (collType === "manual") {
            await supabase.from("collection_products").delete().eq("collection_id", id);
            if (collSelectedProducts.length > 0) {
              const joins = collSelectedProducts.map((pId) => ({
                collection_id: id,
                product_id: pId,
              }));
              const { error: joinErr } = await supabase.from("collection_products").insert(joins);
              if (joinErr) throw joinErr;
            }
          }
        } else {
          const { error } = await supabase.from("collections").insert(payload);
          if (error) throw error;

          if (collType === "manual" && collSelectedProducts.length > 0) {
            const joins = collSelectedProducts.map((pId) => ({
              collection_id: id,
              product_id: pId,
            }));
            const { error: joinErr } = await supabase.from("collection_products").insert(joins);
            if (joinErr) throw joinErr;
          }
        }
      }

      if (isEdit) {
        setCollections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...payload } : c))
        );
        if (collType === "manual") {
          setCollectionProducts((prev) => {
            const filtered = prev.filter((cp) => cp.collection_id !== id);
            const newJoins = collSelectedProducts.map((pId) => ({
              collection_id: id,
              product_id: pId,
            }));
            return [...filtered, ...newJoins];
          });
        }
        setSaveStatus("Collection updated!");
      } else {
        setCollections([payload, ...collections]);
        if (collType === "manual" && collSelectedProducts.length > 0) {
          const joins = collSelectedProducts.map((pId) => ({
            collection_id: id,
            product_id: pId,
          }));
          setCollectionProducts((prev) => [...prev, ...joins]);
        }
        setSaveStatus("Collection created!");
      }

      handleCancelEditCollection();
      setTimeout(() => setSaveStatus(null), 1500);
    } catch (err: any) {
      console.error("Save collection failed:", err);
      setSaveStatus(`Error: ${err.message}`);
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (!confirm(`Are you sure you want to delete collection "${collectionId}"?`)) return;

    try {
      if (supabase) {
        const { error } = await supabase.from("collections").delete().eq("id", collectionId);
        if (error) throw error;
      }
      setCollections((prev) => prev.filter((c) => c.id !== collectionId));
      setCollectionProducts((prev) => prev.filter((cp) => cp.collection_id !== collectionId));
      if (expandedCollectionId === collectionId) setExpandedCollectionId(null);
      if (editingCollectionId === collectionId) handleCancelEditCollection();
    } catch (err: any) {
      alert(`Failed to delete collection: ${err.message}`);
    }
  };

  const handleRemoveProductFromCollection = async (collectionId: string, productId: string) => {
    try {
      if (supabase) {
        const { error } = await supabase
          .from("collection_products")
          .delete()
          .eq("collection_id", collectionId)
          .eq("product_id", productId);
        if (error) throw error;
      }
      setCollectionProducts((prev) =>
        prev.filter((cp) => !(cp.collection_id === collectionId && cp.product_id === productId))
      );
    } catch (err: any) {
      alert(`Failed to remove product from collection: ${err.message}`);
    }
  };

  const handleAddProductToCollection = async (collectionId: string, productId: string) => {
    if (!productId) return;
    try {
      if (supabase) {
        const { error } = await supabase
          .from("collection_products")
          .insert({ collection_id: collectionId, product_id: productId });
        if (error) throw error;
      }
      setCollectionProducts((prev) => [...prev, { collection_id: collectionId, product_id: productId }]);
    } catch (err: any) {
      alert(`Failed to add product to collection: ${err.message}`);
    }
  };

  const toggleProductSelectForCollection = (prodId: string) => {
    if (collSelectedProducts.includes(prodId)) {
      setCollSelectedProducts(collSelectedProducts.filter((id) => id !== prodId));
    } else {
      setCollSelectedProducts([...collSelectedProducts, prodId]);
    }
  };

  // Helper to fetch collection items
  const getProductsForCollection = (collection: Collection): Product[] => {
    if (collection.type === "smart") {
      const matchTags = collection.rules?.tags || [];
      return products.filter((p) =>
        p.tags?.some((t) => matchTags.includes(t.toLowerCase()))
      );
    }
    const linkedIds = collectionProducts
      .filter((cp) => cp.collection_id === collection.id)
      .map((cp) => cp.product_id);
    return products.filter((p) => linkedIds.includes(p.id));
  };

  const getCollectionProductCount = (collection: Collection) => {
    return getProductsForCollection(collection).length;
  };

  // -------------------------
  // HERO BANNER HANDLERS
  // -------------------------
  const handleOpenAddBannerModal = () => {
    if (heroBanners.length >= 5) {
      alert("Maximum limit of 5 hero banners reached! Please edit or delete an existing banner.");
      return;
    }
    setEditingBanner(null);
    setBannerForm({
      title: "",
      subtitle: "",
      badge: "⚡ FAST ISLANDWIDE SHIPPING",
      tag: "FEATURED COLLECTION 2026",
      image_url: "",
      mobile_image_url: "",
      link_url: "",
      primary_cta_text: "SHOP CREATOR GEAR",
      primary_cta_href: "/shop",
      secondary_cta_text: "EXPLORE COLLECTION",
      secondary_cta_href: "/shop?collection=trending",
      sort_order: heroBanners.length + 1,
      is_active: true,
    });
    setIsBannerModalOpen(true);
  };

  const handleOpenEditBannerModal = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setBannerForm(banner);
    setIsBannerModalOpen(true);
  };

  const handleUploadBannerFile = (field: "image_url" | "mobile_image_url") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBannerImage(field);
    try {
      if (supabase) {
        const fileExt = file.name.split(".").pop();
        const fileName = `hero_${field === "mobile_image_url" ? "mobile_" : ""}${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `hero-banners/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("products")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("products").getPublicUrl(filePath);
        if (data?.publicUrl) {
          setBannerForm((prev) => ({ ...prev, [field]: data.publicUrl }));
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setBannerForm((prev) => ({ ...prev, [field]: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error("Banner upload failed:", err);
      alert(`Image upload error: ${err.message || "Failed to upload image"}`);
    } finally {
      setUploadingBannerImage(null);
      e.target.value = "";
    }
  };

  // RLS-blocked writes return no error, just zero rows — treat that as a failure
  const NOT_SAVED_MSG = "The change was not saved. Your admin session may have expired — please log out and log in again.";

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const linkUrl = (bannerForm.link_url || "").trim();
    if (linkUrl && !resolveBannerLink(linkUrl)) {
      alert("The banner link doesn't look like a valid web address. Paste the full URL, e.g. https://www.pluggedin.lk/product/your-product");
      return;
    }
    setSavingBanner(true);
    try {
      let savedId = `HB-${Date.now()}`;
      if (supabase) {
        if (editingBanner) {
          const { data, error } = await supabase
            .from("hero_banners")
            .update({
              title: bannerForm.title || "",
              subtitle: bannerForm.subtitle || "",
              badge: bannerForm.badge || "",
              tag: bannerForm.tag || "",
              image_url: bannerForm.image_url || "",
              mobile_image_url: bannerForm.mobile_image_url || "",
              link_url: linkUrl,
              primary_cta_text: bannerForm.primary_cta_text || "",
              primary_cta_href: bannerForm.primary_cta_href || "",
              secondary_cta_text: bannerForm.secondary_cta_text || "",
              secondary_cta_href: bannerForm.secondary_cta_href || "",
              sort_order: bannerForm.sort_order || 1,
              is_active: bannerForm.is_active ?? true,
              updated_at: new Date().toISOString()
            })
            .eq("id", editingBanner.id)
            .select("id");
          if (error) throw error;
          if (!data || data.length === 0) throw new Error(NOT_SAVED_MSG);
        } else {
          const { data, error } = await supabase.from("hero_banners").insert([
            {
              title: bannerForm.title || "",
              subtitle: bannerForm.subtitle || "",
              badge: bannerForm.badge || "",
              tag: bannerForm.tag || "",
              image_url: bannerForm.image_url || "",
              mobile_image_url: bannerForm.mobile_image_url || "",
              link_url: linkUrl,
              primary_cta_text: bannerForm.primary_cta_text || "",
              primary_cta_href: bannerForm.primary_cta_href || "",
              secondary_cta_text: bannerForm.secondary_cta_text || "",
              secondary_cta_href: bannerForm.secondary_cta_href || "",
              sort_order: bannerForm.sort_order || heroBanners.length + 1,
              is_active: bannerForm.is_active ?? true,
            }
          ]).select("id").single();
          if (error) throw error;
          savedId = data.id;
        }
      }

      if (editingBanner) {
        setHeroBanners(
          heroBanners.map((b) =>
            b.id === editingBanner.id ? ({ ...b, ...bannerForm, link_url: linkUrl } as HeroBanner) : b
          )
        );
      } else {
        const newBanner: HeroBanner = {
          id: savedId,
          title: bannerForm.title || "",
          subtitle: bannerForm.subtitle || "",
          badge: bannerForm.badge || "",
          tag: bannerForm.tag || "",
          image_url: bannerForm.image_url || "",
          mobile_image_url: bannerForm.mobile_image_url || "",
          link_url: linkUrl,
          primary_cta_text: bannerForm.primary_cta_text || "",
          primary_cta_href: bannerForm.primary_cta_href || "",
          secondary_cta_text: bannerForm.secondary_cta_text || "",
          secondary_cta_href: bannerForm.secondary_cta_href || "",
          sort_order: bannerForm.sort_order || heroBanners.length + 1,
          is_active: bannerForm.is_active ?? true,
        };
        setHeroBanners([...heroBanners, newBanner]);
      }

      setIsBannerModalOpen(false);
      setSaveStatus("Hero banner saved successfully!");
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err: any) {
      console.error("Save hero banner error:", err);
      alert(`Save error: ${err.message || "Failed to save banner"}`);
    } finally {
      setSavingBanner(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hero banner?")) return;
    try {
      if (supabase) {
        const { data, error } = await supabase.from("hero_banners").delete().eq("id", id).select("id");
        if (error) throw error;
        if (!data || data.length === 0) throw new Error(NOT_SAVED_MSG);
      }
      setHeroBanners(heroBanners.filter((b) => b.id !== id));
      setSaveStatus("Banner deleted");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      console.error("Failed to delete banner:", err);
      alert(`Delete error: ${err.message || "Failed to delete banner"}`);
    }
  };

  const handleToggleBannerActive = async (id: string, currentActive: boolean) => {
    const updatedActive = !currentActive;
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("hero_banners")
          .update({ is_active: updatedActive, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select("id");
        if (error) throw error;
        if (!data || data.length === 0) throw new Error(NOT_SAVED_MSG);
      }
      setHeroBanners(
        heroBanners.map((b) => (b.id === id ? { ...b, is_active: updatedActive } : b))
      );
    } catch (err: any) {
      console.error("Failed to toggle banner status:", err);
      alert(`Update error: ${err.message || "Failed to update banner"}`);
    }
  };

  // -------------------------
  // ANALYTICS AGGREGATIONS
  // -------------------------
  const totalVisits = visits.length;
  const uniqueVisitors = new Set(visits.map((v) => v.ip || v.id)).size;
  
  // Referrers Pie logic
  const referrerMap: Record<string, number> = {};
  visits.forEach((v) => {
    const ref = v.referrer || "direct";
    referrerMap[ref] = (referrerMap[ref] || 0) + 1;
  });
  const sortedReferrers = Object.entries(referrerMap).sort((a, b) => b[1] - a[1]);

  // Page paths popularity
  const pathMap: Record<string, number> = {};
  visits.forEach((v) => {
    pathMap[v.path] = (pathMap[v.path] || 0) + 1;
  });
  const sortedPaths = Object.entries(pathMap).sort((a, b) => b[1] - a[1]);

  // Visits in last 7 days chart array
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }).reverse();

  // Compute visits count for each of the last 7 days from analytics_visits
  const last7DaysDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    return d;
  }).reverse();

  const graphPoints = last7DaysDates.map((date) => {
    const start = date.getTime();
    const end = start + 24 * 60 * 60 * 1000;
    return visits.filter((v) => {
      const vTime = new Date(v.created_at).getTime();
      return vTime >= start && vTime < end;
    }).length;
  });

  const svgPath = (() => {
    const maxVal = Math.max(...graphPoints, 5);
    const pts = graphPoints.map((val, idx) => {
      const x = idx * 100;
      const y = 170 - (val / maxVal) * 140;
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    });
    return pts.join(" ");
  })();

  return (
    <div className="flex-grow flex h-full select-none overflow-hidden text-sm leading-relaxed font-inter">
      
      {/* ------------------------- */}
      {/* LEFT SIDEBAR NAVIGATION */}
      {/* ------------------------- */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 p-6 z-20">
        <div className="flex flex-col gap-8">
          
          {/* Admin title */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-sm font-extrabold tracking-[0.2em] font-inter text-slate-900 uppercase">
              PLUGGEDIN // ADMIN
            </h1>
          </div>

          {/* Nav List */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer font-bold border-0 text-left ${
                activeTab === "dashboard"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15"
                  : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>

            {/* Products Dropdown Accordion */}
            <div className="flex flex-col">
              <button
                onClick={() => setProductsOpen(!productsOpen)}
                className="flex items-center justify-between px-4 py-3 rounded-2xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 cursor-pointer font-bold border-0 text-left"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Products
                </div>
                <svg
                  className={`w-3.5 h-3.5 transform transition-transform duration-200 ${
                    productsOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {productsOpen && (
                <div className="flex flex-col pl-7 border-l border-slate-200 ml-6 gap-1 mt-1 animate-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => setActiveTab("catalog")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer border-0 ${
                      activeTab === "catalog"
                        ? "bg-purple-50 text-purple-600 font-extrabold"
                        : "bg-transparent text-slate-400 hover:text-slate-800"
                    }`}
                  >
                    Catalog
                  </button>
                  <button
                    onClick={() => {
                      resetProductForm();
                      setActiveTab("add-product");
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer border-0 ${
                      activeTab === "add-product"
                        ? "bg-purple-50 text-purple-600 font-extrabold"
                        : "bg-transparent text-slate-400 hover:text-slate-800"
                    }`}
                  >
                    Add Product
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab("collections")}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer font-bold border-0 text-left ${
                activeTab === "collections"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15"
                  : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Collections
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer font-bold border-0 text-left ${
                activeTab === "orders"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15"
                  : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Orders
            </button>

            <button
              onClick={() => setActiveTab("bank-transfer")}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer font-bold border-0 text-left ${
                activeTab === "bank-transfer"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15"
                  : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M12 3l9 5H3l9-5z" />
              </svg>
              Bank Transfer
            </button>

            <button
              onClick={() => setActiveTab("delivery")}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer font-bold border-0 text-left ${
                activeTab === "delivery"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15"
                  : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              Delivery
            </button>

            <button
              onClick={() => setActiveTab("discounts")}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer font-bold border-0 text-left ${
                activeTab === "discounts"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15"
                  : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Discounts
              </div>
              {discountCodes.length > 0 && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                  activeTab === "discounts" ? "bg-white text-purple-600" : "bg-purple-50 text-purple-655"
                }`}>
                  {discountCodes.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("contact-inquiries")}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer font-bold border-0 text-left ${
                activeTab === "contact-inquiries"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15"
                  : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Inquiries
              </div>
              {contactInquiries.length > 0 && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                  activeTab === "contact-inquiries"
                    ? "bg-white text-purple-600"
                    : "bg-purple-50 text-purple-655"
                }`}>
                  {contactInquiries.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("hero-banners")}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer font-bold border-0 text-left ${
                activeTab === "hero-banners"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15"
                  : "bg-transparent text-slate-550 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Hero Banners
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                activeTab === "hero-banners"
                  ? "bg-white text-purple-600"
                  : "bg-purple-50 text-purple-655"
              }`}>
                {heroBanners.length} / 5
              </span>
            </button>

            <button
              onClick={() => setActiveTab("offer-section")}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer font-bold border-0 text-left ${
                activeTab === "offer-section"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15"
                  : "bg-transparent text-slate-550 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                Offer Section
              </div>
              {marqueeOffers.length > 0 && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                  activeTab === "offer-section"
                    ? "bg-white text-purple-600"
                    : "bg-purple-50 text-purple-655"
                }`}>
                  {marqueeOffers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer font-bold border-0 text-left ${
                activeTab === "analytics"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15"
                  : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              Analytics
            </button>
          </nav>
        </div>

        {/* User Block & Logout */}
        <div className="flex flex-col gap-4 border-t border-slate-200/80 pt-6">
          <div className="flex flex-col select-none">
            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
              Logged in as
            </span>
            <span className="text-[11px] font-bold text-slate-650 truncate max-w-full">
              {adminUser}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 px-4 py-2.5 rounded-full transition-all text-xs font-bold cursor-pointer"
          >
            LOG OUT SYSTEM
          </button>
        </div>
      </aside>

      {/* ------------------------- */}
      {/* MAIN CONTENT WORKSPACE */}
      {/* ------------------------- */}
      <main className="flex-grow flex flex-col h-full bg-slate-50/50 backdrop-blur-3xl overflow-hidden relative z-10">
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-slate-50 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                Fetching records...
              </span>
            </div>
          </div>
        )}

        {/* Header toolbar */}
        <header className="h-20 border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 bg-white/80">
          <h2 className="text-lg font-black font-inter tracking-tight text-slate-900 uppercase">
            {activeTab.replace("-", " ")} Workspace
          </h2>
          <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">
            System status: <span className="text-emerald-600 font-black">ONLINE</span>
          </div>
        </header>

        {/* Tab workspace area */}
        <div className="flex-grow overflow-y-auto p-8 scrollbar-thin">
          
          {/* TAB 1: DASHBOARD HOME */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-8">
              
              {/* Quick Metrics Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: "Catalog Inventory", count: products.length, desc: "Active store items", color: "from-blue-500/5 to-transparent border-blue-100 bg-white" },
                  { title: "Dynamic Collections", count: collections.length, desc: "Categories & groupings", color: "from-purple-500/5 to-transparent border-purple-100 bg-white" },
                  { title: "Total Page Visits", count: totalVisits, desc: "Tracked customer load counts", color: "from-emerald-500/5 to-transparent border-emerald-100 bg-white" },
                ].map((stat, idx) => (
                  <div key={idx} className={`bg-gradient-to-br ${stat.color} border p-6 rounded-[1.8rem] shadow-xs flex flex-col justify-between h-36`}>
                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                      {stat.title}
                    </span>
                    <div className="text-4xl font-extrabold font-inter text-slate-900">
                      {stat.count}
                    </div>
                    <span className="text-xs text-slate-500 font-semibold">
                      {stat.desc}
                    </span>
                  </div>
                ))}
              </div>

              {/* Graphical analytics widget */}
              <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-4 shadow-xs">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase">
                    Visitor Load Volume (Last 7 Days)
                  </h3>
                  <span className="text-xs font-bold text-purple-600">
                    +12% vs last week
                  </span>
                </div>

                <div className="h-56 w-full flex items-end justify-between relative pt-6 px-2 border-b border-slate-200">
                  {/* Custom SVG Line Chart */}
                  <svg className="absolute inset-0 w-full h-full p-6 text-purple-600" viewBox="0 0 600 200" preserveAspectRatio="none">
                    <path
                      d={svgPath}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="drop-shadow-[0_0_6px_rgba(139,92,246,0.15)]"
                    />
                  </svg>

                  {/* Grid Lines */}
                  <div className="absolute left-0 right-0 top-1/4 border-t border-slate-100" />
                  <div className="absolute left-0 right-0 top-2/4 border-t border-slate-100" />
                  <div className="absolute left-0 right-0 top-3/4 border-t border-slate-100" />

                  {/* Columns rendering */}
                  {last7Days.map((day, idx) => {
                    const maxVal = Math.max(...graphPoints, 1);
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 z-10">
                        <div className="text-[10px] font-black text-purple-600/80">
                          {graphPoints[idx]}
                        </div>
                        <div 
                          className="w-1.5 rounded-full bg-gradient-to-t from-purple-600 to-fuchsia-400 transition-all duration-1000"
                          style={{ height: `${(graphPoints[idx] / maxVal) * 140}px` }}
                        />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Popular Products Row & Top Referrers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Popular paths widget */}
                <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-4 shadow-xs">
                  <h4 className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase">
                    Top Page Paths
                  </h4>
                  <div className="flex flex-col gap-3">
                    {sortedPaths.slice(0, 4).map(([path, count], idx) => (
                      <div key={path} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                        <span className="font-mono text-xs text-slate-600 truncate max-w-[70%]">
                          {idx + 1}. {path}
                        </span>
                        <span className="bg-slate-50 border border-slate-200 text-[10px] font-black text-slate-500 px-3 py-1 rounded-full">
                          {count} views
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Referrers widget */}
                <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-4 shadow-xs">
                  <h4 className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase">
                    Acquisition Sources
                  </h4>
                  <div className="flex flex-col gap-3">
                    {sortedReferrers.slice(0, 4).map(([ref, count], idx) => {
                      const percentage = Math.round((count / totalVisits) * 100) || 0;
                      return (
                        <div key={ref} className="flex flex-col gap-1.5 py-1">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-700 capitalize">{ref}</span>
                            <span className="text-slate-400">{count} visits ({percentage}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: PRODUCTS CATALOG */}
          {activeTab === "catalog" && (
            <div className="flex flex-col gap-6">
              
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Showing {products.length} Products
                </span>
                <button
                  onClick={() => {
                    resetProductForm();
                    setActiveTab("add-product");
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black tracking-widest px-5 py-2.5 rounded-full transition-all cursor-pointer border-0 shadow-sm"
                >
                  ADD NEW PRODUCT
                </button>
              </div>

              {/* Table List of products */}
              <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-black tracking-widest text-slate-500 uppercase bg-slate-50/50">
                      <th className="py-4 px-6">Product</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Price</th>
                      <th className="py-4 px-6">Tags</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-4 px-6 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0">
                            <img
                              src={p.images && p.images.length > 0 ? p.images[0] : `/products/${p.id}.webp`}
                              alt={p.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{p.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{p.id}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-500">
                          {p.category}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-baseline gap-2">
                            <span className="font-black text-slate-900">{p.price}</span>
                            {p.slashedPrice && (
                              <span className="text-xs text-slate-400 line-through">{p.slashedPrice}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(p.tags || []).slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[9px] font-black text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md uppercase">
                                {tag}
                              </span>
                            ))}
                            {(p.tags || []).length > 3 && (
                              <span className="text-[9px] font-bold text-slate-400 px-1 py-0.5">
                                +{(p.tags || []).length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditProduct(p)}
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="bg-slate-50 hover:bg-red-550/5 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 text-slate-400 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: ADD PRODUCT FORM */}
          {activeTab === "add-product" && (
            <div className="max-w-3xl bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xs">
              
              {saveStatus && (
                <div className="bg-purple-50 border border-purple-100 text-purple-600 text-xs font-semibold px-4 py-3 rounded-2xl mb-6 text-center animate-pulse">
                  {saveStatus.toUpperCase()}
                </div>
              )}

              <form onSubmit={handleProductSubmit} className="flex flex-col gap-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="e.g. Pro Noise-Cancelling Headphones"
                      className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                      Category
                    </label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none transition-all"
                    >
                      {["Home and kitchen", "Tech & Gadgets", "Mobile & Auto", "Best sellers", "Trending"].map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Meta Title Field */}
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                    Meta Title (SEO)
                  </label>
                  <input
                    type="text"
                    value={prodMetaTitle}
                    onChange={(e) => setProdMetaTitle(e.target.value)}
                    placeholder="e.g. Pro Noise-Cancelling Headphones | Premium Studio Audio Gear"
                    className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                      Store Price (Rs.)
                    </label>
                    <input
                      type="text"
                      required
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="e.g. 90000"
                      className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                      Compare-at Slash Price (Rs.)
                    </label>
                    <input
                      type="text"
                      value={prodSlashedPrice}
                      onChange={(e) => setProdSlashedPrice(e.target.value)}
                      placeholder="e.g. 120000"
                      className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                    Weight (grams)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={prodWeight}
                    onChange={(e) => setProdWeight(e.target.value)}
                    placeholder="e.g. 750"
                    className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none transition-all"
                  />
                  <span className="text-[10px] text-slate-400 ml-1">
                    Packed shipping weight. Used to calculate the delivery charge (1 kg = 1000 g).
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                    Rich Text Description
                  </label>
                  <RichTextEditor
                    value={prodDescription}
                    onChange={setProdDescription}
                    placeholder="Enter broadcast quality copy..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                      Product Tags (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={prodTags}
                      onChange={(e) => setProdTags(e.target.value)}
                      placeholder="audio, wireless, anc, premium"
                      className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                      Available Colors (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={prodColors}
                      onChange={(e) => setProdColors(e.target.value)}
                      placeholder="Space Purple, Matte Black, Silver Gray"
                      className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                    Key Features / Highlight Specs (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={prodFeatures}
                    onChange={(e) => setProdFeatures(e.target.value)}
                    placeholder="Active Noise Cancellation, Studio sound, 40h Battery"
                    className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none transition-all"
                  />
                </div>

                {/* Images Uploads Bucket section */}
                <div className="flex flex-col gap-4 border-t border-slate-200 pt-6">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">
                      Product Images (Max 5 images)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Upload to Supabase storage bucket `products`
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 items-center mt-2">
                    {prodImages.map((imgUrl, index) => (
                      <div key={index} className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0">
                        <img src={imgUrl} alt="Upload preview" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => removeUploadedImage(index)}
                          className="absolute top-1 right-1 bg-red-650 hover:bg-red-750 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black border-0 cursor-pointer shadow-md"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {prodImages.length < 5 && (
                      <label className="w-20 h-20 bg-slate-55 border border-dashed border-slate-250 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-all text-slate-450 hover:text-purple-600">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImages}
                          className="hidden"
                        />
                        {uploadingImages ? (
                          <div className="w-4 h-4 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                        ) : (
                          <>
                            <span className="text-xl font-bold">+</span>
                            <span className="text-[8px] font-black uppercase mt-1">Upload</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    className="flex-grow bg-slate-900 hover:bg-slate-800 text-white text-xs font-black tracking-widest py-4 rounded-full transition-all cursor-pointer border-0 shadow-sm"
                  >
                    {editingProductId ? "SAVE PRODUCT CHANGES" : "PUBLISH TO STOREFRONT"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetProductForm();
                      setActiveTab("catalog");
                    }}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 px-6 py-4 rounded-full text-xs font-bold cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                </div>

              </form>

            </div>
          )}          {/* TAB 4: COLLECTIONS SYSTEM */}
          {activeTab === "collections" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Form: Create / Edit Collection */}
              <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black tracking-[0.2em] text-slate-550 uppercase">
                    {editingCollectionId ? "Edit Collection" : "Create Collection"}
                  </h3>
                  {editingCollectionId && (
                    <button
                      type="button"
                      onClick={handleCancelEditCollection}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                {saveStatus && (
                  <div className="bg-purple-50 border border-purple-100 text-purple-600 text-xs font-semibold px-4 py-2 rounded-xl text-center">
                    {saveStatus.toUpperCase()}
                  </div>
                )}

                <form onSubmit={handleCollectionSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                      Collection Title
                    </label>
                    <input
                      type="text"
                      required
                      value={collName}
                      onChange={(e) => setCollName(e.target.value)}
                      placeholder="e.g., Audio Elite"
                      className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                      Description
                    </label>
                    <textarea
                      value={collDescription}
                      onChange={(e) => setCollDescription(e.target.value)}
                      placeholder="Describe the collection purpose..."
                      className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none transition-all h-20 resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase ml-1">
                      Collection Type
                    </label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => setCollType("manual")}
                        className={`py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                          collType === "manual"
                            ? "bg-purple-50 border-purple-500 text-purple-600"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                        }`}
                      >
                        Manual Linkage
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollType("smart")}
                        className={`py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                          collType === "smart"
                            ? "bg-purple-50 border-purple-500 text-purple-600"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                        }`}
                      >
                        Smart Tags
                      </button>
                    </div>
                  </div>

                  {/* SMART RULES SETTINGS */}
                  {collType === "smart" && (
                    <div className="flex flex-col gap-2 bg-purple-50/50 border border-purple-100/85 rounded-2xl p-4 animate-in fade-in duration-200">
                      <label className="text-[9px] font-black tracking-widest text-purple-600 uppercase">
                        Smart Criteria Tags (Comma separated)
                      </label>
                      <input
                        type="text"
                        required
                        value={collTags}
                        onChange={(e) => setCollTags(e.target.value)}
                        placeholder="audio, premium, anc"
                        className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none transition-all"
                      />
                      <span className="text-[10px] text-slate-400 font-semibold leading-normal mt-1 block">
                        💡 Shopify logic: Products with any of these tags will automatically belong to this collection.
                      </span>
                    </div>
                  )}

                  {/* MANUAL SELECTION LIST */}
                  {collType === "manual" && (
                    <div className="flex flex-col gap-2 border border-slate-200 rounded-2xl p-4 animate-in fade-in duration-200">
                      <label className="text-[9px] font-black tracking-widest text-slate-450 uppercase">
                        Select Products to Include
                      </label>
                      <div className="max-h-44 overflow-y-auto flex flex-col gap-2 pr-1 scrollbar-thin">
                        {products.map((p) => {
                          const isSelected = collSelectedProducts.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleProductSelectForCollection(p.id)}
                              className={`flex items-center justify-between p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                                isSelected
                                  ? "bg-purple-50 border-purple-200 text-slate-900 font-bold"
                                  : "bg-slate-50 border-slate-200/60 text-slate-500 hover:bg-slate-100"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate max-w-[75%]">
                                <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] font-bold ${isSelected ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300"}`}>
                                  {isSelected ? "✓" : ""}
                                </span>
                                <span className="truncate">{p.name}</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">{p.price}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black tracking-widest py-4 rounded-full transition-all cursor-pointer border-0 shadow-sm"
                    >
                      {editingCollectionId ? "SAVE COLLECTION CHANGES" : "CREATE COLLECTION"}
                    </button>
                    {editingCollectionId && (
                      <button
                        type="button"
                        onClick={handleCancelEditCollection}
                        className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-full transition-all cursor-pointer border-0"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Right List: Collections List */}
              <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-4 shadow-xs">
                <h3 className="text-xs font-black tracking-[0.2em] text-slate-555 uppercase">
                  Existing Collections ({collections.length})
                </h3>

                <div className="flex flex-col gap-4">
                  {collections.map((c) => {
                    const collProds = getProductsForCollection(c);
                    const isExpanded = expandedCollectionId === c.id;
                    const isEditingThis = editingCollectionId === c.id;

                    return (
                      <div
                        key={c.id}
                        className={`bg-slate-50/50 border p-5 rounded-3xl flex flex-col gap-4 transition-all duration-300 shadow-2xs ${
                          isEditingThis
                            ? "border-purple-300 bg-purple-50/30 ring-2 ring-purple-500/10"
                            : "border-slate-200/80 hover:border-slate-350"
                        }`}
                      >
                        {/* Collection Top Info Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col gap-1 text-left max-w-[70%]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-slate-800 text-base">{c.name}</span>
                              <span className={`text-[8px] font-black tracking-widest px-2.5 py-0.5 rounded-full border uppercase ${
                                c.type === "smart"
                                  ? "bg-purple-50 border-purple-200/80 text-purple-650"
                                  : "bg-blue-50 border-blue-200/80 text-blue-650"
                              }`}>
                                {c.type}
                              </span>
                            </div>
                            <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                              {c.description || "No description provided."}
                            </p>
                            {c.type === "smart" && c.rules?.tags && c.rules.tags.length > 0 && (
                              <div className="flex gap-1.5 flex-wrap mt-1">
                                {c.rules.tags.map((tag) => (
                                  <span key={tag} className="text-[9px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                    tag:{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className="text-2xl font-black font-inter text-slate-800">
                              {collProds.length}
                            </span>
                            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
                              Products
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => setExpandedCollectionId(isExpanded ? null : c.id)}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-purple-600 transition-colors cursor-pointer"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180 text-purple-600" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                            <span>{isExpanded ? "Hide Products" : `View Products (${collProds.length})`}</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditCollection(c)}
                              className="px-3 py-1.5 text-[11px] font-bold text-slate-700 bg-white border border-slate-250 hover:bg-slate-50 hover:border-slate-350 rounded-xl transition-all cursor-pointer shadow-xs"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCollection(c.id)}
                              className="px-3 py-1.5 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200/80 hover:bg-red-100 rounded-xl transition-all cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* EXPANDED PRODUCTS LIST */}
                        {isExpanded && (
                          <div className="flex flex-col gap-3 pt-3 border-t border-purple-100/80 bg-white p-4 rounded-2xl animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                                Products in Collection ({collProds.length})
                              </span>
                              {c.type === "smart" && (
                                <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                                  ⚡ Auto-linked by tags
                                </span>
                              )}
                            </div>

                            {/* Product List */}
                            {collProds.length === 0 ? (
                              <div className="text-center py-6 text-xs text-slate-400 font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                No products in this collection yet.
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                                {collProds.map((prod) => (
                                  <div
                                    key={prod.id}
                                    className="flex items-center justify-between p-2.5 bg-slate-50/80 border border-slate-200/70 rounded-xl hover:bg-slate-100/80 transition-all"
                                  >
                                    <div className="flex items-center gap-3 truncate max-w-[70%]">
                                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0">
                                        {prod.images?.[0] ? (
                                          <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-contain" />
                                        ) : (
                                          <span className="text-[10px] font-bold text-slate-400">📦</span>
                                        )}
                                      </div>
                                      <div className="flex flex-col truncate">
                                        <span className="font-bold text-slate-800 text-xs truncate">{prod.name}</span>
                                        <span className="text-[10px] text-slate-400">{prod.category} • {prod.price}</span>
                                      </div>
                                    </div>

                                    {/* Action per product */}
                                    {c.type === "manual" ? (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveProductFromCollection(c.id, prod.id)}
                                        className="text-[11px] font-bold text-red-500 hover:text-red-700 bg-white hover:bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0"
                                        title="Remove product from collection"
                                      >
                                        Remove
                                      </button>
                                    ) : (
                                      <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                        Smart Tag
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Quick Add Product for Manual Collection */}
                            {c.type === "manual" && (
                              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                                <select
                                  value={quickAddProductId}
                                  onChange={(e) => setQuickAddProductId(e.target.value)}
                                  className="flex-1 bg-slate-50 border border-slate-250 text-xs font-semibold text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
                                >
                                  <option value="">+ Choose product to add...</option>
                                  {products
                                    .filter((p) => !collProds.some((cp) => cp.id === p.id))
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} ({p.price})
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={!quickAddProductId}
                                  onClick={async () => {
                                    if (quickAddProductId) {
                                      await handleAddProductToCollection(c.id, quickAddProductId);
                                      setQuickAddProductId("");
                                    }
                                  }}
                                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer border-0 shrink-0"
                                >
                                  Add
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: ANALYTICS DETAIL */}
          {activeTab === "analytics" && (
            <div className="flex flex-col gap-8">
              
              {/* Traffic details row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { title: "Total Views", value: totalVisits, desc: "Cumulative logs" },
                  { title: "Unique Visitors", value: uniqueVisitors, desc: "Separate client sessions" },
                  { title: "Top Referrer", value: sortedReferrers[0]?.[0] || "direct", desc: "Best traffic funnel" },
                  { title: "Conversion Ratio", value: totalVisits > 0 ? `${((orders.length / totalVisits) * 100).toFixed(1)}%` : "0.0%", desc: "Estimated buyer rate" },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white border border-slate-200/80 p-5 rounded-[1.5rem] flex flex-col justify-between h-28 shadow-xs">
                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                      {stat.title}
                    </span>
                    <div className="text-2xl font-extrabold text-slate-900 font-inter capitalize truncate">
                      {stat.value}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      {stat.desc}
                    </span>
                  </div>
                ))}
              </div>

              {/* Full lists columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Visits log list */}
                <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-4 shadow-xs">
                  <h3 className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase">
                    Recent Activity Logs
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[9px] font-black tracking-widest text-slate-500 uppercase bg-slate-50/50">
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3">Path</th>
                          <th className="py-2.5 px-3">Origin Referrer</th>
                          <th className="py-2.5 px-3">Country</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visits.slice(0, 10).map((v, idx) => {
                          const date = new Date(v.created_at);
                          return (
                            <tr key={v.id || idx} className="hover:bg-slate-50/30 text-slate-650">
                              <td className="py-3 px-3 font-semibold text-slate-400">
                                {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-900 truncate max-w-[120px]">
                                {v.path}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-500 truncate max-w-[100px] capitalize">
                                {v.referrer}
                              </td>
                              <td className="py-3 px-3 text-slate-500 font-semibold">
                                {v.country || "United States"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Country rankings */}
                <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-4 shadow-xs">
                  <h3 className="text-xs font-black tracking-[0.2em] text-slate-550 uppercase">
                    Visitor Geography
                  </h3>
                  <div className="flex flex-col gap-3">
                    {(() => {
                      const geoMap: Record<string, number> = {};
                      visits.forEach((v) => {
                        const geo = v.country || "United States";
                        geoMap[geo] = (geoMap[geo] || 0) + 1;
                      });
                      const sortedGeos = Object.entries(geoMap).sort((a, b) => b[1] - a[1]);
                      return sortedGeos.map(([country, count], idx) => {
                        const widthPct = Math.round((count / totalVisits) * 100) || 0;
                        return (
                          <div key={country} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-650">
                              <span>{idx + 1}. {country}</span>
                              <span className="text-slate-400">{count} views</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${widthPct}%` }} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 6: ORDERS WORKSPACE */}
          {activeTab === "orders" && (() => {
            const bankOrders = orders.filter((o) => o.payment_method === "bank_transfer");
            const awaitingReceipt = (o: Order) =>
              o.payment_method === "bank_transfer" && !o.payment_status && o.status !== "cancelled";
            const awaitingCount = orders.filter(awaitingReceipt).length;
            const visibleOrders = orderView === "bank_transfer" ? bankOrders : orders;

            return (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">

              {/* Order view sub-tabs */}
              <div className="flex gap-2 border-b border-slate-200/80">
                {([
                  { id: "all", label: "All Orders", count: orders.length },
                  { id: "bank_transfer", label: "Bank Transfer", count: awaitingCount },
                ] as const).map((view) => (
                  <button
                    key={view.id}
                    onClick={() => setOrderView(view.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 -mb-px border-0 border-b-2 bg-transparent text-xs font-black tracking-widest uppercase cursor-pointer transition-colors ${
                      orderView === view.id
                        ? "border-purple-600 text-purple-600"
                        : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    {view.label}
                    {view.id === "bank_transfer" ? (
                      view.count > 0 && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700" title="Awaiting bank slip">
                          {view.count} awaiting
                        </span>
                      )
                    ) : (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {view.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Showing {visibleOrders.length} {orderView === "bank_transfer" ? "Bank Transfer" : "Customer"} Orders
                </span>
                
                {/* Status Quick Stats pills */}
                <div className="flex flex-wrap gap-2">
                  {["all", "pending", "fulfilled", "shipped", "delivered", "cancelled"].map((filterState) => {
                    const count = filterState === "all" 
                      ? visibleOrders.length 
                      : visibleOrders.filter((o) => o.status === filterState).length;
                    return (
                      <span key={filterState} className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-2xl text-[11px] font-bold text-slate-500 capitalize shadow-2xs">
                        {filterState}: <span className="text-slate-900 font-extrabold">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Orders List Container */}
              <div className="flex flex-col gap-4">
                {visibleOrders.length === 0 ? (
                  <div className="bg-white border border-slate-200/80 rounded-[2rem] p-12 text-center text-slate-400 font-bold shadow-xs">
                    {orderView === "bank_transfer"
                      ? "No bank transfer orders yet."
                      : "No orders have been placed on the storefront yet."}
                  </div>
                ) : (
                  visibleOrders.map((order) => {
                    const date = new Date(order.created_at);
                    const isAwaitingReceipt = awaitingReceipt(order);
                    const hoursSinceOrder = Math.floor((Date.now() - date.getTime()) / 3_600_000);
                    
                    // Colors for status pills
                    const statusColors = {
                      pending: "bg-amber-50 border-amber-200 text-amber-700",
                      fulfilled: "bg-blue-50 border-blue-200 text-blue-700",
                      shipped: "bg-indigo-50 border-indigo-200 text-indigo-700",
                      delivered: "bg-emerald-50 border-emerald-200 text-emerald-700",
                      cancelled: "bg-red-50 border-red-200 text-red-700",
                    };

                    return (
                      <div key={order.id} className="bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col md:flex-row justify-between gap-6 hover:border-slate-350 transition-all duration-300 shadow-xs">
                        {/* Left: Customer info & Items details */}
                        <div className="flex-grow flex flex-col gap-4 text-left">
                          
                          {/* Order Reference details */}
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-extrabold text-slate-900 text-base font-inter">{order.id}</span>
                            <span className="text-xs text-slate-400 font-bold">
                              {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                            <span className={`text-[9px] font-black tracking-widest px-3 py-0.5 rounded-full border uppercase ${statusColors[order.status] || ""}`}>
                              {order.status}
                            </span>
                          </div>

                          {/* Customer Billing/Shipping Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-y border-slate-100 py-3 text-xs text-slate-500 font-semibold">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Customer details</span>
                              <span className="text-slate-800 font-extrabold">{order.customer_name}</span>
                              <span className="text-slate-400 font-normal">{order.customer_email}</span>
                              {order.phone_number && <span className="text-slate-500 font-normal">{order.phone_number}</span>}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Shipping Address</span>
                              <span className="text-slate-800 font-extrabold truncate">{order.shipping_address}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Payment Method</span>
                              <span className="text-slate-850 font-extrabold uppercase text-[10px]">
                                {order.payment_method === "bank_transfer" ? "Bank Transfer" : "Cash on Delivery"}
                              </span>
                              {order.payment_method === "bank_transfer" && (
                                <span className={`self-start mt-1 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full border uppercase ${
                                  order.payment_status === "receipt_received"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : order.payment_status === "receipt_not_received"
                                    ? "bg-red-50 border-red-200 text-red-700"
                                    : "bg-amber-50 border-amber-200 text-amber-700"
                                }`}>
                                  {order.payment_status === "receipt_received"
                                    ? "Slip received"
                                    : order.payment_status === "receipt_not_received"
                                    ? "Slip not received"
                                    : "Awaiting slip"}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Order Products items */}
                          <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Items Ordered</span>
                            <div className="flex flex-col gap-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 px-3.5 rounded-xl border border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700">{item.name}</span>
                                    <span className="text-[10px] font-bold text-slate-400 font-mono">({item.color})</span>
                                  </div>
                                  <div className="text-xs font-semibold text-slate-500">
                                    {item.quantity}x • {
                                      typeof item.price === "string"
                                        ? (item.price.startsWith("$")
                                            ? `Rs. ${Math.round(parseFloat(item.price.replace(/[^0-9.]/g, "")) || 0).toLocaleString()}`
                                            : item.price)
                                        : `Rs. ${Math.round(item.price || 0).toLocaleString()}`
                                    }
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>

                        {/* Right: Total & Transition Actions */}
                        <div className="md:w-56 shrink-0 flex flex-col justify-between items-end text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[9px] font-black tracking-widest text-slate-450 uppercase">Total Amount</span>
                            <span className="text-2xl font-black text-purple-650 font-inter">Rs. {Math.round(order.total_amount).toLocaleString()}</span>
                            {order.delivery_zone && (
                              <span className="text-[10px] font-bold text-slate-400">
                                incl. delivery {formatDeliveryFee(Number(order.delivery_fee) || 0)} · {order.delivery_zone}
                              </span>
                            )}
                            {order.discount_code && Number(order.discount_amount) > 0 && (
                              <span className="text-[10px] font-bold text-emerald-600">
                                code {order.discount_code} · − Rs. {Math.round(Number(order.discount_amount)).toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* Action Buttons to Fulfill / Ship / Deliver */}
                          <div className="w-full flex flex-col gap-2 mt-4">
                            {/* Bank transfer: confirm the slip before the order can be fulfilled */}
                            {isAwaitingReceipt && (
                              <div className="w-full flex flex-col gap-2 bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3">
                                <span className="text-[9px] font-black tracking-widest text-amber-700 uppercase text-center">
                                  Receipt received?
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => handleReviewBankReceipt(order, true)}
                                    disabled={reviewingReceiptId === order.id}
                                    title="Bank slip received — email customer and proceed"
                                    aria-label="Bank slip received"
                                    className="flex items-center justify-center py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleReviewBankReceipt(order, false)}
                                    disabled={reviewingReceiptId === order.id}
                                    title="Bank slip NOT received — cancel order and email customer"
                                    aria-label="Bank slip not received"
                                    className="flex items-center justify-center py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white border-0 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                                <span className={`text-[10px] font-bold text-center ${hoursSinceOrder >= 24 ? "text-red-600" : "text-slate-500"}`}>
                                  {hoursSinceOrder >= 24
                                    ? `Placed ${hoursSinceOrder}h ago — over 24h`
                                    : `Placed ${hoursSinceOrder}h ago`}
                                </span>
                              </div>
                            )}

                            {order.status === "cancelled" && (
                              <div className="w-full flex items-center justify-center gap-1.5 py-3.5 text-red-600 text-xs font-black tracking-widest uppercase bg-red-50 border border-red-200/80 rounded-full select-none">
                                CANCELLED
                              </div>
                            )}

                            {order.status === "pending" && !isAwaitingReceipt && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, "fulfilled")}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black tracking-widest py-3.5 rounded-full cursor-pointer transition-all border-0 shadow-md shadow-blue-500/10"
                              >
                                FULFILL ORDER
                              </button>
                            )}

                            {order.status === "fulfilled" && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, "shipped")}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black tracking-widest py-3.5 rounded-full cursor-pointer transition-all border-0 shadow-md shadow-indigo-500/10"
                              >
                                SHIP ORDER
                              </button>
                            )}

                            {order.status === "shipped" && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, "delivered")}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black tracking-widest py-3.5 rounded-full cursor-pointer transition-all border-0 shadow-md shadow-emerald-500/10"
                              >
                                DELIVER ORDER
                              </button>
                            )}

                            {order.status === "delivered" && (
                              <div className="w-full flex items-center justify-center gap-1.5 py-3.5 text-emerald-600 text-xs font-black tracking-widest uppercase bg-emerald-50 border border-emerald-200/80 rounded-full shadow-inner select-none">
                                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                COMPLETED
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>
            );
          })()}

          {/* TAB: DISCOUNT CODES */}
          {activeTab === "discounts" && (() => {
            const t = discountForm.discount_type;
            const isPercent = t === "percent_order" || t === "percent_product";
            const showValue = t !== "buy_x_get_y" && t !== "free_delivery";
            const showProducts = t === "percent_product" || t === "fixed_product" || t === "buy_x_get_y";
            const inputCls = "bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500/80 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none transition-all w-full";
            const labelCls = "text-[9px] font-black tracking-widest text-slate-400 uppercase ml-1";
            const statusOf = (row: DiscountCodeRow) => {
              const problem = codeAvailabilityError(row);
              if (!problem) return { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
              if (!row.is_active) return { label: "Paused", cls: "bg-slate-100 text-slate-500 border-slate-200" };
              if (problem.includes("not active yet")) return { label: "Scheduled", cls: "bg-blue-50 text-blue-700 border-blue-200" };
              if (problem.includes("expired")) return { label: "Expired", cls: "bg-red-50 text-red-600 border-red-200" };
              return { label: "Used up", cls: "bg-amber-50 text-amber-700 border-amber-200" };
            };
            return (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">

              {/* Left: create / edit */}
              <form onSubmit={handleSaveDiscount} className="xl:col-span-5 bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-4 shadow-xs text-left">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase">
                    {editingDiscountId ? "Edit Discount Code" : "Create Discount Code"}
                  </h3>
                  {editingDiscountId && (
                    <button type="button" onClick={resetDiscountForm} className="text-[10px] font-bold text-slate-400 hover:text-slate-800 bg-transparent border-0 cursor-pointer uppercase tracking-widest">
                      Cancel edit
                    </button>
                  )}
                </div>

                {saveStatus && (
                  <div className="bg-purple-50 border border-purple-100 text-purple-600 text-xs font-semibold px-4 py-3 rounded-2xl text-center">
                    {saveStatus.toUpperCase()}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className={labelCls}>Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={discountForm.code}
                      onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
                      placeholder="e.g. SAVE30"
                      maxLength={40}
                      className={`${inputCls} font-black tracking-widest uppercase`}
                    />
                    <button
                      type="button"
                      onClick={() => setDiscountForm({ ...discountForm, code: generateDiscountCode() })}
                      className="shrink-0 bg-white hover:bg-purple-50 text-purple-600 border border-purple-200 text-[10px] font-black tracking-widest px-4 rounded-2xl cursor-pointer"
                    >
                      GENERATE
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className={labelCls}>Discount type</label>
                  <select
                    value={t}
                    onChange={(e) => setDiscountForm({ ...discountForm, discount_type: e.target.value as DiscountType })}
                    className={inputCls}
                  >
                    {(Object.keys(DISCOUNT_TYPE_LABELS) as DiscountType[]).map((key) => (
                      <option key={key} value={key}>{DISCOUNT_TYPE_LABELS[key]}</option>
                    ))}
                  </select>
                </div>

                {showValue && (
                  <div className="flex flex-col gap-2">
                    <label className={labelCls}>{isPercent ? "Percentage off (%)" : t === "fixed_product" ? "Rs. off each unit" : "Rs. off the order"}</label>
                    <input
                      type="number"
                      min={0}
                      max={isPercent ? 100 : undefined}
                      step="any"
                      required
                      value={discountForm.value}
                      onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                      placeholder={isPercent ? "e.g. 30" : "e.g. 500"}
                      className={inputCls}
                    />
                  </div>
                )}

                {t === "buy_x_get_y" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <label className={labelCls}>Customer buys</label>
                      <input type="number" min={1} step={1} value={discountForm.buy_qty} onChange={(e) => setDiscountForm({ ...discountForm, buy_qty: e.target.value })} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className={labelCls}>Gets free</label>
                      <input type="number" min={1} step={1} value={discountForm.get_qty} onChange={(e) => setDiscountForm({ ...discountForm, get_qty: e.target.value })} className={inputCls} />
                    </div>
                    <span className="col-span-2 text-[10px] text-slate-400 ml-1">
                      Counted per product: with Buy 1 Get 1, every 2 of the same product = 1 free.
                    </span>
                  </div>
                )}

                {showProducts && (
                  <div className="flex flex-col gap-2">
                    <label className={labelCls}>
                      {t === "buy_x_get_y" ? "Products (leave empty = all products)" : "Products this applies to"}
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 flex flex-col gap-1 bg-slate-50">
                      {products.length === 0 && <span className="text-[11px] text-slate-400 p-2">No products yet.</span>}
                      {products.map((p) => {
                        const checked = discountForm.product_ids.includes(p.id);
                        return (
                          <label key={p.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer text-xs font-semibold ${checked ? "bg-purple-50 text-purple-700" : "text-slate-600 hover:bg-white"}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setDiscountForm({
                                ...discountForm,
                                product_ids: checked ? discountForm.product_ids.filter((id) => id !== p.id) : [...discountForm.product_ids, p.id],
                              })}
                            />
                            <span className="truncate">{p.name}</span>
                            <span className="ml-auto text-[10px] text-slate-400 shrink-0">{p.price}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className={labelCls}>Minimum order (Rs.)</label>
                    <input type="number" min={0} step="any" value={discountForm.min_subtotal} onChange={(e) => setDiscountForm({ ...discountForm, min_subtotal: e.target.value })} placeholder="None" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={labelCls}>Usage limit</label>
                    <input type="number" min={1} step={1} value={discountForm.max_uses} onChange={(e) => setDiscountForm({ ...discountForm, max_uses: e.target.value })} placeholder="Unlimited" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={labelCls}>Starts (optional)</label>
                    <input type="datetime-local" value={discountForm.starts_at} onChange={(e) => setDiscountForm({ ...discountForm, starts_at: e.target.value })} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={labelCls}>Ends (optional)</label>
                    <input type="datetime-local" value={discountForm.expires_at} onChange={(e) => setDiscountForm({ ...discountForm, expires_at: e.target.value })} className={inputCls} />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className={labelCls}>Description shown to customers (optional)</label>
                  <input
                    type="text"
                    value={discountForm.description}
                    onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                    placeholder={describeDiscount({ discount_type: t, value: Number(discountForm.value) || 0, buy_qty: Number(discountForm.buy_qty) || 1, get_qty: Number(discountForm.get_qty) || 1 })}
                    maxLength={120}
                    className={inputCls}
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer ml-1">
                  <input type="checkbox" checked={discountForm.is_active} onChange={(e) => setDiscountForm({ ...discountForm, is_active: e.target.checked })} />
                  Active (customers can use it)
                </label>

                <button
                  type="submit"
                  disabled={savingDiscount}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-black tracking-widest py-3.5 rounded-full cursor-pointer transition-all border-0 shadow-md shadow-purple-600/15 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {savingDiscount ? "SAVING..." : editingDiscountId ? "SAVE CHANGES" : "CREATE CODE"}
                </button>
              </form>

              {/* Right: existing codes */}
              <div className="xl:col-span-7 flex flex-col gap-3 text-left">
                <span className="text-xs font-bold text-slate-400 uppercase">{discountCodes.length} Discount Codes</span>
                {discountCodes.length === 0 ? (
                  <div className="bg-white border border-slate-200/80 rounded-[2rem] p-12 text-center text-slate-400 font-bold shadow-xs">
                    No discount codes yet. Create one on the left.
                  </div>
                ) : (
                  discountCodes.map((row) => {
                    const status = statusOf(row);
                    const productNames = (row.product_ids || []).map((id) => products.find((p) => p.id === id)?.name || id);
                    return (
                      <div key={row.id} className={`bg-white border rounded-[1.5rem] p-5 flex flex-col gap-3 shadow-xs ${editingDiscountId === row.id ? "border-purple-400" : "border-slate-200/80"}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-slate-900 tracking-widest text-sm font-mono">{row.code}</span>
                          <span className={`text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full border uppercase ${status.cls}`}>{status.label}</span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard?.writeText(row.code)}
                            className="text-[10px] font-bold text-slate-400 hover:text-purple-600 bg-transparent border-0 cursor-pointer"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="text-xs font-bold text-slate-700">
                          {row.description || describeDiscount({ ...row, value: Number(row.value) })}
                          {productNames.length > 0 && (
                            <span className="font-semibold text-slate-400"> · {productNames.join(", ")}</span>
                          )}
                          {row.discount_type === "buy_x_get_y" && productNames.length === 0 && (
                            <span className="font-semibold text-slate-400"> · all products</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-400">
                          <span>Used {row.used_count}{row.max_uses ? ` / ${row.max_uses}` : ""}</span>
                          {Number(row.min_subtotal) > 0 && <span>Min. order Rs. {Math.round(Number(row.min_subtotal)).toLocaleString()}</span>}
                          {row.starts_at && <span>From {new Date(row.starts_at).toLocaleString()}</span>}
                          {row.expires_at && <span>Until {new Date(row.expires_at).toLocaleString()}</span>}
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleEditDiscount(row)} className="text-[10px] font-black tracking-widest px-3.5 py-2 rounded-full bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 cursor-pointer">EDIT</button>
                          <button type="button" onClick={() => handleToggleDiscount(row)} className="text-[10px] font-black tracking-widest px-3.5 py-2 rounded-full bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 cursor-pointer">{row.is_active ? "PAUSE" : "ACTIVATE"}</button>
                          <button type="button" onClick={() => handleDeleteDiscount(row)} className="text-[10px] font-black tracking-widest px-3.5 py-2 rounded-full bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 cursor-pointer">DELETE</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            );
          })()}

          {/* TAB: DELIVERY CHARGES */}
          {activeTab === "delivery" && (() => {
            const previewRates = normalizeDeliveryRates(deliveryRatesForm);
            const productsWithoutWeight = products.filter((p) => !p.weightGrams);
            return (
            <div className="max-w-3xl flex flex-col gap-6 animate-in fade-in duration-300">
              <form
                onSubmit={handleSaveDeliveryRates}
                className="bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-5 shadow-xs text-left"
              >
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase">
                    Weight-Based Delivery Rates
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    The delivery charge is calculated from the total weight of the order (each product&apos;s weight × quantity). Set each product&apos;s weight in grams when adding or editing it.
                  </p>
                </div>

                {saveStatus && (
                  <div className="bg-purple-50 border border-purple-100 text-purple-600 text-xs font-semibold px-4 py-3 rounded-2xl text-center">
                    {saveStatus.toUpperCase()}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {([
                    { key: "base_fee", label: "Base charge (Rs.)", hint: "For orders up to the included weight" },
                    { key: "base_weight_grams", label: "Included weight (grams)", hint: "1000 g = 1 kg" },
                    { key: "extra_fee_per_kg", label: "Each extra kg (Rs.)", hint: "Per kg or part of a kg above" },
                  ] as const).map((field) => (
                    <div key={field.key} className="flex flex-col gap-2">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase ml-1">
                        {field.label}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        required
                        value={deliveryRatesForm[field.key]}
                        onChange={(e) => setDeliveryRatesForm({ ...deliveryRatesForm, [field.key]: e.target.value })}
                        className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500/80 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none transition-all"
                      />
                      <span className="text-[10px] text-slate-400 ml-1">{field.hint}</span>
                    </div>
                  ))}
                </div>

                {/* Free delivery offer */}
                <div className={`rounded-2xl p-4 flex flex-col gap-3 border ${deliveryRatesForm.free_delivery_enabled ? "bg-emerald-50/60 border-emerald-200" : "bg-slate-50 border-slate-200/80"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black tracking-widest text-slate-700 uppercase">Free delivery offer</span>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        When on, orders that reach the minimum basket amount (after discount codes) get free delivery. Turn it off when the offer ends.
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={deliveryRatesForm.free_delivery_enabled}
                      onClick={() => setDeliveryRatesForm({ ...deliveryRatesForm, free_delivery_enabled: !deliveryRatesForm.free_delivery_enabled })}
                      className={`relative shrink-0 w-12 h-7 rounded-full border-0 cursor-pointer transition-colors ${deliveryRatesForm.free_delivery_enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${deliveryRatesForm.free_delivery_enabled ? "left-6" : "left-1"}`} />
                      <span className="sr-only">Toggle free delivery offer</span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-w-xs">
                    <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase ml-1">
                      Minimum basket for free delivery (Rs.)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      required
                      value={deliveryRatesForm.free_delivery_min_subtotal}
                      onChange={(e) => setDeliveryRatesForm({ ...deliveryRatesForm, free_delivery_min_subtotal: e.target.value })}
                      className="bg-white border border-slate-200 focus:border-purple-500/80 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none transition-all"
                    />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${deliveryRatesForm.free_delivery_enabled ? "text-emerald-700" : "text-slate-400"}`}>
                    {deliveryRatesForm.free_delivery_enabled
                      ? `ON — orders of Rs. ${Number(deliveryRatesForm.free_delivery_min_subtotal || 0).toLocaleString()}+ ship free (press Save)`
                      : "OFF — normal delivery charges apply"}
                  </span>
                </div>

                {/* Worked examples with the current (unsaved) values */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2">
                  <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Examples</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[800, 1000, 1500, 2000, 3200].map((g) => (
                      <div key={g} className="bg-white border border-slate-200/80 rounded-xl px-3 py-2 flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400">{formatWeight(g)}</span>
                        <span className="text-xs font-black text-slate-900">{formatDeliveryFee(calculateDeliveryFee(g, previewRates))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingDeliveryRates}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-black tracking-widest py-3.5 rounded-full cursor-pointer transition-all border-0 shadow-md shadow-purple-600/15 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {savingDeliveryRates ? "SAVING..." : "SAVE DELIVERY RATES"}
                </button>
              </form>

              {productsWithoutWeight.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex flex-col gap-3 text-left">
                  <h3 className="text-xs font-black tracking-[0.2em] text-amber-700 uppercase">
                    {productsWithoutWeight.length} product{productsWithoutWeight.length === 1 ? "" : "s"} without a weight
                  </h3>
                  <p className="text-[11px] text-amber-700/80 font-semibold">
                    These count as 0 g, so orders containing only these products are charged the base rate. Click one to add its weight.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {productsWithoutWeight.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleEditProduct(p)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white border border-amber-200 text-amber-800 hover:border-amber-400 cursor-pointer"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          {/* TAB: BANK TRANSFER DETAILS */}
          {activeTab === "bank-transfer" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">

              {/* Left: Edit form */}
              <form
                onSubmit={handleSavePaymentSettings}
                className="lg:col-span-7 bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-5 shadow-xs text-left"
              >
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase">
                    Bank Transfer Details
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    Shown to customers who choose Bank Transfer at checkout and in their order confirmation email.
                  </p>
                </div>

                {saveStatus && (
                  <div className="bg-purple-50 border border-purple-100 text-purple-600 text-xs font-semibold px-4 py-3 rounded-2xl text-center">
                    {saveStatus.toUpperCase()}
                  </div>
                )}

                {([
                  { key: "bank_name", label: "Bank Name", placeholder: "e.g. Commercial Bank" },
                  { key: "account_name", label: "Account Name", placeholder: "e.g. PluggedIn (Pvt) Ltd" },
                  { key: "account_number", label: "Account Number", placeholder: "e.g. 1234567890" },
                  { key: "branch", label: "Branch", placeholder: "e.g. Colombo 03" },
                ] as const).map((field) => (
                  <div key={field.key} className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase ml-1">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={paymentSettings[field.key]}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      maxLength={120}
                      className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500/80 rounded-2xl px-4 py-3.5 text-xs font-semibold text-slate-900 focus:outline-none transition-all"
                    />
                  </div>
                ))}

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase ml-1">
                    Note (shown below the bank details)
                  </label>
                  <textarea
                    value={paymentSettings.payment_note}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, payment_note: e.target.value })}
                    placeholder="e.g. Send a photo of your bank slip with your Order ID to WhatsApp 07X XXX XXXX"
                    rows={3}
                    maxLength={500}
                    className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500/80 rounded-2xl px-4 py-3.5 text-xs font-semibold text-slate-900 focus:outline-none transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPaymentSettings}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-black tracking-widest py-4 rounded-full cursor-pointer transition-all border-0 shadow-md shadow-purple-600/15 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {savingPaymentSettings ? "SAVING..." : "SAVE BANK DETAILS"}
                </button>
              </form>

              {/* Right: Checkout preview */}
              <div className="lg:col-span-5 flex flex-col gap-3 text-left">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase ml-1">
                  Checkout Preview
                </span>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 shadow-xs">
                  <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Beneficiary Bank Account</span>
                  <div className="flex flex-col gap-1 text-[11px] text-slate-600 font-semibold">
                    {([
                      ["Bank Name", paymentSettings.bank_name],
                      ["Account Name", paymentSettings.account_name],
                      ["Account Number", paymentSettings.account_number],
                      ["Branch", paymentSettings.branch],
                    ] as const).filter(([, value]) => value).map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-3">
                        <span>{label}:</span>
                        <span className="text-slate-950 font-extrabold text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                  {paymentSettings.payment_note && (
                    <p className="text-[11px] text-slate-700 font-semibold leading-relaxed border-t border-slate-200/60 pt-2 mt-1 whitespace-pre-line">
                      {paymentSettings.payment_note}
                    </p>
                  )}
                  <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                    {BANK_RECEIPT_DEADLINE_NOTICE}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CONTACT INQUIRIES WORKSPACE */}
          {activeTab === "contact-inquiries" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Showing {contactInquiries.length} Inquiries
                </span>
              </div>

              {/* Table List of inquiries */}
              <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-xs">
                {contactInquiries.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-bold">
                    No contact inquiries found.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-black tracking-widest text-slate-500 uppercase bg-slate-50/50">
                        <th className="py-4 px-6">Sender</th>
                        <th className="py-4 px-6">Reason</th>
                        <th className="py-4 px-6">Message Preview</th>
                        <th className="py-4 px-6">Date</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {contactInquiries.map((inq) => {
                        const date = new Date(inq.created_at);
                        const reasonLabels: Record<string, string> = {
                          general_inquiries: "General Inquiries",
                          product_inquiries: "Product Inquiries",
                          shipping_inquiries: "Shipping Inquiries"
                        };
                        const reasonColors: Record<string, string> = {
                          general_inquiries: "bg-blue-50 border-blue-200/80 text-blue-700",
                          product_inquiries: "bg-purple-50 border-purple-200/80 text-purple-700",
                          shipping_inquiries: "bg-amber-50 border-amber-200/80 text-amber-700"
                        };

                        return (
                          <tr 
                            key={inq.id} 
                            onClick={() => setActiveInquiry(inq)}
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                          >
                            <td className="py-4 px-6">
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-800 group-hover:text-purple-650 transition-colors">{inq.name}</span>
                                <span className="text-[10px] font-semibold text-slate-400 font-mono">{inq.email}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full border uppercase ${reasonColors[inq.reason] || "bg-slate-50 border-slate-200 text-slate-600"}`}>
                                {reasonLabels[inq.reason] || inq.reason}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-500 font-medium max-w-xs truncate">
                              {inq.message}
                            </td>
                            <td className="py-4 px-6 text-slate-400 font-bold text-xs">
                              {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </td>
                            <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setActiveInquiry(inq)}
                                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleDeleteInquiry(inq.id)}
                                  className="bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 text-slate-400 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          )}

          {/* INQUIRY DETAIL MODAL OVERLAY */}
          {activeInquiry && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
              <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl relative text-left mx-6 animate-in zoom-in-95 duration-200">
                
                {/* Header info */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black tracking-widest text-purple-650 uppercase">
                      Inquiry Details
                    </span>
                    <h3 className="text-lg font-black text-slate-900 font-inter uppercase">
                      {activeInquiry.name}
                    </h3>
                    <a href={`mailto:${activeInquiry.email}`} className="text-xs font-semibold text-slate-400 hover:text-purple-655 transition-colors font-mono">
                      {activeInquiry.email}
                    </a>
                  </div>
                  <button
                    onClick={() => setActiveInquiry(null)}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-colors text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Details layout */}
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500 border-b border-slate-100 pb-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Reason</span>
                      <span className="text-slate-800 font-extrabold uppercase text-[10px]">
                        {activeInquiry.reason.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Submitted At</span>
                      <span className="text-slate-800 font-extrabold">
                        {new Date(activeInquiry.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Message</span>
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-xs font-medium text-slate-700 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap font-sans">
                      {activeInquiry.message}
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="flex gap-4 mt-6 border-t border-slate-100 pt-4">
                  <a
                    href={`mailto:${activeInquiry.email}?subject=Re: PluggedIn Inquiry`}
                    className="flex-grow bg-slate-900 hover:bg-slate-800 text-white text-xs font-black tracking-widest py-3.5 rounded-full transition-all cursor-pointer border-0 shadow-sm text-center block font-inter"
                  >
                    REPLY VIA EMAIL
                  </a>
                  <button
                    onClick={() => handleDeleteInquiry(activeInquiry.id)}
                    className="bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 text-slate-500 px-6 py-3.5 rounded-full text-xs font-bold cursor-pointer transition-all"
                  >
                    Delete Inquiry
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 8: OFFER SECTION WORKSPACE */}
          {activeTab === "offer-section" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
              
              {/* Left Form: Add Offer Text */}
              <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-6 shadow-xs text-left">
                <h3 className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase">
                  Add Marquee Offer
                </h3>

                <form onSubmit={handleAddOffer} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase ml-1">
                      Offer Text (Sales, discounts, codes)
                    </label>
                    <input
                      type="text"
                      required
                      value={newOfferText}
                      onChange={(e) => setNewOfferText(e.target.value)}
                      placeholder="e.g. FLASH SALE: 15% OFF SITEWIDE"
                      className="bg-slate-50 border border-slate-250 focus:bg-white focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-2xl px-4 py-3.5 text-xs font-semibold text-slate-900 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase ml-1">
                      Target Scroll Row
                    </label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => setNewOfferRow(1)}
                        className={`py-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                          newOfferRow === 1
                            ? "bg-purple-50 border-purple-500 text-purple-650"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-350 hover:text-slate-650"
                        }`}
                      >
                        Row 1 (Top Row)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewOfferRow(2)}
                        className={`py-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                          newOfferRow === 2
                            ? "bg-purple-50 border-purple-500 text-purple-650"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-350 hover:text-slate-650"
                        }`}
                      >
                        Row 2 (Bottom Row)
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingOffer}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black tracking-widest py-4.5 rounded-full mt-2 transition-all cursor-pointer border-0 shadow-sm flex items-center justify-center gap-2"
                  >
                    {savingOffer ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      "ADD TO MARQUEE"
                    )}
                  </button>
                </form>
              </div>

              {/* Right Side: Row 1 & Row 2 items list */}
              <div className="lg:col-span-8 flex flex-col gap-6 text-left">
                
                {/* Row 1 Manager */}
                <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-4 shadow-xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black tracking-[0.2em] text-slate-550 uppercase flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                      Row 1 Offers (Top Scroll)
                    </h3>
                    <span className="text-[10px] font-bold text-slate-405">
                      {marqueeOffers.filter((o) => o.row_number === 1).length} items
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                    {marqueeOffers.filter((o) => o.row_number === 1).length === 0 ? (
                      <span className="text-xs text-slate-400 font-semibold p-4 text-center">No Row 1 items created yet.</span>
                    ) : (
                      marqueeOffers.filter((o) => o.row_number === 1).map((offer) => (
                        <div key={offer.id} className="flex justify-between items-center bg-slate-50/50 border border-slate-200/80 p-3 px-4 rounded-xl hover:border-slate-300 transition-colors">
                          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase font-inter truncate max-w-[85%]">{offer.text}</span>
                          <button
                            onClick={() => handleDeleteOffer(offer.id)}
                            className="bg-transparent hover:bg-red-50 text-slate-400 hover:text-red-650 border-0 p-1.5 rounded-lg transition-colors cursor-pointer text-xs font-black"
                            title="Delete offer"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Row 2 Manager */}
                <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-4 shadow-xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black tracking-[0.2em] text-slate-550 uppercase flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-950 animate-pulse" />
                      Row 2 Offers (Bottom Scroll)
                    </h3>
                    <span className="text-[10px] font-bold text-slate-405">
                      {marqueeOffers.filter((o) => o.row_number === 2).length} items
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                    {marqueeOffers.filter((o) => o.row_number === 2).length === 0 ? (
                      <span className="text-xs text-slate-400 font-semibold p-4 text-center">No Row 2 items created yet.</span>
                    ) : (
                      marqueeOffers.filter((o) => o.row_number === 2).map((offer) => (
                        <div key={offer.id} className="flex justify-between items-center bg-slate-50/50 border border-slate-200/80 p-3 px-4 rounded-xl hover:border-slate-300 transition-colors">
                          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase font-inter truncate max-w-[85%]">{offer.text}</span>
                          <button
                            onClick={() => handleDeleteOffer(offer.id)}
                            className="bg-transparent hover:bg-red-50 text-slate-400 hover:text-red-655 border-0 p-1.5 rounded-lg transition-colors cursor-pointer text-xs font-black"
                            title="Delete offer"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ================= HERO BANNERS TAB ================= */}
          {activeTab === "hero-banners" && (
            <div className="flex flex-col gap-8 text-left animate-in fade-in duration-300">
              
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-xs">
                <div>
                  <span className="text-[9px] font-black tracking-[0.25em] text-purple-600 uppercase">
                    Homepage Customization
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-syne mt-0.5">
                    Hero Section Banners
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Upload and manage up to 5 custom banners for the storefront 3/4 hero carousel.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200/40">
                    {heroBanners.length} / 5 Banners Active
                  </span>
                  <button
                    onClick={handleOpenAddBannerModal}
                    disabled={heroBanners.length >= 5}
                    className={`px-5 py-3 rounded-full text-xs font-extrabold tracking-wider transition-all cursor-pointer border-0 shadow-md flex items-center gap-2 ${
                      heroBanners.length >= 5
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                        : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20 hover:scale-105 active:scale-95"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>ADD HERO BANNER</span>
                  </button>
                </div>
              </div>

              {/* Banners Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {heroBanners.map((banner, index) => (
                  <div 
                    key={banner.id} 
                    className={`bg-white border rounded-[2rem] overflow-hidden flex flex-col justify-between shadow-xs transition-all duration-200 relative group ${
                      banner.is_active ? "border-slate-200/80 hover:border-purple-300 hover:shadow-lg" : "border-slate-200 opacity-60 bg-slate-50/50"
                    }`}
                  >
                    {/* Image Preview & Overlay */}
                    <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                      {(banner.image_url || banner.mobile_image_url) ? (
                        <img 
                          src={banner.image_url || banner.mobile_image_url} 
                          alt={banner.title || "Hero banner"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          No image
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      {/* Mobile image thumbnail */}
                      <div className="absolute bottom-3 right-3 z-10 flex flex-col items-center gap-1">
                        {banner.mobile_image_url ? (
                          <img
                            src={banner.mobile_image_url}
                            alt={`${banner.title} (mobile)`}
                            className="w-12 h-20 object-cover rounded-lg border-2 border-white/80 shadow-lg"
                          />
                        ) : null}
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-black/60 text-white uppercase tracking-wider">
                          {banner.mobile_image_url ? "Mobile" : "No mobile img"}
                        </span>
                      </div>
                      
                      {/* Badge Pill Overlay */}
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                        <span className="text-[9px] font-bold px-2.5 py-1 bg-black/60 backdrop-blur-md text-white rounded-full border border-white/20 uppercase tracking-wider">
                          Order #{banner.sort_order || index + 1}
                        </span>
                        <button
                          onClick={() => handleToggleBannerActive(banner.id, banner.is_active)}
                          className={`text-[9px] font-extrabold px-3 py-1 rounded-full border cursor-pointer transition-all ${
                            banner.is_active
                              ? "bg-emerald-500/90 text-white border-emerald-400"
                              : "bg-amber-500/90 text-white border-amber-400"
                          }`}
                        >
                          {banner.is_active ? "ACTIVE" : "HIDDEN"}
                        </button>
                      </div>

                      <div className="absolute bottom-3 left-4 right-4 z-10 text-left">
                        <span className="text-[9px] font-bold text-purple-300 uppercase tracking-widest block">
                          {banner.badge}
                        </span>
                        <h4 className="text-sm font-extrabold text-white uppercase font-syne line-clamp-1">
                          {banner.title || <span className="text-white/50 normal-case font-semibold">No title</span>}
                        </h4>
                      </div>
                    </div>

                    {/* Details Body */}
                    <div className="p-5 flex flex-col gap-3 text-left flex-1 justify-between">
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                        {banner.subtitle || "No subtitle provided"}
                      </p>

                      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 text-[10px] font-semibold text-slate-500">
                        <div className="flex justify-between items-center">
                          <span>Banner link:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[180px]">{banner.link_url || "None"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Primary CTA:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[180px]">{banner.primary_cta_text ? `${banner.primary_cta_text} (${banner.primary_cta_href || "/"})` : "Hidden"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Secondary CTA:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[180px]">{banner.secondary_cta_text ? `${banner.secondary_cta_text} (${banner.secondary_cta_href || "/"})` : "Hidden"}</span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-2">
                        <button
                          onClick={() => handleOpenEditBannerModal(banner)}
                          className="flex-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-650 text-slate-700 text-xs font-extrabold py-2.5 rounded-xl transition-colors cursor-pointer border-0 flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBanner(banner.id)}
                          className="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 p-2.5 rounded-xl transition-colors cursor-pointer border-0"
                          title="Delete banner"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Hero Banner Add / Edit Modal */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative text-left my-8">
            <button
              onClick={() => setIsBannerModalOpen(false)}
              className="absolute top-6 right-6 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full p-2.5 transition-colors cursor-pointer border-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <span className="text-[9px] font-black tracking-widest text-purple-600 uppercase">
                {editingBanner ? "Edit Banner" : "New Hero Banner (Max 5)"}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 font-syne">
                {editingBanner ? "Modify Hero Banner" : "Create Hero Banner"}
              </h3>
            </div>

            <form onSubmit={handleSaveBanner} className="flex flex-col gap-5">
              
              {/* Image Upload Areas: desktop + mobile (both optional) */}
              {([
                {
                  field: "image_url",
                  label: "Desktop Banner Image",
                  required: false,
                  hint: "Landscape, e.g. 1920 × 1080. Shown on tablets & desktops (and phones if no mobile image).",
                  previewClass: "h-44 w-full",
                },
                {
                  field: "mobile_image_url",
                  label: "Mobile Banner Image",
                  required: false,
                  hint: "Portrait, e.g. 1080 × 1350. Shown on phones. Leave empty to use the desktop image.",
                  previewClass: "h-56 w-40",
                },
              ] as const).map(({ field, label, required, hint, previewClass }) => (
                <div key={field} className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">
                    {label} {required ? <span className="text-red-500">*</span> : <span className="text-slate-400 normal-case tracking-normal font-semibold">(optional)</span>}
                  </label>
                  <span className="text-[10px] text-slate-400 -mt-1">{hint}</span>

                  {bannerForm[field] ? (
                    <div className={`relative ${previewClass} rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group`}>
                      <img src={bannerForm[field]} alt={`${label} preview`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <label className="bg-white text-slate-900 text-xs font-bold px-4 py-2 rounded-full cursor-pointer hover:bg-slate-100">
                          Change Image
                          <input type="file" accept="image/*" onChange={handleUploadBannerFile(field)} className="hidden" />
                        </label>
                        {!required && (
                          <button
                            type="button"
                            onClick={() => setBannerForm({ ...bannerForm, [field]: "" })}
                            className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full cursor-pointer hover:bg-red-600 border-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-250 hover:border-purple-400 bg-slate-50 hover:bg-purple-50/20 rounded-2xl p-6 text-center flex flex-col items-center justify-center transition-all cursor-pointer relative min-h-[120px]">
                      <input type="file" accept="image/*" onChange={handleUploadBannerFile(field)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-bold text-slate-700">Click to upload {field === "mobile_image_url" ? "mobile" : "desktop"} image</span>
                      <span className="text-[10px] text-slate-400 mt-1">PNG, JPG, WEBP recommended</span>
                    </div>
                  )}

                  {uploadingBannerImage === field && (
                    <span className="text-xs font-bold text-purple-600 animate-pulse">Uploading image file...</span>
                  )}
                </div>
              ))}

              <p className="text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 -mt-1">
                Uploaded images go live on the storefront once you press Save.
              </p>

              {/* Whole-banner click-through link */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">
                  Banner Link <span className="text-slate-400 normal-case tracking-normal font-semibold">(optional)</span>
                </label>
                <input
                  type="text"
                  inputMode="url"
                  value={bannerForm.link_url || ""}
                  onChange={(e) => setBannerForm({ ...bannerForm, link_url: e.target.value })}
                  placeholder="e.g. https://www.pluggedin.lk/product/your-product"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900"
                />
                <span className="text-[10px] text-slate-400">
                  Paste the full URL of the page to open when someone clicks the banner (e.g. copy it from the product page&apos;s address bar). Leave empty for no link.
                </span>
                {bannerForm.link_url?.trim() && !resolveBannerLink(bannerForm.link_url) && (
                  <span className="text-[10px] font-bold text-red-500">This doesn&apos;t look like a valid web address.</span>
                )}
              </div>

              {/* Title & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">
                    Banner Title
                  </label>
                  <input
                    type="text"
                    value={bannerForm.title || ""}
                    onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                    placeholder="e.g. ELEVATE YOUR SETUP"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={bannerForm.badge || ""}
                    onChange={(e) => setBannerForm({ ...bannerForm, badge: e.target.value })}
                    placeholder="e.g. ⚡ FAST ISLANDWIDE SHIPPING"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">
                  Subtitle Description
                </label>
                <textarea
                  rows={2}
                  value={bannerForm.subtitle || ""}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  placeholder="Brief subtitle text for the hero banner slide..."
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800"
                />
              </div>

              {/* Primary & Secondary CTAs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">
                    Primary CTA Text & Href
                  </label>
                  <input
                    type="text"
                    value={bannerForm.primary_cta_text || ""}
                    onChange={(e) => setBannerForm({ ...bannerForm, primary_cta_text: e.target.value })}
                    placeholder="SHOP CREATOR GEAR"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-900"
                  />
                  <input
                    type="text"
                    value={bannerForm.primary_cta_href || ""}
                    onChange={(e) => setBannerForm({ ...bannerForm, primary_cta_href: e.target.value })}
                    placeholder="/shop"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 text-[11px] text-slate-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">
                    Secondary CTA Text & Href
                  </label>
                  <input
                    type="text"
                    value={bannerForm.secondary_cta_text || ""}
                    onChange={(e) => setBannerForm({ ...bannerForm, secondary_cta_text: e.target.value })}
                    placeholder="EXPLORE COLLECTION"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-900"
                  />
                  <input
                    type="text"
                    value={bannerForm.secondary_cta_href || ""}
                    onChange={(e) => setBannerForm({ ...bannerForm, secondary_cta_href: e.target.value })}
                    placeholder="/shop?collection=trending"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 text-[11px] text-slate-600"
                  />
                </div>
              </div>

              {/* Order & Active Status */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">
                    Sort Order:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={bannerForm.sort_order || 1}
                    onChange={(e) => setBannerForm({ ...bannerForm, sort_order: parseInt(e.target.value) || 1 })}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-center"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bannerForm.is_active ?? true}
                    onChange={(e) => setBannerForm({ ...bannerForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-800">Banner Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-6 py-3 rounded-full text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBanner}
                  className="px-7 py-3 rounded-full text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 cursor-pointer border-0 shadow-md shadow-purple-600/20"
                >
                  {savingBanner ? "Saving..." : editingBanner ? "Update Hero Banner" : "Create Hero Banner"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
