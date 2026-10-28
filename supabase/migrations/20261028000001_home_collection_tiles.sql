-- Migration: 20261028000001_home_collection_tiles.sql
-- Description: The "Shop by Category" bento grid on the homepage, editable
-- from Admin -> Collections -> Homepage Grid. Each tile has an image, a title,
-- a link (usually a collection or category page), optional #hashtag chips and
-- a size (wide = 2 of 3 columns, narrow = 1 column).
-- Requires 20261021000000_admin_2fa.sql.

CREATE TABLE IF NOT EXISTS home_collection_tiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    link_url TEXT NOT NULL DEFAULT '/shop',
    tags TEXT[] NOT NULL DEFAULT '{}',
    size TEXT NOT NULL DEFAULT 'narrow' CHECK (size IN ('wide', 'narrow')),
    sort_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE home_collection_tiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on home_collection_tiles" ON home_collection_tiles;
CREATE POLICY "Allow public read on home_collection_tiles" ON home_collection_tiles
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow admin write on home_collection_tiles" ON home_collection_tiles;
CREATE POLICY "Allow admin write on home_collection_tiles" ON home_collection_tiles
    FOR ALL TO authenticated
    USING (public.is_verified_admin())
    WITH CHECK (public.is_verified_admin());

-- Seed with the four tiles that were hard-coded on the homepage
INSERT INTO home_collection_tiles (title, image_url, link_url, tags, size, sort_order)
SELECT * FROM (VALUES
    ('Home & Kitchen Essentials', '/categories/home_kitchen.webp', '/shop?category=Home and kitchen', ARRAY['lightbar', 'speaker'], 'wide', 1),
    ('Workspace Tech & Gadgets', '/categories/tech_gadgets.webp', '/shop?category=Tech & Gadgets', ARRAY['keyboard', 'mouse'], 'narrow', 2),
    ('Mobile & Auto Gear', '/categories/mobile_auto.webp', '/shop?category=Mobile & Auto', ARRAY['backpack', 'stand'], 'narrow', 3),
    ('Best Sellers Hub', '/categories/best_sellers.webp', '/shop?category=Best sellers', ARRAY['headphones', 'keyboard'], 'wide', 4)
) AS seed(title, image_url, link_url, tags, size, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM home_collection_tiles);
