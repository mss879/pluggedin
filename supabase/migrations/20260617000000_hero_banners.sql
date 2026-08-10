-- Migration: 20260617000000_hero_banners.sql
-- Description: Create hero_banners table with Row Level Security (RLS) policies and seed initial hero banners (up to 5 limit)

CREATE TABLE IF NOT EXISTS hero_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT DEFAULT '',
    badge TEXT DEFAULT '⚡ CREATOR ESSENTIALS',
    tag TEXT DEFAULT 'FEATURED COLLECTION',
    image_url TEXT NOT NULL,
    primary_cta_text TEXT DEFAULT 'SHOP CREATOR GEAR',
    primary_cta_href TEXT DEFAULT '/shop',
    secondary_cta_text TEXT DEFAULT 'EXPLORE COLLECTION',
    secondary_cta_href TEXT DEFAULT '/shop?collection=trending',
    sort_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anonymous read access on hero_banners" ON hero_banners;
DROP POLICY IF EXISTS "Allow insert for authenticated admins on hero_banners" ON hero_banners;
DROP POLICY IF EXISTS "Allow update for authenticated admins on hero_banners" ON hero_banners;
DROP POLICY IF EXISTS "Allow delete for authenticated admins on hero_banners" ON hero_banners;

-- Public read access for storefront visitors
CREATE POLICY "Allow anonymous read access on hero_banners" ON hero_banners
    FOR SELECT TO anon, authenticated
    USING (true);

-- Authenticated admin full permissions
CREATE POLICY "Allow insert for authenticated admins on hero_banners" ON hero_banners
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update for authenticated admins on hero_banners" ON hero_banners
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "Allow delete for authenticated admins on hero_banners" ON hero_banners
    FOR DELETE TO authenticated
    USING (true);

-- Seed initial 3 Hero Banners (Max limit: 5)
INSERT INTO hero_banners (title, subtitle, badge, tag, image_url, primary_cta_text, primary_cta_href, secondary_cta_text, secondary_cta_href, sort_order, is_active)
VALUES
(
  'ELEVATE YOUR CREATIVE SETUP',
  'A curated collection of space-saving workspace essentials, tactile mechanical keyboards, smart desktop chargers & studio gear built for creator performance.',
  '⚡ FAST ISLANDWIDE SHIPPING',
  'FEATURED COLLECTION 2026',
  '/posters/hero.webp',
  'SHOP CREATOR GEAR',
  '/shop',
  'EXPLORE TRENDING',
  '/shop?collection=trending',
  1,
  true
),
(
  'CRAFTSMANSHIP REDEFINED',
  'Ultra-responsive tactile switches, custom acoustic damping, and studio-grade audio components engineered for seamless everyday speed.',
  '🛡️ 1-YEAR OFFICIAL WARRANTY',
  'MECHANICAL & AUDIO GEAR',
  '/posters/Create_commercial_for_web_store_202606112343.webp',
  'SHOP KEYBOARDS',
  '/shop',
  'VIEW NEW ARRIVALS',
  '/shop?collection=new-in',
  2,
  true
),
(
  'CLEAN DESK. ZERO CLUTTER.',
  'Smart wireless charging docks, carbon fiber laptop lifts & glare-free monitor lightbars to transform your workspace into a productive sanctuary.',
  '🚚 SAME DAY DISPATCH',
  'DESK ACCESSORIES & LIGHTING',
  '/banner_1.webp',
  'EXPLORE ACCESSORIES',
  '/shop',
  'DISCOVER ALL PRODUCTS',
  '/shop',
  3,
  true
);
