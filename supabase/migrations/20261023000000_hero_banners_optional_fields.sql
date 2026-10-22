-- Migration: 20261023000000_hero_banners_optional_fields.sql
-- Description: Every hero banner field is optional. Empty text/buttons are
-- simply not shown on the storefront; a banner with no image shows a dark
-- background.
--
-- Also lets anonymous storefront visitors evaluate public.is_verified_admin()
-- (it just returns false for them). The delivery_zones read policy calls it,
-- and without EXECUTE an anonymous checkout read can fail with
-- "permission denied for function is_verified_admin".

ALTER TABLE hero_banners ALTER COLUMN title DROP NOT NULL;
ALTER TABLE hero_banners ALTER COLUMN title SET DEFAULT '';
ALTER TABLE hero_banners ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE hero_banners ALTER COLUMN image_url SET DEFAULT '';

GRANT EXECUTE ON FUNCTION public.is_verified_admin() TO anon;
