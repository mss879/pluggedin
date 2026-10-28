-- Migration: 20261028000002_home_sections.sql
-- Description: Homepage layout (Admin -> Homepage Layout). Every block of the
-- homepage is a row here, shown top to bottom by sort_order:
--   builtin    : one of the original homepage blocks (builtin_key). These can
--                be moved and hidden; their content is edited elsewhere (Hero
--                Banners, Offer Section, Collections -> Homepage Grid).
--   banner     : a full-width image/video banner with optional text, button
--                and link.
--   collection : the products of a collection, like "Trending" / "New In".
-- The footer is always last and is not a row.
-- Requires 20261021000000_admin_2fa.sql and 20260612000001_collections.sql.

CREATE TABLE IF NOT EXISTS home_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type TEXT NOT NULL CHECK (section_type IN ('builtin', 'banner', 'collection')),
    builtin_key TEXT,
    title TEXT NOT NULL DEFAULT '',
    subtitle TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    mobile_image_url TEXT NOT NULL DEFAULT '',
    link_url TEXT NOT NULL DEFAULT '',
    button_text TEXT NOT NULL DEFAULT '',
    collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
    product_limit INTEGER NOT NULL DEFAULT 8 CHECK (product_limit BETWEEN 1 AND 24),
    sort_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT home_sections_builtin_key_check CHECK (
        (section_type = 'builtin') = (builtin_key IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS home_sections_builtin_key_unique
    ON home_sections (builtin_key) WHERE builtin_key IS NOT NULL;

ALTER TABLE home_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on home_sections" ON home_sections;
CREATE POLICY "Allow public read on home_sections" ON home_sections
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow admin write on home_sections" ON home_sections;
CREATE POLICY "Allow admin write on home_sections" ON home_sections
    FOR ALL TO authenticated
    USING (public.is_verified_admin())
    WITH CHECK (public.is_verified_admin());

-- The homepage as it is today, top to bottom
INSERT INTO home_sections (section_type, builtin_key, sort_order)
VALUES
    ('builtin', 'hero', 1),
    ('builtin', 'perks', 2),
    ('builtin', 'marquee', 3),
    ('builtin', 'category_grid', 4),
    ('builtin', 'video_banner', 5),
    ('builtin', 'trending', 6),
    ('builtin', 'dual_video', 7),
    ('builtin', 'new_in', 8),
    ('builtin', 'lifestyle_gallery', 9),
    ('builtin', 'why_us', 10),
    ('builtin', 'faq', 11)
ON CONFLICT DO NOTHING;
