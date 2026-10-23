-- Migration: 20261023000003_discounts_and_free_delivery.sql
-- Description: Free-delivery offer + discount / coupon codes.
-- Requires 20261021000000_admin_2fa.sql and 20261023000001_weight_based_delivery.sql.

-- -----------------------------------------------------------------------------
-- 1. Free delivery offer (Admin -> Delivery): when switched on, orders whose
--    basket (after any discount code) reaches the minimum get free delivery.
-- -----------------------------------------------------------------------------
ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS free_delivery_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS free_delivery_min_subtotal NUMERIC(10, 2) NOT NULL DEFAULT 5000;
ALTER TABLE delivery_settings DROP CONSTRAINT IF EXISTS delivery_settings_free_min_check;
ALTER TABLE delivery_settings ADD CONSTRAINT delivery_settings_free_min_check CHECK (free_delivery_min_subtotal >= 0);

-- -----------------------------------------------------------------------------
-- 2. Discount codes (Admin -> Discounts)
--   percent_order   : value % off the whole basket
--   fixed_order     : Rs. value off the whole basket
--   percent_product : value % off the chosen products
--   fixed_product   : Rs. value off each unit of the chosen products
--   buy_x_get_y     : buy `buy_qty`, get `get_qty` free (per product line;
--                     chosen products, or every product when none chosen)
--   free_delivery   : delivery charge waived
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    discount_type TEXT NOT NULL CHECK (discount_type IN (
        'percent_order', 'fixed_order', 'percent_product', 'fixed_product', 'buy_x_get_y', 'free_delivery'
    )),
    value NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (value >= 0),
    product_ids TEXT[] NOT NULL DEFAULT '{}',
    buy_qty INTEGER NOT NULL DEFAULT 1 CHECK (buy_qty >= 1),
    get_qty INTEGER NOT NULL DEFAULT 1 CHECK (get_qty >= 1),
    min_subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (min_subtotal >= 0),
    max_uses INTEGER CHECK (max_uses IS NULL OR max_uses >= 1),
    used_count INTEGER NOT NULL DEFAULT 0,
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT discount_codes_percent_check CHECK (
        discount_type NOT IN ('percent_order', 'percent_product') OR value <= 100
    )
);

-- Codes are case-insensitive and unique
CREATE UNIQUE INDEX IF NOT EXISTS discount_codes_code_unique ON discount_codes (upper(code));

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Admin only. Shoppers never read this table directly (that would let anyone
-- list every code); checkout validates a single code through the server.
DROP POLICY IF EXISTS "Allow admin all on discount_codes" ON discount_codes;
CREATE POLICY "Allow admin all on discount_codes" ON discount_codes
    FOR ALL TO authenticated
    USING (public.is_verified_admin())
    WITH CHECK (public.is_verified_admin());

-- Atomically claims one use of a code (respecting max_uses). Server-only.
CREATE OR REPLACE FUNCTION public.claim_discount_code_use(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH claimed AS (
        UPDATE public.discount_codes
        SET used_count = used_count + 1, updated_at = now()
        WHERE id = p_id
          AND is_active
          AND (max_uses IS NULL OR used_count < max_uses)
        RETURNING 1
    )
    SELECT EXISTS (SELECT 1 FROM claimed);
$$;

-- Gives a use back if the order then failed to save. Server-only.
CREATE OR REPLACE FUNCTION public.release_discount_code_use(p_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.discount_codes
    SET used_count = greatest(used_count - 1, 0), updated_at = now()
    WHERE id = p_id;
$$;

REVOKE ALL ON FUNCTION public.claim_discount_code_use(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_discount_code_use(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_discount_code_use(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_discount_code_use(UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 3. Orders remember the code and how much it took off
-- -----------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
