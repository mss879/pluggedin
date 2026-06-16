import React from "react";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  slashedPrice: string;
  discount: string;
  description: string;
  color: string;
  icon?: React.ReactNode;
  images?: string[];
  tags?: string[];
  features?: string[];
  colors?: string[];
  metaTitle?: string;
}

export const getCategoryIcon = (category: string, id?: string): React.ReactNode => {
  const normCat = category.toLowerCase();
  const normId = id?.toLowerCase() || "";

  if (normCat === "home and kitchen") {
    if (normId.includes("light")) {
      return React.createElement(
        "svg",
        { className: "w-5 h-5 text-pink-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
        React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" })
      );
    }
    return React.createElement(
      "svg",
      { className: "w-5 h-5 text-purple-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" })
    );
  }

  if (normCat === "tech & gadgets") {
    if (normId.includes("keyboard")) {
      return React.createElement(
        "svg",
        { className: "w-5 h-5 text-blue-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
        React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" })
      );
    }
    if (normId.includes("charger") || normId.includes("power")) {
      return React.createElement(
        "svg",
        { className: "w-5 h-5 text-amber-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
        React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M13 10V3L4 14h7v7l9-11h-7z" })
      );
    }
    return React.createElement(
      "svg",
      { className: "w-5 h-5 text-slate-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M12 3a6 6 0 00-6 6v6a6 6 0 0012 0V9a6 6 0 00-6-6zm0 4v3" })
    );
  }

  if (normCat === "mobile & auto") {
    if (normId.includes("backpack") || normId.includes("bag")) {
      return React.createElement(
        "svg",
        { className: "w-5 h-5 text-emerald-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
        React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" })
      );
    }
    return React.createElement(
      "svg",
      { className: "w-5 h-5 text-purple-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM12 7v6" })
    );
  }

  if (normCat === "best sellers") {
    return React.createElement(
      "svg",
      { className: "w-5 h-5 text-purple-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.907a1 1 0 00.95-.69l1.519-4.674z" })
    );
  }

  if (normCat === "trending") {
    if (normId.includes("mic")) {
      return React.createElement(
        "svg",
        { className: "w-5 h-5 text-emerald-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
        React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" })
      );
    }
    return React.createElement(
      "svg",
      { className: "w-5 h-5 text-blue-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" })
    );
  }

  // Default fallback icon
  return React.createElement(
    "svg",
    { className: "w-5 h-5 text-purple-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" })
  );
};


export const getProductColors = (product: Product): string[] => {
  switch (product.category) {
    case "Best sellers":
      if (product.id === "headphones") {
        return ["Space Purple", "Matte Black", "Silver Gray"];
      }
      if (product.id === "keyboard") {
        return ["Onyx Black", "Chalk White", "Neon Purple"];
      }
      return ["Onyx Black", "Chalk White"];
    case "Tech & Gadgets":
      if (product.id === "riser") {
        return ["Silver Gray", "Charcoal Black"];
      }
      return ["Carbon Black", "Arctic White"];
    case "Mobile & Auto":
      if (product.id === "backpack") {
        return ["Slate Grey", "Onyx Black"];
      }
      return ["Matte Black", "Silver"];
    case "Home and kitchen":
      if (product.id === "lightbar") {
        return ["Matte Black", "Silver"];
      }
      return ["Onyx Black", "Lunar Grey"];
    case "Trending":
      if (product.id === "mic") {
        return ["Onyx Black", "Frost White", "Space Purple"];
      }
      return ["Onyx Black", "Lunar Grey"];
    default:
      return [product.color.charAt(0).toUpperCase() + product.color.slice(1)];
  }
};

export const getColorHex = (colorName: string): string => {
  const name = colorName.toLowerCase();
  if (name.includes("purple")) return "#8b5cf6";
  if (name.includes("slate") || name.includes("charcoal")) return "#475569";
  if (name.includes("grey") || name.includes("gray") || name.includes("ash")) return "#9ca3af";
  if (name.includes("black") || name.includes("onyx") || name.includes("carbon") || name.includes("midnight")) return "#18181b";
  if (name.includes("white") || name.includes("chalk") || name.includes("frost") || name.includes("arctic")) return "#f4f4f5";
  if (name.includes("silver") || name.includes("lunar")) return "#e4e4e7";
  if (name.includes("gold") || name.includes("amber")) return "#f59e0b";
  if (name.includes("emerald")) return "#10b981";
  if (name.includes("pink")) return "#ec4899";
  return "#a855f7"; // fallback purple
};

export const PRODUCT_FEATURES: Record<string, string[]> = {
  headphones: ["Active Noise Cancellation", "Studio-grade sound", "40-hour Battery"],
  charger: ["Fast Dual Charging", "Leather Surface", "MagSafe Compatible"],
  keyboard: ["Tactile Blue Switches", "Solid Wooden Frame", "Retro Keycaps"],
  sleeve: ["Water-resistant Canvas", "Multi-pocket Layout", "YKK Zippers"],
  lightbar: ["Anti-glare Design", "Music Sync Feature", "Smart Hue Control"],
  riser: ["Carbon Fiber Build", "Ergonomic Layout", "Non-slip Pads"],
  mouse: ["Smart Scroll Wheel", "Precision Sensor", "Silent Clicks"],
  speaker: ["Hi-Fi Audio Drivers", "Carbon Cone Woofers", "Wooden Cabinet"],
  webcam: ["4K Ultra HD Sensor", "Auto-framing Tech", "HDR Support"],
  mic: ["Cardioid Pattern", "Built-in Pop Filter", "RGB Live Indicator"],
  stand: ["Solid Aerospace Alum", "N52 Neodymium Magnets", "360° Rotation"],
  backpack: ["Weatherproof Exterior", "Luggage Pass-through", "Anti-theft Pocket"],
};
export const MOCK_PRODUCTS: Product[] = [
  {
    id: "headphones",
    name: "Pro Noise-Cancelling Headphones",
    category: "Best sellers",
    price: "Rs. 90,000",
    slashedPrice: "Rs. 120,000",
    discount: "25% OFF",
    description: "Studio-grade sound, ultimate comfort & active noise cancellation.",
    color: "purple",
    icon: React.createElement(
      "svg",
      { className: "w-5 h-5 text-purple-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" })
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
    icon: React.createElement(
      "svg",
      { className: "w-5 h-5 text-amber-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M13 10V3L4 14h7v7l9-11h-7z" })
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
    icon: React.createElement(
      "svg",
      { className: "w-5 h-5 text-blue-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" })
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
    icon: React.createElement(
      "svg",
      { className: "w-5 h-5 text-emerald-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" })
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
    icon: React.createElement(
      "svg",
      { className: "w-5 h-5 text-pink-650", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" })
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
    icon: React.createElement(
      "svg",
      { className: "w-5 h-5 text-slate-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" })
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
    icon: React.createElement(
      "svg",
      { className: "w-5 h-5 text-slate-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M12 3a6 6 0 00-6 6v6a6 6 0 0012 0V9a6 6 0 00-6-6zm0 4v3" })
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
    icon: React.createElement(
      "svg",
      { className: "w-5 h-5 text-purple-650", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" })
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
    icon: React.createElement(
      "svg",
      { className: "w-5 h-5 text-blue-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" })
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
    icon: React.createElement(
      "svg",
      { className: "w-5 h-5 text-emerald-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" })
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
    icon: React.createElement(
      "svg",
      { className: "w-5 h-5 text-amber-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM12 7v6" })
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
    icon: React.createElement(
      "svg",
      { className: "w-5 h-5 text-slate-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" })
    )
  }
];
