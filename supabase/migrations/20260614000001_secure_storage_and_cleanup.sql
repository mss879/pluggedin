-- =============================================================================
-- Security hardening: restrict product image storage writes to the admin only.
--
-- Previously the storage policies allowed ANY authenticated user to upload,
-- overwrite, or delete files in the public `products` bucket. This mirrors the
-- table policies (20260614000000_secure_rls_policies.sql) so only the verified
-- admin email can mutate storage objects. Public read stays open (images must
-- be viewable on the storefront).
-- =============================================================================

-- Drop the previous, overly-permissive write policies
DROP POLICY IF EXISTS "Admin Insert Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Access" ON storage.objects;

-- Public read remains (re-created idempotently)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'products');

-- Writes restricted to the verified admin email
CREATE POLICY "Admin Insert Access" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'products'
        AND auth.jwt() ->> 'email' = 'admin@pluggedin.com'
    );

CREATE POLICY "Admin Update Access" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'products'
        AND auth.jwt() ->> 'email' = 'admin@pluggedin.com'
    )
    WITH CHECK (
        bucket_id = 'products'
        AND auth.jwt() ->> 'email' = 'admin@pluggedin.com'
    );

CREATE POLICY "Admin Delete Access" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'products'
        AND auth.jwt() ->> 'email' = 'admin@pluggedin.com'
    );


-- =============================================================================
-- OPTIONAL: remove the USD / US-based showcase seed rows before going live, so
-- the live admin dashboard doesn't display fake orders/analytics/inquiries.
-- These are SAFE to delete (they are mock data) but are left COMMENTED OUT so
-- nothing is removed unless you choose to. Uncomment and re-run to clean.
-- =============================================================================

-- DELETE FROM orders WHERE id IN ('ORD-20260612-921A', 'ORD-20260611-304B', 'ORD-20260610-855C');
-- DELETE FROM contact_inquiries WHERE email IN ('liam.johnson@example.com', 'sophia.smith@example.com', 'jackson.davis@example.com');
-- DELETE FROM analytics_visits WHERE user_agent = 'Mozilla/5.0...';
