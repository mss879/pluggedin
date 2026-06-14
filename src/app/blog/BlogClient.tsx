"use client";

import { useState } from "react";
import Link from "next/link";
import { BLOG_POSTS, BlogPost } from "./data";
import Footer from "@/components/Footer";

export default function BlogClient() {
  const [selectedCat, setSelectedCat] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const categories = ["All", "Workspace", "Electronics", "Lifestyle", "Keyboard"];

  // Filter posts based on search query and category
  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCategory = selectedCat === "All" || post.category === selectedCat;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.keyword.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Featured post: first post when category is All and no search, or first matching post
  const featuredPost = filteredPosts[0];
  const gridPosts = filteredPosts.slice(1);

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-outfit flex flex-col justify-between">
      {/* Content wrapper */}
      <div className="pt-24 md:pt-32 flex-grow">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          
          {/* Breadcrumbs */}
          <nav className="mb-8 text-[10px] font-black tracking-widest text-zinc-400 uppercase text-left">
            <Link href="/" className="hover:text-purple-650 transition-colors">HOME</Link>
            <span className="mx-2.5">/</span>
            <span className="text-zinc-850">CREATOR BLOG</span>
          </nav>

          {/* Header Title */}
          <header className="mb-10 text-left">
            <h1 className="font-outfit text-4xl md:text-6xl font-extrabold text-zinc-955 tracking-tight leading-[1.1] mb-5">
              The Creator <br className="hidden md:inline" />
              <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 bg-clip-text text-transparent">
                Setup Journal
              </span>
            </h1>
            <p className="text-zinc-500 text-sm md:text-base font-medium tracking-wide max-w-xl leading-relaxed">
              In-depth workspace blueprints, mechanical keyboard guides, and smart electronic insights designed to optimize focus and performance.
            </p>
          </header>

          {/* Search & Category Filter Section */}
          <section className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/60 pb-6 relative z-20">
            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 order-2 md:order-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer ${
                    selectedCat === cat
                      ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                      : "bg-zinc-50 border-zinc-200/60 hover:bg-zinc-100 text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="flex items-center bg-zinc-50 border border-zinc-200/60 rounded-full px-4 py-2 shadow-inner w-full md:w-[260px] order-1 md:order-2">
              <svg className="w-4 h-4 text-purple-600 shrink-0 mr-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-zinc-900 placeholder-zinc-400 focus:outline-none"
              />
            </div>
          </section>

          {/* Empty State */}
          {filteredPosts.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="p-4 bg-purple-50 rounded-full text-purple-400 mb-4 border border-purple-100/30">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-base font-extrabold text-zinc-800 mb-1.5 font-outfit uppercase tracking-wider">
                No Articles Found
              </h3>
              <p className="text-xs text-zinc-500 max-w-[280px] leading-relaxed">
                We couldn't find any articles matching your search query. Try typing another term.
              </p>
            </div>
          )}

          {/* Featured Post Card */}
          {featuredPost && (
            <section className="mb-14 text-left">
              <Link 
                href={`/blog/${featuredPost.slug}`}
                className="group flex flex-col md:grid md:grid-cols-12 gap-6 bg-zinc-55 border border-zinc-150 p-5 rounded-3xl transition-all duration-300 hover:shadow-lg hover:border-purple-500/20"
              >
                {/* Blog Cover Image */}
                <div className="md:col-span-6 rounded-2xl overflow-hidden border border-zinc-200/40 relative aspect-video md:aspect-auto md:h-full min-h-[200px] bg-zinc-50">
                  <img 
                    src={featuredPost.image} 
                    alt={featuredPost.title} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute top-4 left-4 text-[9px] font-black tracking-[0.2em] text-purple-600 bg-white border border-purple-200/30 px-3.5 py-1.5 rounded-full shadow-sm z-10">
                    FEATURED ENTRY
                  </span>
                </div>
                {/* Text Details */}
                <div className="md:col-span-6 flex flex-col justify-between gap-4 py-2">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2.5 text-[9px] font-bold tracking-widest text-purple-600 uppercase">
                      <span>{featuredPost.category}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-300" />
                      <span className="text-zinc-400">{featuredPost.readTime}</span>
                    </div>
                    <h2 className="font-outfit text-xl md:text-2xl font-bold text-zinc-950 tracking-tight leading-tight group-hover:text-purple-650 transition-colors">
                      {featuredPost.title}
                    </h2>
                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                      {featuredPost.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-zinc-950 uppercase tracking-widest border-t border-zinc-200/40 pt-4">
                    <span>READ ARTICLE</span>
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* Grid of Remaining Posts */}
          {gridPosts.length > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 text-left">
              {gridPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col justify-between bg-zinc-55 border border-zinc-150 p-5 rounded-3xl transition-all duration-300 hover:shadow-lg hover:border-purple-500/20"
                >
                  <div className="flex flex-col gap-4">
                    <div className="h-36 rounded-xl overflow-hidden border border-zinc-200/40 relative bg-zinc-50">
                      <img 
                        src={post.image} 
                        alt={post.title} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
                      <span className="absolute top-3 left-3 text-[8px] font-bold tracking-[0.15em] text-zinc-500 bg-white/95 backdrop-blur-sm border border-zinc-200/50 px-2.5 py-1 rounded-full shadow-sm z-10">
                        SETUP JOURNAL
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5 text-[8px] font-bold tracking-widest text-purple-600 uppercase">
                        <span>{post.category}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-300" />
                        <span className="text-zinc-400">{post.readTime}</span>
                      </div>
                      <h3 className="font-outfit text-base font-bold text-zinc-950 tracking-tight leading-snug group-hover:text-purple-650 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[9px] font-black text-zinc-950 uppercase tracking-widest border-t border-zinc-200/40 pt-4 mt-5">
                    <span>READ ARTICLE</span>
                    <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </Link>
              ))}
            </section>
          )}

        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
