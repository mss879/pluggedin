-- Migration: 20261023000001_weight_based_delivery.sql
-- Description: Weight-based delivery charges (replaces delivery areas).
--
--   Order weight up to 1 kg            -> Rs. 450
--   Every extra kg (or part of a kg)   -> + Rs. 100
--
-- Each product gets a weight in grams; the order's delivery charge is
-- calculated from the total weight of everything in the cart. The rates are
-- editable from Admin -> Delivery. Requires 20261021000000_admin_2fa.sql.

-- 1. Product weight
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_grams INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_weight_grams_check;
ALTER TABLE products ADD CONSTRAINT products_weight_grams_check CHECK (weight_grams >= 0);

-- 2. Delivery rates (single row, id = 1)
CREATE TABLE IF NOT EXISTS delivery_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    base_fee NUMERIC(10, 2) NOT NULL DEFAULT 450 CHECK (base_fee >= 0),
    base_weight_grams INTEGER NOT NULL DEFAULT 1000 CHECK (base_weight_grams > 0),
    extra_fee_per_kg NUMERIC(10, 2) NOT NULL DEFAULT 100 CHECK (extra_fee_per_kg >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on delivery_settings" ON delivery_settings;
DROP POLICY IF EXISTS "Allow admin insert on delivery_settings" ON delivery_settings;
DROP POLICY IF EXISTS "Allow admin update on delivery_settings" ON delivery_settings;

CREATE POLICY "Allow public read access on delivery_settings" ON delivery_settings
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Allow admin insert on delivery_settings" ON delivery_settings
    FOR INSERT TO authenticated
    WITH CHECK (public.is_verified_admin());

CREATE POLICY "Allow admin update on delivery_settings" ON delivery_settings
    FOR UPDATE TO authenticated
    USING (public.is_verified_admin())
    WITH CHECK (public.is_verified_admin());

INSERT INTO delivery_settings (id, base_fee, base_weight_grams, extra_fee_per_kg)
VALUES (1, 450, 1000, 100)
ON CONFLICT (id) DO NOTHING;

-- 3. Orders remember the total weight the charge was based on
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_weight_grams INTEGER;

-- The old delivery_zones table is no longer used by the site. It is left in
-- place (harmless); drop it whenever you like:
--   DROP TABLE IF EXISTS delivery_zones;
