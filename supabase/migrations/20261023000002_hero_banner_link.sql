-- Migration: 20261023000002_hero_banner_link.sql
-- Description: Optional click-through link for hero banners. When set, the
-- whole banner is clickable and goes to this URL (e.g. a product page).

ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS link_url TEXT NOT NULL DEFAULT '';
