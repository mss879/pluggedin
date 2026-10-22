-- Migration: 20261022000000_hero_banner_mobile_image.sql
-- Description: Separate mobile image for hero banners.
--
-- image_url stays the desktop/tablet image. mobile_image_url is shown on
-- screens narrower than 768px; when empty the desktop image is used.

ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS mobile_image_url TEXT NOT NULL DEFAULT '';
