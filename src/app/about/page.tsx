import { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pluggedin.lk"),
  title: "About Us | Our Story & Premium Workspace Standards | PluggedIn",
  description: "Learn about PluggedIn's mission to curate premium workspace gear and custom mechanical keyboards. Sourced with structural integrity for developers and creators.",
  openGraph: {
    title: "About Us | Our Story & Premium Workspace Standards | PluggedIn",
    description: "Learn about PluggedIn's mission to curate premium workspace gear and custom mechanical keyboards.",
    url: "https://www.pluggedin.lk/about",
    images: ["/banner_1.webp"],
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-outfit flex flex-col justify-between">
      {/* Main Content */}
      <div className="pt-24 md:pt-32 flex-grow">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          {/* Breadcrumb navigation */}
          <nav className="mb-8 text-[10px] font-black tracking-widest text-zinc-400 uppercase">
            <Link href="/" className="hover:text-purple-650 transition-colors">HOME</Link>
            <span className="mx-2.5">/</span>
            <span className="text-zinc-850">ABOUT US</span>
          </nav>

          {/* Hero Header */}
          <header className="mb-14 md:mb-20 text-left">
            <h1 className="font-syne text-4xl md:text-5xl font-black text-zinc-950 tracking-tight leading-[1.1] mb-8">
              Tech & <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 bg-clip-text text-transparent">Lifestyle</span>
            </h1>
            <p className="text-zinc-500 text-lg md:text-xl font-medium tracking-wide max-w-2xl leading-relaxed mt-2">
              We are a premium e-commerce store in Sri Lanka, bringing you curated workspace gear, custom mechanical keyboards, high-performance GaN electronics, and design-led lifestyle accessories.
            </p>
          </header>

          {/* Main Story Section */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-16 md:mb-24 border-t border-zinc-200/60 pt-12 text-left">
            <div className="md:col-span-4">
              <h2 className="font-syne text-lg md:text-xl font-black text-zinc-950 uppercase tracking-widest leading-none">
                OUR MISSION
              </h2>
            </div>
            <div className="md:col-span-8 flex flex-col gap-6 text-zinc-600 leading-relaxed font-medium">
              <p>
                PluggedIn was born from a simple frustration: the lack of high-quality, aesthetically cohesive workspace accessories and mechanical keyboards in Sri Lanka. For software engineers, writers, and digital designers, our desks are where our minds dwell. Yet, the components we interact with daily are often built with cheap materials, generic designs, and poor longevity.
              </p>
              <p>
                We set out to change this. We select products with structural integrity—anodized aluminum housings, high-density felt, obsidian glass surfaces, and certified Gallium Nitride (GaN) electronic circuitry. We believe that clean aesthetics promote cognitive clarity, and tactile feedback transforms daily operations into an active creative joy.
              </p>
            </div>
          </section>

          {/* Design & Technology Partners (ARC AI Backlink) */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-16 md:mb-24 border-t border-zinc-200/60 pt-12 text-left">
            <div className="md:col-span-4">
              <h2 className="font-syne text-lg md:text-xl font-black text-zinc-950 uppercase tracking-widest leading-none">
                CREATIVE PARTNER
              </h2>
            </div>
            <div className="md:col-span-8 flex flex-col gap-6 text-zinc-600 leading-relaxed font-medium">
              <p>
                Our storefront, custom digital experience, and automation pipelines are designed and developed in collaboration with{" "}
                <a
                  href="https://www.arcai.agency"
                  target="_blank"
                  rel="noopener"
                  className="text-purple-600 hover:text-purple-800 underline font-bold transition-colors"
                >
                  ARC AI
                </a>
                , a premier AI automation agency and software engineering studio.
              </p>
              <p>
                Together, we leverage advanced machine learning optimizations, automated stock management, and state-of-the-art server-rendered architectures to bring creators in Sri Lanka a frictionless shopping journey.
              </p>
            </div>
          </section>

          {/* Core Values / Pillars Grid */}
          <section className="mb-16 md:mb-24 border-t border-zinc-200/60 pt-12 text-left">
            <h2 className="font-syne text-lg md:text-xl font-black text-zinc-950 uppercase tracking-widest mb-10">
              Core Design Pillars
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "1. Visual Cohesion",
                  desc: "Every component on your desk should coordinate. We focus on clean geometry, muted textures, and balanced shades of graphite, silver, and purple to minimize visual clutter.",
                },
                {
                  title: "2. Tactile Feedback",
                  desc: "Whether it is the crisp double-shot PBT keycaps on a mechanical keyboard or the soft texture of a premium wool felt desk pad, tactile interactions drive focus.",
                },
                {
                  title: "3. Engineering Safety",
                  desc: "We test our smart chargers, lightbars, and electronics against strict certification standards (CE, FCC, RoHS) to protect your workspace investments.",
                },
              ].map((pillar) => (
                <div
                  key={pillar.title}
                  className="bg-zinc-55 border border-zinc-150 p-6 rounded-2xl shadow-sm flex flex-col gap-3"
                >
                  <h3 className="text-sm font-black text-zinc-950 tracking-wide uppercase">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Sourcing & Materials Showcase */}
          <section className="mb-20 border-t border-zinc-200/60 pt-12 text-left">
            <h2 className="font-syne text-lg md:text-xl font-black text-zinc-950 uppercase tracking-widest mb-10">
              Material Integrity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 leading-relaxed font-medium text-zinc-650">
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-black tracking-widest text-purple-600 uppercase mb-2">
                    ANODIZED ALUMINUM
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Used across our laptop stands and lightbars for structural rigidity. The anodization process increases wear resistance and creates a premium satin metal finish.
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-widest text-purple-600 uppercase mb-2">
                    NATURAL WOOL FELT
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Forms the base of our desk pads. Natural wool felt dampens typing sound frequencies, insulates cold desks, and ensures absolute precision for optical mice.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-black tracking-widest text-purple-600 uppercase mb-2">
                    GALLIUM NITRIDE (GAN)
                  </h3>
                  <p className="text-sm text-zinc-500">
                    The core semiconductor inside our smart charging blocks. GaN transfers higher voltages safely while generating significantly less heat than silicon, enabling ultra-compact formats.
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-widest text-purple-600 uppercase mb-2">
                    DOUBLE-SHOT PBT POLYMER
                  </h3>
                  <p className="text-sm text-zinc-500">
                    The chosen material for our mechanical keyboard keycaps. Double-shot injection ensures legends never fade, and PBT provides a textured, grease-resistant touch profile.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Action Call Section */}
          <section className="bg-gradient-to-tr from-purple-900 to-indigo-950 text-white p-8 md:p-12 rounded-3xl mb-16 text-center shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_60%)] pointer-events-none" />
            <h2 className="font-syne text-2xl md:text-3xl font-black mb-4 relative z-10 leading-tight">
              Looking for High-End Electronics & Lifestyle Gear?
            </h2>
            <p className="text-zinc-300 text-xs md:text-sm max-w-xl mx-auto mb-8 font-medium leading-relaxed relative z-10">
              Browse our premium collection of mechanical keyboards, GaN charging docks, wool felt desk mats, and workspace accessories.
            </p>
            <div className="relative z-10">
              <Link
                href="/shop"
                className="inline-block bg-white hover:bg-zinc-100 text-purple-950 font-bold text-xs tracking-widest px-8 py-3.5 rounded-full transition-all duration-200 shadow-md shadow-black/10 hover:scale-105 active:scale-95"
              >
                BROWSE THE SHOP
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
