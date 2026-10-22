-- Migration: 20261022000001_delivery_zones.sql
-- Description: Admin-managed delivery areas & charges (e.g. "Within Colombo",
-- "Outside Colombo"). The customer picks one at checkout and its price is
-- added to the order total. Requires 20261021000000_admin_2fa.sql
-- (public.is_verified_admin).

CREATE TABLE IF NOT EXISTS delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    sort_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read of active delivery zones" ON delivery_zones;
DROP POLICY IF EXISTS "Allow admin insert on delivery_zones" ON delivery_zones;
DROP POLICY IF EXISTS "Allow admin update on delivery_zones" ON delivery_zones;
DROP POLICY IF EXISTS "Allow admin delete on delivery_zones" ON delivery_zones;

-- Storefront sees active zones; the admin also sees disabled ones
CREATE POLICY "Allow read of active delivery zones" ON delivery_zones
    FOR SELECT TO anon, authenticated
    USING (is_active OR public.is_verified_admin());

CREATE POLICY "Allow admin insert on delivery_zones" ON delivery_zones
    FOR INSERT TO authenticated
    WITH CHECK (public.is_verified_admin());

CREATE POLICY "Allow admin update on delivery_zones" ON delivery_zones
    FOR UPDATE TO authenticated
    USING (public.is_verified_admin())
    WITH CHECK (public.is_verified_admin());

CREATE POLICY "Allow admin delete on delivery_zones" ON delivery_zones
    FOR DELETE TO authenticated
    USING (public.is_verified_admin());

-- Starter areas at Rs. 0 (same as today's free delivery) — set the real
-- prices from Admin → Delivery.
INSERT INTO delivery_zones (name, price, sort_order)
SELECT v.name, 0, v.sort_order
FROM (VALUES ('Within Colombo', 1), ('Outside Colombo', 2)) AS v(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones);

-- Orders remember which area was chosen and what was charged
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;
