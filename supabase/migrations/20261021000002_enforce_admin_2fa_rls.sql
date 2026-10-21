-- Migration: 20261021000002_enforce_admin_2fa_rls.sql
-- Description: Enforce admin 2FA at the database level.
--
-- Run AFTER 20261021000000_admin_2fa.sql and 20261021000001_bank_transfer_payments.sql.
--
-- Until now every admin policy only checked the JWT email, so a password-only
-- session (one that never entered the emailed code) could still read orders or
-- edit products by calling Supabase directly. These policies swap that check
-- for public.is_verified_admin(), which also requires the current session to
-- have passed 2FA. Public storefront read/insert policies are untouched.
--
-- This also closes hero_banners, whose write policies previously allowed ANY
-- authenticated user.

-- Catalog -------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow admin write access" ON products;
CREATE POLICY "Allow admin write access" ON products
    FOR ALL TO authenticated
    USING (public.is_verified_admin())
    WITH CHECK (public.is_verified_admin());

DROP POLICY IF EXISTS "Allow admin write access" ON collections;
CREATE POLICY "Allow admin write access" ON collections
    FOR ALL TO authenticated
    USING (public.is_verified_admin())
    WITH CHECK (public.is_verified_admin());

DROP POLICY IF EXISTS "Allow admin write access" ON collection_products;
CREATE POLICY "Allow admin write access" ON collection_products
    FOR ALL TO authenticated
    USING (public.is_verified_admin())
    WITH CHECK (public.is_verified_admin());

-- Orders --------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow select for authenticated admins" ON orders;
CREATE POLICY "Allow select for authenticated admins" ON orders
    FOR SELECT TO authenticated
    USING (public.is_verified_admin());

DROP POLICY IF EXISTS "Allow update for authenticated admins" ON orders;
CREATE POLICY "Allow update for authenticated admins" ON orders
    FOR UPDATE TO authenticated
    USING (public.is_verified_admin());

-- Contact inquiries ---------------------------------------------------------
DROP POLICY IF EXISTS "Allow select for authenticated admins" ON contact_inquiries;
CREATE POLICY "Allow select for authenticated admins" ON contact_inquiries
    FOR SELECT TO authenticated
    USING (public.is_verified_admin());

DROP POLICY IF EXISTS "Allow delete for authenticated admins" ON contact_inquiries;
CREATE POLICY "Allow delete for authenticated admins" ON contact_inquiries
    FOR DELETE TO authenticated
    USING (public.is_verified_admin());

-- Marquee offers ------------------------------------------------------------
DROP POLICY IF EXISTS "Allow insert for authenticated admins" ON marquee_offers;
CREATE POLICY "Allow insert for authenticated admins" ON marquee_offers
    FOR INSERT TO authenticated
    WITH CHECK (public.is_verified_admin());

DROP POLICY IF EXISTS "Allow delete for authenticated admins" ON marquee_offers;
CREATE POLICY "Allow delete for authenticated admins" ON marquee_offers
    FOR DELETE TO authenticated
    USING (public.is_verified_admin());

-- Analytics -----------------------------------------------------------------
DROP POLICY IF EXISTS "Allow read for authenticated admins" ON analytics_visits;
CREATE POLICY "Allow read for authenticated admins" ON analytics_visits
    FOR SELECT TO authenticated
    USING (public.is_verified_admin());

-- Hero banners --------------------------------------------------------------
DROP POLICY IF EXISTS "Allow insert for authenticated admins on hero_banners" ON hero_banners;
CREATE POLICY "Allow insert for authenticated admins on hero_banners" ON hero_banners
    FOR INSERT TO authenticated
    WITH CHECK (public.is_verified_admin());

DROP POLICY IF EXISTS "Allow update for authenticated admins on hero_banners" ON hero_banners;
CREATE POLICY "Allow update for authenticated admins on hero_banners" ON hero_banners
    FOR UPDATE TO authenticated
    USING (public.is_verified_admin());

DROP POLICY IF EXISTS "Allow delete for authenticated admins on hero_banners" ON hero_banners;
CREATE POLICY "Allow delete for authenticated admins on hero_banners" ON hero_banners
    FOR DELETE TO authenticated
    USING (public.is_verified_admin());

-- Payment settings ----------------------------------------------------------
DROP POLICY IF EXISTS "Allow admin insert on payment_settings" ON payment_settings;
CREATE POLICY "Allow admin insert on payment_settings" ON payment_settings
    FOR INSERT TO authenticated
    WITH CHECK (public.is_verified_admin());

DROP POLICY IF EXISTS "Allow admin update on payment_settings" ON payment_settings;
CREATE POLICY "Allow admin update on payment_settings" ON payment_settings
    FOR UPDATE TO authenticated
    USING (public.is_verified_admin())
    WITH CHECK (public.is_verified_admin());

-- Product image storage -----------------------------------------------------
DROP POLICY IF EXISTS "Admin Insert Access" ON storage.objects;
CREATE POLICY "Admin Insert Access" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'products' AND public.is_verified_admin());

DROP POLICY IF EXISTS "Admin Update Access" ON storage.objects;
CREATE POLICY "Admin Update Access" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'products' AND public.is_verified_admin())
    WITH CHECK (bucket_id = 'products' AND public.is_verified_admin());

DROP POLICY IF EXISTS "Admin Delete Access" ON storage.objects;
CREATE POLICY "Admin Delete Access" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'products' AND public.is_verified_admin());
