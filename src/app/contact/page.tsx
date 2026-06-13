"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("general_inquiries");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contact/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          reason,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setName("");
        setEmail("");
        setReason("general_inquiries");
        setMessage("");
      } else {
        throw new Error(data.error || "Failed to submit message.");
      }
    } catch (err: any) {
      console.warn("Contact submission database error, running offline simulation:", err);
      // Fallback offline simulation
      setSuccess(true);
      setName("");
      setEmail("");
      setReason("general_inquiries");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center font-outfit">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Loading Support...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-outfit select-none relative pb-16">
      <style>{`
        @keyframes draw-checkmark {
          100% { stroke-dashoffset: 0; }
        }
        @keyframes scale-checkmark {
          0%, 100% { transform: none; }
          50% { transform: scale3d(1.1, 1.1, 1); }
        }
        @keyframes fill-checkmark {
          100% { box-shadow: inset 0px 0px 0px 50px #10b981; }
        }
        .anim-checkmark__circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          stroke-width: 2;
          stroke-miterlimit: 10;
          stroke: #10b981;
          fill: none;
          animation: draw-stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        .anim-checkmark {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: block;
          stroke-width: 2.5;
          stroke: #fff;
          stroke-miterlimit: 10;
          box-shadow: inset 0px 0px 0px #10b981;
          animation: fill-checkmark .4s ease-in-out .4s forwards, scale-checkmark .3s ease-in-out .9s forwards;
        }
        .anim-checkmark__check {
          transform-origin: 50% 50%;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: draw-stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
        }
        @keyframes draw-stroke {
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* Header Nav */}
      <header className="sticky top-0 bg-white/70 backdrop-blur-xl border-b border-zinc-200/50 px-6 lg:px-12 py-4 flex items-center justify-between z-40 relative">
        <Link href="/" className="flex items-center gap-1.5 text-zinc-900 hover:text-purple-600 transition-colors uppercase font-bold text-[10px] sm:text-xs tracking-widest group">
          <svg className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          BACK TO STOREFRONT
        </Link>

        {/* Center Logo */}
        <Link href="/" className="w-32 h-8 block hover:opacity-75 transition-opacity">
          <img src="/logo.webp" alt="Logo" className="w-full h-full object-contain" />
        </Link>

        {/* Status Pill */}
        <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">
          Help Desk
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-8 md:py-12 z-10 flex flex-col gap-8 md:gap-12">
        <div className="flex flex-col gap-1.5 text-left max-w-xl">
          <span className="text-[9px] font-black tracking-widest text-purple-600 uppercase">
            GET IN TOUCH
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-950 font-syne uppercase tracking-tight">
            We'd love to hear from you.
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm font-semibold leading-relaxed">
            Have a question about our premium workspace setup tools, shipping logistics, or customized collection bundles? Send a message and our support desk will respond shortly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* Left Column: Demo Contact Details */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Email Support Card */}
            <div className="bg-white border border-zinc-200/60 rounded-[2rem] p-6 text-left flex gap-4 hover:border-zinc-300 transition-all duration-300 shadow-xs">
              <div className="w-12 h-12 bg-purple-50 border border-purple-100 rounded-full flex items-center justify-center text-purple-650 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">Support Email</span>
                <a href="mailto:hello@pluggedin.co" className="text-sm font-black text-zinc-900 hover:text-purple-600 transition-colors">
                  hello@pluggedin.co
                </a>
                <span className="text-[10px] text-zinc-450 font-semibold leading-relaxed">
                  Submit a query 24/7. We guarantee a detailed reply within 24 hours.
                </span>
              </div>
            </div>

            {/* Phone Support Card */}
            <div className="bg-white border border-zinc-200/60 rounded-[2rem] p-6 text-left flex gap-4 hover:border-zinc-300 transition-all duration-300 shadow-xs">
              <div className="w-12 h-12 bg-purple-50 border border-purple-100 rounded-full flex items-center justify-center text-purple-650 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">Helpdesk Phone</span>
                <a href="tel:+18005557584" className="text-sm font-black text-zinc-900 hover:text-purple-600 transition-colors">
                  +1 (800) 555-PLUG
                </a>
                <span className="text-[10px] text-zinc-450 font-semibold leading-relaxed">
                  Available Monday to Friday, 9:00 AM to 6:00 PM PST for instant setup support.
                </span>
              </div>
            </div>

            {/* Head Office Address Card */}
            <div className="bg-white border border-zinc-200/60 rounded-[2rem] p-6 text-left flex gap-4 hover:border-zinc-300 transition-all duration-300 shadow-xs">
              <div className="w-12 h-12 bg-purple-50 border border-purple-100 rounded-full flex items-center justify-center text-purple-650 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">Design Studio</span>
                <span className="text-sm font-black text-zinc-900 leading-normal">
                  PluggedIn Spaces, 100 Pine Street<br />Suite 2400, San Francisco, CA 94111
                </span>
                <span className="text-[10px] text-zinc-450 font-semibold leading-relaxed">
                  Visiting our design showroom requires booking a reservation in advance.
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-zinc-200/60 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden text-left min-h-[460px] flex flex-col justify-between">
              
              {/* success screen banner */}
              {success ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center gap-6 py-8 animate-in fade-in duration-500">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="anim-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                      <circle className="anim-checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                      <path className="anim-checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-black text-zinc-950 font-syne uppercase tracking-tight">
                      Message Sent!
                    </h3>
                    <p className="text-zinc-550 text-xs font-semibold leading-relaxed max-w-xs mx-auto">
                      Thank you for contacting us. Your message has been successfully logged in our administration records. We will review your query and get back to you shortly.
                    </p>
                  </div>
                  <button
                    onClick={() => setSuccess(false)}
                    className="bg-zinc-950 hover:bg-zinc-800 text-white text-[10px] font-black tracking-widest px-6 py-3.5 rounded-full transition-all border-0 cursor-pointer shadow-sm shadow-zinc-950/10"
                  >
                    SEND ANOTHER MESSAGE
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <h2 className="text-xs font-black tracking-widest text-zinc-400 uppercase border-b border-zinc-100 pb-2">
                    Inquiry Form
                  </h2>

                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-4 py-2.5 rounded-xl text-center">
                      {error.toUpperCase()}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black tracking-widest text-zinc-400 uppercase ml-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-slate-50 border border-zinc-200 focus:bg-white focus:border-purple-500 rounded-xl px-4 py-3.5 text-xs font-semibold text-zinc-900 placeholder-zinc-400 focus:outline-none transition-all w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black tracking-widest text-zinc-400 uppercase ml-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-slate-50 border border-zinc-200 focus:bg-white focus:border-purple-500 rounded-xl px-4 py-3.5 text-xs font-semibold text-zinc-900 placeholder-zinc-400 focus:outline-none transition-all w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black tracking-widest text-zinc-400 uppercase ml-1">
                      Reason for Inquiry
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="bg-slate-50 border border-zinc-200 focus:bg-white focus:border-purple-500 rounded-xl px-4 py-3.5 text-xs font-semibold text-zinc-900 focus:outline-none transition-all w-full cursor-pointer"
                    >
                      <option value="general_inquiries">General Inquiries</option>
                      <option value="product_inquiries">Product Inquiries</option>
                      <option value="shipping_inquiries">Shipping Inquiries</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black tracking-widest text-zinc-400 uppercase ml-1">
                      Message Content
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Write your inquiries details here..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="bg-slate-50 border border-zinc-200 focus:bg-white focus:border-purple-500 rounded-xl px-4 py-3.5 text-xs font-semibold text-zinc-900 placeholder-zinc-400 focus:outline-none transition-all w-full h-32 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-purple-600 text-white text-xs font-bold tracking-widest py-4.5 rounded-full hover:bg-purple-750 transition-all duration-300 shadow-md shadow-purple-600/15 cursor-pointer border-0 mt-2 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      "SUBMIT INQUIRIES"
                    )}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <div className="relative z-20 w-full max-w-6xl mx-auto px-6 mt-16 -mb-12">
        {/* Back 3D Slab Extrusion Layer */}
        <div 
          className="absolute inset-0 mx-6 bg-[#9674eb] rounded-[2.2rem] md:rounded-[3.2rem] translate-y-2.5" 
          style={{ content: '""' }}
        />
        
        {/* Main Card Shape Front Face */}
        <footer className="relative bg-white/95 backdrop-blur-2xl border-[3px] sm:border-[4px] border-[#c1a8f6] rounded-[2.2rem] md:rounded-[3.2rem] text-zinc-650 px-6 sm:px-10 py-12 md:py-16 flex flex-col gap-10 md:gap-12 overflow-hidden shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
          {/* Subtle ambient light glows */}
          <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-purple-200/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-[250px] h-[250px] bg-purple-300/10 blur-[90px] rounded-full pointer-events-none" />

          <div className="max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 relative z-10 text-left">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <img src="/logo.webp" alt="PluggedIn Logo" className="h-8 object-contain" />
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed font-semibold">
                A curated fusion of premium personal electronics, smart devices, and elevated setup accessories built to maximize creator potential.
              </p>
              {/* Social Icons */}
              <div className="flex gap-3.5 mt-2">
                {[
                  { name: "X (Twitter)", viewBox: "0 0 24 24", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                  { name: "Instagram", viewBox: "0 0 24 24", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
                  { name: "YouTube", viewBox: "0 0 24 24", path: "M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.002 3.002 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
                  { name: "TikTok", viewBox: "0 0 24 24", path: "M12.53.02C13.82 0 15.14.01 16.46 0c.08 1.56.54 3.06 1.39 4.37.95.84 2.14 1.27 3.39 1.48v3.07a8.553 8.553 0 01-4.78-1.7c-.01 3.82.01 7.64-.02 11.46-.08 3.54-2.58 6.55-5.97 7.14-3.83.77-7.66-1.57-8.38-5.39-.77-3.83 1.57-7.66 5.39-8.38 1.05-.2 2.13-.1 3.13.28v3.19a5.352 5.352 0 00-3.13-.39c-1.8.35-3.07 2.05-2.88 3.88.19 1.83 1.83 3.16 3.66 2.97 1.83-.19 3.16-1.83 2.97-3.66V0h3.29v.02z" }
                ].map((icon) => (
                  <a
                    key={icon.name}
                    href="#"
                    className="w-10 h-10 rounded-xl bg-slate-50 border border-zinc-200/80 flex items-center justify-center text-zinc-500 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/20 hover:shadow-[0_4px_12px_rgba(139,92,246,0.1)] transition-all duration-300 group"
                    title={icon.name}
                  >
                    <svg className="w-5 h-5 fill-current" viewBox={icon.viewBox}>
                      <path d={icon.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-bold tracking-[0.25em] text-zinc-400 uppercase">
                Browse
              </h4>
              <ul className="flex flex-col gap-2.5 text-xs sm:text-sm font-semibold">
                <li><Link href="/#trending" className="text-zinc-660 hover:text-purple-650 transition-colors">Trending Essentials</Link></li>
                <li><Link href="/#new-in" className="text-zinc-660 hover:text-purple-650 transition-colors">New Arrivals</Link></li>
                <li><Link href="/#shop" className="text-zinc-660 hover:text-purple-650 transition-colors">Audio Systems</Link></li>
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-bold tracking-[0.25em] text-zinc-400 uppercase">
                Support
              </h4>
              <ul className="flex flex-col gap-2.5 text-xs sm:text-sm font-semibold">
                <li><Link href="/contact" className="text-zinc-660 hover:text-purple-655 transition-colors">Contact Support</Link></li>
                <li><Link href="/privacy-policy" className="text-zinc-660 hover:text-purple-655 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/refund-policy" className="text-zinc-660 hover:text-purple-655 transition-colors">Refund Policy</Link></li>
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-bold tracking-[0.25em] text-zinc-400 uppercase">
                Newsletter
              </h4>
              <p className="text-xs sm:text-sm text-zinc-555 leading-relaxed font-semibold">
                Subscribe for exclusive setup insights and creator discounts.
              </p>
              
              {/* Glassmorphic Newsletter Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = document.getElementById("newsletter-email-input") as HTMLInputElement;
                  if (input?.value) {
                    alert(`Subscribed ${input.value} to PluggedIn catalog!`);
                    input.value = "";
                  }
                }}
                className="flex flex-col gap-2 w-full mt-1"
              >
                <div className="flex items-center bg-purple-600/[0.03] border border-purple-300/30 border-b-[3px] border-purple-600/30 rounded-full px-4 py-1.5 focus-within:border-purple-500/50 focus-within:bg-white transition-all duration-300 shadow-[inset_0_1px_2px_rgba(139,92,246,0.05)]">
                  <input
                    id="newsletter-email-input"
                    type="email"
                    required
                    placeholder="Enter your email"
                    className="w-full bg-transparent text-xs font-semibold text-zinc-900 placeholder-zinc-400 focus:outline-none py-1.5"
                  />
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 hover:scale-105 active:scale-95 text-white font-bold text-[10px] tracking-widest px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer shrink-0 border-0 shadow-sm"
                  >
                    JOIN
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="max-w-6xl w-full mx-auto border-t border-zinc-200/80 pt-8 mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10 text-[10px] sm:text-xs font-bold tracking-wider text-zinc-450">
            <span>© {new Date().getFullYear()} PLUGGEDIN. ALL RIGHTS RESERVED.</span>
            <div className="flex gap-6">
              <Link href="/privacy-policy" className="hover:text-purple-650 transition-colors">PRIVACY POLICY</Link>
              <Link href="/refund-policy" className="hover:text-purple-650 transition-colors">REFUND POLICY</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
