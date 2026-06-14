"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

/* ---------------------------------------------------------------- */
/* Scroll-reveal wrapper (IntersectionObserver)                      */
/* ---------------------------------------------------------------- */
type RevealVariant = "up" | "scale" | "left" | "right" | "blur";

function Reveal({
  children,
  variant = "up",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const variantClass =
    variant === "scale"
      ? "reveal-scale"
      : variant === "left"
      ? "reveal-left"
      : variant === "right"
      ? "reveal-right"
      : variant === "blur"
      ? "reveal-blur"
      : "";

  return (
    <div
      ref={ref}
      className={`reveal ${variantClass} ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Count-up number (animates when scrolled into view)               */
/* ---------------------------------------------------------------- */
function Counter({
  to,
  suffix = "",
  duration = 1800,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(to);
      return;
    }

    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.unobserve(el);
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(Math.round(eased * to));
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* Constellation particle field (canvas, no deps)                    */
/* ---------------------------------------------------------------- */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;

    type P = { x: number; y: number; vx: number; vy: number };
    let particles: P[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(70, Math.floor((width * height) / 16000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(196, 181, 253, 0.7)";
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.14 * (1 - dist / 120)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resize();
    draw();
    if (reduce) cancelAnimationFrame(raf);

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none opacity-70"
      aria-hidden="true"
    />
  );
}

/* ---------------------------------------------------------------- */
/* Data                                                              */
/* ---------------------------------------------------------------- */
const STATS = [
  { to: 10, suffix: "+", label: "Curated Products" },
  { to: 6, suffix: "+", label: "Categories" },
  { to: 100, suffix: "%", label: "Secure Checkout" },
  { to: 24, suffix: "/7", label: "Always Open" },
];

const BENEFITS = [
  {
    n: "01",
    title: "Handpicked For You",
    desc: "We pick the good stuff so you don't have to scroll endlessly. Every product earns its place in the store.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M12 3l2.2 5.2L20 9l-4.2 3.6L17 18l-5-3-5 3 1.2-5.4L4 9l5.8-.8L12 3z" />
    ),
  },
  {
    n: "02",
    title: "Fair Prices & Deals",
    desc: "Quality products at honest prices, with regular discounts and offers running across the store.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M7 7h.01M3 11l8-8 10 10-8 8L3 11zm4-1a1 1 0 11-2 0 1 1 0 012 0z" />
    ),
  },
  {
    n: "03",
    title: "Fast & Easy",
    desc: "Simple checkout, secure payment, and quick delivery across Sri Lanka — with cash on delivery available.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M13 3L4 14h6l-1 7 9-11h-6l1-7z" />
    ),
  },
];

const CATEGORIES = [
  {
    tag: "ELECTRONICS",
    desc: "Headphones, speakers, chargers, webcams and smart accessories to power up your day.",
  },
  {
    tag: "WORKSPACE & GEAR",
    desc: "Keyboards, mice, laptop stands and desk essentials for work, gaming and everything in between.",
  },
  {
    tag: "LIFESTYLE & TRAVEL",
    desc: "Bags, organizers and everyday carry that mixes clean style with real-world function.",
  },
  {
    tag: "LIGHTING & AMBIENCE",
    desc: "Smart lighting and accessories to set the mood and finish off any space.",
  },
];

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */
export default function AboutClient() {
  const [progress, setProgress] = useState(0);
  const blob1 = useRef<HTMLDivElement>(null);
  const blob2 = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const heroContent = useRef<HTMLDivElement>(null);

  // Defensive: clear any leftover scroll-lock from the homepage (which sets
  // overflow/height/width on html+body) so the About page can always scroll.
  useEffect(() => {
    const unlock = () => {
      for (const el of [document.documentElement, document.body]) {
        el.style.overflow = "";
        el.style.height = "";
        el.style.width = "";
      }
    };
    unlock();
    // Re-run after a tick to win any race with the previous route's cleanup.
    const t = setTimeout(unlock, 120);
    return () => clearTimeout(t);
  }, []);

  // Scroll progress bar + hero parallax (rAF, ref-based — no re-render storm)
  useEffect(() => {
    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(docH > 0 ? Math.min(y / docH, 1) : 0);

        if (!reduce && y < window.innerHeight) {
          if (blob1.current) blob1.current.style.transform = `translate3d(0, ${y * 0.25}px, 0)`;
          if (blob2.current) blob2.current.style.transform = `translate3d(0, ${y * -0.15}px, 0)`;
          if (gridRef.current) gridRef.current.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
          if (heroContent.current) {
            heroContent.current.style.transform = `translate3d(0, ${y * 0.18}px, 0)`;
            heroContent.current.style.opacity = `${Math.max(1 - y / (window.innerHeight * 0.7), 0)}`;
          }
        }
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="relative bg-[#06060e] text-white font-outfit overflow-x-clip">
      {/* Scroll progress bar (above navbar) */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 origin-left transition-transform duration-75"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* ===================== HERO ===================== */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a0b3a_0%,#0a0820_45%,#06060e_100%)]" />

        <div
          ref={gridRef}
          className="absolute inset-0 animate-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(139,92,246,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.18) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <div
          ref={blob1}
          className="absolute -top-32 -left-24 w-[42rem] h-[42rem] rounded-full bg-violet-600/30 blur-[130px] animate-aurora pointer-events-none"
        />
        <div
          ref={blob2}
          className="absolute top-1/4 -right-32 w-[38rem] h-[38rem] rounded-full bg-fuchsia-600/20 blur-[140px] animate-aurora-slow pointer-events-none"
        />
        <div className="absolute bottom-0 left-1/3 w-[30rem] h-[30rem] rounded-full bg-cyan-500/10 blur-[120px] animate-float-slow pointer-events-none" />

        <ParticleField />

        <div ref={heroContent} className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 w-full pt-28">
          <nav className="mb-8 text-[10px] font-black tracking-[0.25em] text-violet-300/70 uppercase">
            <Link href="/" className="hover:text-white transition-colors">HOME</Link>
            <span className="mx-2.5 text-white/30">/</span>
            <span className="text-white">ABOUT US</span>
          </nav>

          <div className="inline-flex items-center gap-2 mb-7 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur-md px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-glow" />
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-zinc-300">
              Curated online store · Sri Lanka
            </span>
          </div>

          <h1 className="font-syne text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-7">
            Your store for{" "}
            <br className="hidden md:block" />
            <span className="animate-gradient-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
              Electronics &amp; Lifestyle
            </span>
          </h1>

          <p className="text-zinc-300/90 text-lg md:text-xl font-medium tracking-wide max-w-2xl leading-relaxed">
            A handpicked online store bringing you the best in tech and lifestyle —
            fairly priced and delivered to your door across Sri Lanka.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/shop"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-8 py-3.5 text-xs font-black tracking-widest text-[#0a0820] transition-transform hover:scale-105 active:scale-95"
            >
              <span className="card-shine absolute inset-0 -translate-x-[130%] bg-gradient-to-r from-transparent via-violet-300/60 to-transparent" />
              <span className="relative">EXPLORE THE SHOP</span>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.03] px-8 py-3.5 text-xs font-black tracking-widest text-white backdrop-blur-md transition-colors hover:bg-white/10"
            >
              GET IN TOUCH
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/40">Scroll</span>
          <svg className="w-5 h-5 text-white/50 animate-bob" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ===================== STATS ===================== */}
      <section className="relative border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-6 md:px-8 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {STATS.map((s, i) => (
            <Reveal key={s.label} variant="up" delay={i * 120}>
              <div className="px-4 py-10 text-center">
                <div className="font-syne text-4xl md:text-5xl font-black bg-gradient-to-br from-white to-violet-300 bg-clip-text text-transparent">
                  <Counter to={s.to} suffix={s.suffix} />
                </div>
                <div className="mt-3 text-[10px] md:text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-400">
                  {s.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== OUR STORY ===================== */}
      <section className="relative max-w-5xl mx-auto px-6 md:px-8 py-24 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14">
          <div className="md:col-span-4">
            <Reveal variant="left">
              <div className="md:sticky md:top-28">
                <span className="text-[11px] font-black tracking-[0.25em] uppercase text-violet-400">/ 01</span>
                <h2 className="font-syne text-2xl md:text-3xl font-black uppercase tracking-wider mt-3 leading-tight">
                  Our Story
                </h2>
              </div>
            </Reveal>
          </div>
          <div className="md:col-span-8 flex flex-col gap-6 text-zinc-400 leading-relaxed font-medium text-base md:text-lg">
            <Reveal variant="up" delay={80}>
              <p>
                PluggedIn started with a simple idea: make it easy to find quality electronics and lifestyle
                products in Sri Lanka. Instead of hopping between random sites and sellers, you get one clean,
                trustworthy store with everything in one place.
              </p>
            </Reveal>
            <Reveal variant="up" delay={180}>
              <p>
                Think of us as your shortcut to the good stuff. We search for products that look great, work
                well, and are worth the money — then bring them straight to your door with fast, friendly
                delivery and easy payment.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== WHY SHOP WITH US ===================== */}
      <section className="relative max-w-6xl mx-auto px-6 md:px-8 pb-24 md:pb-32">
        <Reveal variant="up">
          <div className="mb-12 border-t border-white/10 pt-16">
            <span className="text-[11px] font-black tracking-[0.25em] uppercase text-violet-400">/ 02</span>
            <h2 className="font-syne text-3xl md:text-4xl font-black uppercase tracking-wide mt-3">
              Why Shop With Us
            </h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BENEFITS.map((p, i) => (
            <Reveal key={p.title} variant="scale" delay={i * 140}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-md transition-all duration-500 hover:border-violet-400/40 hover:bg-white/[0.06] hover:-translate-y-1.5">
                <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute -inset-px rounded-3xl bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <span className="card-shine absolute top-0 bottom-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                <div className="relative flex items-center justify-between mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/10 text-violet-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {p.icon}
                    </svg>
                  </div>
                  <span className="font-syne text-3xl font-black text-white/10">{p.n}</span>
                </div>
                <h3 className="relative font-syne text-lg font-black tracking-wide uppercase text-white mb-3">
                  {p.title}
                </h3>
                <p className="relative text-sm text-zinc-400 leading-relaxed font-medium">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== WHAT WE OFFER ===================== */}
      <section className="relative max-w-6xl mx-auto px-6 md:px-8 pb-24 md:pb-32">
        <Reveal variant="up">
          <div className="mb-12 border-t border-white/10 pt-16">
            <span className="text-[11px] font-black tracking-[0.25em] uppercase text-violet-400">/ 03</span>
            <h2 className="font-syne text-3xl md:text-4xl font-black uppercase tracking-wide mt-3">
              What We Offer
            </h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CATEGORIES.map((m, i) => (
            <Reveal key={m.tag} variant={i % 2 === 0 ? "left" : "right"} delay={(i % 2) * 120}>
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-7 transition-all duration-500 hover:border-fuchsia-400/30">
                <div className="flex items-start gap-4">
                  <span className="mt-1 font-syne text-xs font-black text-violet-400/80">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-xs font-black tracking-[0.18em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300 mb-2.5">
                      {m.tag}
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed font-medium">{m.desc}</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700 group-hover:w-full" />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== BEHIND THE STORE (ARC AI) ===================== */}
      <section className="relative max-w-5xl mx-auto px-6 md:px-8 pb-24 md:pb-28">
        <Reveal variant="up">
          <div className="border-t border-white/10 pt-16 text-center md:text-left max-w-3xl">
            <span className="text-[11px] font-black tracking-[0.25em] uppercase text-violet-400">/ 04</span>
            <h2 className="font-syne text-2xl md:text-3xl font-black uppercase tracking-wider mt-3 mb-5">
              Behind the Store
            </h2>
            <p className="text-zinc-400 leading-relaxed font-medium text-base md:text-lg">
              Our store was designed and built together with{" "}
              <a
                href="https://www.arcai.agency"
                target="_blank"
                rel="noopener"
                className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300 underline decoration-violet-500/40 underline-offset-4 hover:decoration-fuchsia-400 transition-colors"
              >
                ARC AI
              </a>
              , a creative studio that helps us keep the shopping experience smooth, fast, and easy on the eyes.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="relative max-w-5xl mx-auto px-6 md:px-8 pb-28">
        <Reveal variant="scale">
          <div className="group relative overflow-hidden rounded-[2rem] p-[1.5px]">
            <div className="absolute inset-[-100%] animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0deg,rgba(139,92,246,0.8)_60deg,transparent_120deg,transparent_240deg,rgba(34,211,238,0.7)_300deg,transparent_360deg)]" />
            <div className="relative rounded-[2rem] bg-[#0a0820] px-8 py-14 md:px-16 md:py-20 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.18),transparent_55%)] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_55%)] pointer-events-none" />
              <h2 className="relative z-10 font-syne text-3xl md:text-4xl font-black mb-5 leading-tight">
                Ready to Upgrade
                <br className="hidden md:block" /> Your Everyday?
              </h2>
              <p className="relative z-10 text-zinc-400 text-sm md:text-base max-w-xl mx-auto mb-9 font-medium leading-relaxed">
                Browse our handpicked collection of electronics and lifestyle gear — with island-wide delivery
                and cash on delivery available.
              </p>
              <div className="relative z-10">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-9 py-4 text-xs font-black tracking-widest text-[#0a0820] shadow-lg shadow-violet-900/40 transition-transform hover:scale-105 active:scale-95"
                >
                  BROWSE THE SHOP
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
