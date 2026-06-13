"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MOCK_PRODUCTS, getCategoryIcon, getColorHex, Product } from "@/app/products";

interface CartItem {
  product: Product;
  quantity: number;
  color: string;
}

export default function StickyNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isVisible, setIsVisible] = useState(pathname !== "/");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartAnimate, setCartAnimate] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchToast, setSearchToast] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Track whether we're on an admin page (checked after all hooks)
  const isAdminPage = pathname && pathname.startsWith("/admin");

  // On non-homepage routes, show the navbar immediately without any scroll
  useEffect(() => {
    if (pathname !== "/") {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [pathname]);

  // Monitor scrolling globally (only needed on homepage for the delayed reveal)
  useEffect(() => {
    const handleScroll = (e: Event) => {
      // On non-home pages the navbar is always visible; skip scroll checks
      if (pathname !== "/") return;

      const target = e.target as HTMLElement;
      let scrollTop = 0;

      // Scrollable div container (h-screen overflow-y-auto wrapper)
      if (target && target.tagName && target.nodeType === 1 && target.clientHeight && target.clientHeight > window.innerHeight - 100) {
        scrollTop = target.scrollTop;
      }
      // Document-level scroll
      else {
        scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      }

      // Homepage: show after scrolling 1120px
      setIsVisible(scrollTop > 1120);
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [pathname]);

  // Sync cart state with localStorage and custom events
  const syncCart = () => {
    try {
      const savedCart = localStorage.getItem("pluggedin_cart");
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      } else {
        setCart([]);
      }
    } catch (e) {
      console.error("Failed to load cart in sticky navbar", e);
    }
  };

  // Trigger bounce animation purely on cart changes
  const prevCartCountRef = React.useRef(0);
  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (newTotal > prevCartCountRef.current && prevCartCountRef.current > 0) {
      setCartAnimate(true);
      const timer = setTimeout(() => setCartAnimate(false), 800);
      return () => clearTimeout(timer);
    }
    prevCartCountRef.current = newTotal;
  }, [cart]);

  useEffect(() => {
    syncCart();
    window.addEventListener("cart-updated", syncCart);
    window.addEventListener("storage", syncCart);

    // Load recent searches
    try {
      const savedRecent = localStorage.getItem("pluggedin_recent_searches");
      if (savedRecent) {
        setRecentSearches(JSON.parse(savedRecent));
      }
    } catch (err) {
      console.error(err);
    }

    // Interval fallback to keep state in sync
    const interval = setInterval(syncCart, 1000);

    return () => {
      window.removeEventListener("cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
      clearInterval(interval);
    };
  }, []);

  // Filter products for search
  useEffect(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const matched = MOCK_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(trimmed) ||
        p.category.toLowerCase().includes(trimmed) ||
        p.description.toLowerCase().includes(trimmed)
    );
    setSearchResults(matched);
  }, [searchQuery]);

  // Click outside listener for search container
  useEffect(() => {
    if (!isSearching) return;
    const clickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("#sticky-search-container") &&
        !target.closest("#sticky-search-trigger")
      ) {
        setIsSearching(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, [isSearching]);

  // Focus input when opened
  useEffect(() => {
    if (isSearching) {
      const input = document.getElementById("sticky-search-input") as HTMLInputElement;
      if (input) {
        setTimeout(() => input.focus(), 150);
      }
      setFocusedIndex(-1);
    }
  }, [isSearching]);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem("pluggedin_cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("cart-updated"));
    } catch (e) {
      console.error("Failed to save cart in sticky navbar", e);
    }
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

  const removeFromCart = (productId: string, color: string) => {
    const newCart = cart.filter(
      (item) => !(item.product.id === productId && item.color === color)
    );
    saveCart(newCart);
    setSearchToast("Removed item from cart");
    setTimeout(() => setSearchToast(null), 3000);
  };

  const parsePrice = (priceStr: string) => {
    const cleanStr = priceStr.replace(/rs\.?/i, "").replace(/[^0-9.]/g, "");
    return parseFloat(cleanStr) || 0;
  };

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + parsePrice(item.product.price) * item.quantity,
    0
  );

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSelectProduct = (product: Product) => {
    setIsSearching(false);
    setSearchQuery("");
    router.push(`/product/${product.id}`);

    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      const updated = [
        q,
        ...recentSearches.filter((s) => s.toLowerCase() !== q.toLowerCase()),
      ].slice(0, 5);
      setRecentSearches(updated);
      try {
        localStorage.setItem("pluggedin_recent_searches", JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsSearching(false);
      setSearchQuery("");
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

  const highlightMatch = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const cleanQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const parts = text.split(new RegExp(`(${cleanQuery})`, "gi"));
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

  // Don't render on admin pages (guard placed after all hooks to satisfy React rules-of-hooks)
  if (isAdminPage) {
    return null;
  }

  return (
    <>
      {/* Non-Floating Top Sticky Navbar */}
      <div
        className={`fixed top-0 left-0 right-0 w-full z-50 rounded-none border-b border-zinc-200/40 bg-white px-6 lg:px-12 py-2.5 md:py-3 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          (isVisible || isSearching)
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-full pointer-events-none"
        }`}
      >
        <header className="w-full flex items-center justify-between h-[50px] md:h-[60px] relative">

          <div
            className={`flex items-center gap-2 sm:gap-4 lg:gap-6 w-[35%] justify-center -ml-4 lg:-ml-8 transition-all duration-300 ${isSearching ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
              }`}
          >
            <div className="hidden md:flex items-center gap-2 sm:gap-4 lg:gap-6">
              {[
                { name: "ABOUT", href: "/#about" },
                { name: "BLOG", href: "/#blog" },
                { name: "SHOP", href: "/shop" },
                { name: "TRENDING", href: "/shop?collection=trending" },
              ].map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-xs sm:text-sm lg:text-[15px] font-bold tracking-widest text-black hover:text-purple-650 transition-colors duration-300 relative group"
                >
                  {link.name}
                  <span className="absolute bottom-[-4px] left-0 w-0 h-[1.5px] bg-purple-600 transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </div>
          </div>

          {/* CENTER BLOCK: LOGO */}
          <div className="w-[30%] flex items-center justify-center">
            <Link href="/" className="h-8 md:h-10 lg:h-11 block hover:opacity-75 transition-opacity">
              <img src="/logo.webp" alt="Logo" className="h-full object-contain mx-auto" />
            </Link>
          </div>

          {/* RIGHT BLOCK: NEW IN, CONTACT + Search/Cart Buttons */}
          <div className="flex items-center w-[35%] justify-end gap-3 sm:gap-4 lg:gap-5 pr-1 lg:pr-3">

            {/* Desktop-only Links */}
            <div
              className={`hidden lg:flex items-center gap-4 lg:gap-6 transition-all duration-300 ${isSearching
                  ? "opacity-0 -translate-x-4 pointer-events-none max-w-0 overflow-hidden"
                  : "opacity-100 translate-x-0"
                }`}
            >
              {[
                { name: "NEW IN", href: "/shop?collection=new-in" },
                { name: "CONTACT", href: "/contact" },
              ].map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-xs sm:text-sm lg:text-[15px] font-bold tracking-widest text-black hover:text-purple-650 transition-colors duration-300 relative group"
                >
                  {link.name}
                  <span className="absolute bottom-[-4px] left-0 w-0 h-[1.5px] bg-purple-600 transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </div>

            {/* Actions Trigger container */}
            <div id="sticky-search-container" className="relative flex items-center justify-end">

              {/* Expanding Input */}
              <div
                className={`flex items-center bg-white/95 border border-purple-300/40 border-b-[3px] border-purple-650/30 rounded-full px-4 py-1 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_4px_12px_rgba(139,92,246,0.05)] ${isSearching
                    ? "w-[calc(100vw-60px)] sm:w-[260px] md:w-[320px] lg:w-[360px] opacity-100 scale-100"
                    : "w-0 opacity-0 scale-95 pointer-events-none overflow-hidden border-none shadow-none py-0 px-0"
                  }`}
              >
                <svg className="w-4 h-4 text-purple-600 shrink-0 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="sticky-search-input"
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent text-[11px] font-semibold text-zinc-950 placeholder-zinc-400 focus:outline-none py-1"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-zinc-400 hover:text-zinc-650 p-1 mr-1 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsSearching(false);
                    setSearchQuery("");
                  }}
                  className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-900 rounded-full p-1 transition-colors cursor-pointer shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Standard Trigger Button (Matches the style of storefront search icon) */}
              <button
                id="sticky-search-trigger"
                onClick={() => setIsSearching(true)}
                className={`hidden md:flex bg-purple-600/10 text-purple-955 border border-purple-300/35 border-b-[3px] border-purple-600/35 p-2.5 rounded-full hover:bg-purple-600/20 transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0 ${isSearching ? "opacity-0 scale-95 pointer-events-none w-0 overflow-hidden" : "opacity-100 scale-100"
                  }`}
              >
                <svg className="w-4 h-4 lg:w-4.5 lg:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Autocomplete Dropdown */}
              <div
                className={`absolute top-[calc(100%+12px)] right-0 w-[calc(100vw-60px)] sm:w-[320px] md:w-[380px] lg:w-[440px] bg-white/95 backdrop-blur-xl border border-zinc-200/50 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 z-50 text-left origin-top-right flex flex-col max-h-[400px] ${isSearching ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
                  }`}
              >
                {!searchQuery.trim() && (
                  <div className="p-4 flex flex-col gap-3.5">
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-[9px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
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
                            className="text-[8px] font-bold text-zinc-400 hover:text-purple-650 transition-colors uppercase tracking-widest cursor-pointer border-0 bg-transparent"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map((term) => (
                            <button
                              key={term}
                              onClick={() => {
                                setSearchQuery(term);
                                const input = document.getElementById("sticky-search-input") as HTMLInputElement;
                                if (input) input.focus();
                              }}
                              className="text-[10px] font-semibold px-2.5 py-1 bg-purple-500/[0.03] border border-purple-200/30 text-zinc-700 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1 hover:bg-purple-55 hover:text-purple-700"
                            >
                              <svg className="w-2.5 h-2.5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={recentSearches.length > 0 ? "border-t border-zinc-100 pt-3" : ""}>
                      <h4 className="text-[9px] font-bold tracking-[0.2em] text-zinc-400 uppercase mb-2">
                        Trending Searches
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {["Headphones", "Mechanical Keyboard", "Wireless Charger", "Tech Sleeve", "Laptop Lift"].map((term) => (
                          <button
                            key={term}
                            onClick={() => {
                              setSearchQuery(term);
                              const input = document.getElementById("sticky-search-input") as HTMLInputElement;
                              if (input) input.focus();
                            }}
                            className="text-[10px] font-semibold px-2.5 py-1 bg-zinc-100 hover:bg-purple-55 hover:text-purple-700 text-zinc-700 rounded-full transition-all duration-200 cursor-pointer border border-zinc-200/40"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {searchQuery.trim() && (
                  <>
                    <div className="p-2.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                      <span className="text-[8px] font-bold tracking-widest text-zinc-400 uppercase">
                        Search Results ({searchResults.length})
                      </span>
                    </div>

                    <div className="overflow-y-auto flex-1 max-h-[300px] divide-y divide-zinc-100/50">
                      {searchResults.length > 0 ? (
                        searchResults.map((product, index) => {
                          const isFocused = focusedIndex === index;
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
                              className={`w-full flex items-start p-2.5 text-left transition-all duration-200 outline-none ${isFocused
                                  ? "bg-purple-50/80 border-l-[3px] border-purple-600 pl-2"
                                  : "hover:bg-zinc-50/60 border-l-[3px] border-transparent"
                                }`}
                            >
                              <div className={`p-1.5 rounded-lg shrink-0 mr-2.5 ${colorMap[product.color] || "bg-zinc-100"}`}>
                                {getCategoryIcon(product.category, product.id)}
                              </div>
                              <div className="flex-grow min-w-0 pr-2">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <h5 className="text-xs font-bold text-zinc-950 truncate">
                                    {highlightMatch(product.name, searchQuery)}
                                  </h5>
                                  <span className="text-xs font-extrabold text-purple-950 shrink-0 font-syne">
                                    {product.price}
                                  </span>
                                </div>
                                <span className="inline-block text-[8px] font-extrabold tracking-wider text-zinc-400 uppercase">
                                  {product.category}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-6 px-4 text-center flex flex-col items-center justify-center">
                          <h5 className="text-xs font-bold text-zinc-700 mb-1">
                            No creator essentials match
                          </h5>
                          <p className="text-[10px] text-zinc-450 max-w-[200px] leading-relaxed">
                            Try searching for headphones, keyboard, or charger.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Cart Button (with Badge) */}
            <div
              className={`hidden md:block transition-all duration-300 ${isSearching ? "opacity-0 pointer-events-none w-0 overflow-hidden" : "opacity-100"
                }`}
            >
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative border-0 bg-transparent text-zinc-950 hover:text-zinc-700 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {totalCartItems > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 bg-purple-600 text-white text-[8px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-md border border-white transition-all duration-300 ${cartAnimate ? "animate-bounce scale-110 shadow-[0_0_8px_rgba(139,92,246,0.5)]" : ""
                      }`}
                  >
                    {totalCartItems}
                  </span>
                )}
              </button>
            </div>

          </div>

        </header>
      </div>

      {/* Slide-over Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[120] overflow-hidden">
          <div
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-500 animate-in fade-in cursor-pointer"
          />

          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white flex flex-col shadow-2xl z-[121] transform animate-in slide-in-from-right duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] text-left">
            {/* Drawer Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h2 className="text-sm font-extrabold text-zinc-950 font-outfit uppercase tracking-widest">
                  Shopping Cart
                </h2>
                <span className="bg-purple-100 text-purple-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-outfit">
                  {totalCartItems}
                </span>
              </div>

              <button
                onClick={() => setIsCartOpen(false)}
                className="bg-zinc-50 hover:bg-zinc-100 text-zinc-550 rounded-full p-2 transition-colors cursor-pointer border-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 scrollbar-thin">
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-400 select-none">
                  <div className="p-6 bg-purple-50 rounded-full text-purple-300 border border-purple-100/30 shadow-inner">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-extrabold text-zinc-950 uppercase tracking-widest font-outfit">
                    Your cart is empty
                  </h3>
                  <p className="text-xs text-zinc-500 text-center max-w-[240px] leading-relaxed font-medium">
                    Looks like you haven't added any products to your setup yet.
                  </p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="bg-purple-650 text-white text-xs font-bold tracking-widest px-6 py-3 rounded-full hover:bg-purple-700 transition-all duration-300 mt-2 shadow-md shadow-purple-600/15 cursor-pointer border-0"
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
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-zinc-100 flex-shrink-0 flex items-center justify-center p-1 relative">
                      <img
                        src={item.product.images && item.product.images.length > 0 ? item.product.images[0] : `/products/${item.product.id}.webp`}
                        alt={item.product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>

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

                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center bg-zinc-55 border border-zinc-200/50 rounded-full px-1.5 py-0.5 shadow-inner">
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
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-450 uppercase tracking-widest">
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
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      router.push("/cart");
                    }}
                    className="w-full bg-purple-600 text-white text-xs font-bold tracking-widest py-3.5 rounded-full hover:bg-purple-700 transition-all duration-300 shadow-md shadow-purple-600/15 cursor-pointer border-0 flex items-center justify-center gap-2"
                  >
                    GO TO DETAILED CART
                  </button>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="w-full bg-transparent text-zinc-500 hover:text-zinc-850 text-[9px] font-bold tracking-widest py-2 rounded-full hover:bg-zinc-100 transition-colors border-0 cursor-pointer"
                  >
                    CONTINUE SHOPPING
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/85 backdrop-blur-xl border-t border-zinc-200/50 rounded-t-3xl shadow-[0_-8px_24px_rgba(0,0,0,0.05)] px-4 py-2 flex items-center justify-around pb-[calc(8px+env(safe-area-inset-bottom))]">
        {/* Home Tab */}
        <Link
          href="/"
          onClick={() => {
            setIsMobileMenuOpen(false);
            setIsSearching(false);
          }}
          className={`flex flex-col items-center gap-1 py-1 text-center flex-1 relative ${
            pathname === "/" && !isSearching && !isCartOpen && !isMobileMenuOpen
              ? "text-purple-650"
              : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <svg className="w-5.5 h-5.5 transition-transform duration-200 active:scale-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[9px] font-bold tracking-wider uppercase font-outfit">Home</span>
          {pathname === "/" && !isSearching && !isCartOpen && !isMobileMenuOpen && (
            <span className="absolute bottom-[-2px] w-1 h-1 rounded-full bg-purple-600" />
          )}
        </Link>

        {/* Shop Tab */}
        <Link
          href="/shop"
          onClick={() => {
            setIsMobileMenuOpen(false);
            setIsSearching(false);
          }}
          className={`flex flex-col items-center gap-1 py-1 text-center flex-1 relative ${
            pathname.startsWith("/shop") && !isSearching && !isCartOpen && !isMobileMenuOpen
              ? "text-purple-650"
              : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <svg className="w-5.5 h-5.5 transition-transform duration-200 active:scale-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="text-[9px] font-bold tracking-wider uppercase font-outfit">Shop</span>
          {pathname.startsWith("/shop") && !isSearching && !isCartOpen && !isMobileMenuOpen && (
            <span className="absolute bottom-[-2px] w-1 h-1 rounded-full bg-purple-600" />
          )}
        </Link>

        {/* Search Tab */}
        <button
          onClick={() => {
            setIsMobileMenuOpen(false);
            setIsSearching(true);
            setIsCartOpen(false);
          }}
          className={`flex flex-col items-center gap-1 py-1 text-center flex-1 border-0 bg-transparent cursor-pointer relative ${
            isSearching ? "text-purple-650" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <svg className="w-5.5 h-5.5 transition-transform duration-200 active:scale-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[9px] font-bold tracking-wider uppercase font-outfit">Search</span>
          {isSearching && (
            <span className="absolute bottom-[-2px] w-1 h-1 rounded-full bg-purple-600" />
          )}
        </button>

        {/* Cart Tab */}
        <button
          onClick={() => {
            setIsMobileMenuOpen(false);
            setIsSearching(false);
            setIsCartOpen(true);
          }}
          className={`flex flex-col items-center gap-1 py-1 text-center flex-1 border-0 bg-transparent cursor-pointer relative ${
            isCartOpen ? "text-purple-650" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <div className="relative">
            <svg className="w-5.5 h-5.5 transition-transform duration-200 active:scale-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {totalCartItems > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-purple-600 text-white text-[8px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-sm">
                {totalCartItems}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold tracking-wider uppercase font-outfit">Cart</span>
          {isCartOpen && (
            <span className="absolute bottom-[-2px] w-1 h-1 rounded-full bg-purple-600" />
          )}
        </button>

        {/* Menu/More Tab */}
        <button
          onClick={() => {
            setIsMobileMenuOpen(true);
            setIsSearching(false);
            setIsCartOpen(false);
          }}
          className={`flex flex-col items-center gap-1 py-1 text-center flex-1 border-0 bg-transparent cursor-pointer relative ${
            isMobileMenuOpen ? "text-purple-650" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <svg className="w-5.5 h-5.5 transition-transform duration-200 active:scale-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[9px] font-bold tracking-wider uppercase font-outfit">Menu</span>
          {isMobileMenuOpen && (
            <span className="absolute bottom-[-2px] w-1 h-1 rounded-full bg-purple-600" />
          )}
        </button>
      </div>

      {/* Mobile Bottom Sheet Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[110] md:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in cursor-pointer"
          />
          {/* Sheet container */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-zinc-200/60 rounded-t-[32px] p-6 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[111] transform animate-in slide-in-from-bottom duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            {/* Grab handle */}
            <div className="w-12 h-1 bg-zinc-300/80 rounded-full mx-auto mb-4" />
            
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xs font-black tracking-[0.2em] text-zinc-400 uppercase font-outfit">
                Explore PluggedIn
              </h3>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-650 rounded-full p-1.5 transition-colors border-0 cursor-pointer flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  name: "ABOUT",
                  href: "/#about",
                  desc: "Our vision & premium standards",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
                {
                  name: "BLOG",
                  href: "/#blog",
                  desc: "Creator setup guides & industry news",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  ),
                },
                {
                  name: "SHOP ALL",
                  href: "/shop",
                  desc: "Browse our entire workspace collection",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  ),
                },
                {
                  name: "TRENDING",
                  href: "/shop?collection=trending",
                  desc: "Explore our most popular creator gear",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ),
                },
                {
                  name: "NEW ARRIVALS",
                  href: "/shop?collection=new-in",
                  desc: "Fresh essentials to power your desk setup",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  ),
                },
                {
                  name: "CONTACT Support",
                  href: "/contact",
                  desc: "Get help from our workspace experts",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 p-3.5 bg-zinc-50 hover:bg-purple-50/50 border border-zinc-100 rounded-2xl transition-all duration-200 text-left group"
                >
                  <div className="p-2.5 bg-white border border-zinc-100 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors duration-250 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold tracking-wider text-zinc-950 uppercase">
                      {item.name}
                    </div>
                    <div className="text-[9px] text-zinc-450 mt-0.5 leading-tight">
                      {item.desc}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Toast */}
      {searchToast && (
        <div className="fixed bottom-6 right-6 bg-zinc-900/95 backdrop-blur-md text-white text-[10px] font-bold tracking-widest py-3 px-6 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {searchToast.toUpperCase()}
        </div>
      )}
    </>
  );
}
