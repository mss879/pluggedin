-- Migration: 20261028000000_product_stock_and_variants.sql
-- Description: Stock levels and product variants.
-- Requires 20261021000000_admin_2fa.sql.
--
-- products.stock    : units in stock for the whole product. NULL = not tracked.
-- products.variants : variant groups, each with options that can have their
--                     own image and stock (NULL = not tracked):
--   [{"name": "Color", "options": [{"name": "Black", "image": "https://…", "stock": 4}]},
--    {"name": "Size",  "options": [{"name": "XL", "image": "", "stock": null}]}]
--
-- Shoppers can read both columns (products are publicly readable); only the
-- verified admin can change them, and checkout takes stock through
-- reserve_product_stock(), which only the server (service role) can call.

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_check;
ALTER TABLE products ADD CONSTRAINT products_stock_check CHECK (stock IS NULL OR stock >= 0);

ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Existing products: their colour list becomes a "Color" variant group
UPDATE products
SET variants = jsonb_build_array(jsonb_build_object(
    'name', 'Color',
    'options', (
        SELECT jsonb_agg(jsonb_build_object('name', c, 'image', '', 'stock', NULL) ORDER BY ord)
        FROM unnest(colors) WITH ORDINALITY AS t(c, ord)
        WHERE btrim(c) <> ''
    )
))
WHERE variants = '[]'::jsonb
  AND colors IS NOT NULL
  AND EXISTS (SELECT 1 FROM unnest(colors) c WHERE btrim(c) <> '');

-- Orders remember each line's chosen options (items[].options, items is JSONB)
-- and whether stock was taken, so a cancelled order can put its stock back.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_reserved BOOLEAN NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- Takes stock for an order, all or nothing.
--   p_items: [{"id": "keyboard", "quantity": 2, "options": {"Color": "Black"}}]
-- Raises 'out_of_stock:<product name>' (rolling everything back) when any
-- product or chosen option doesn't have enough left. Untracked stock (NULL)
-- is never touched.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_product_stock(p_items JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item JSONB;
    prod RECORD;
    qty INTEGER;
    vars JSONB;
    grp JSONB;
    opt JSONB;
    chosen TEXT;
    g INTEGER;
    o INTEGER;
BEGIN
    FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
        qty := (item->>'quantity')::INTEGER;
        IF qty IS NULL OR qty < 1 THEN
            RAISE EXCEPTION 'invalid_quantity';
        END IF;

        SELECT id, name, stock, variants INTO prod
        FROM products WHERE id = item->>'id'
        FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'out_of_stock:%', item->>'id';
        END IF;

        IF prod.stock IS NOT NULL THEN
            IF prod.stock < qty THEN
                RAISE EXCEPTION 'out_of_stock:%', prod.name;
            END IF;
            UPDATE products SET stock = stock - qty WHERE id = prod.id;
        END IF;

        vars := prod.variants;
        IF jsonb_typeof(vars) = 'array' THEN
            FOR g IN 0 .. jsonb_array_length(vars) - 1 LOOP
                grp := vars->g;
                chosen := item->'options'->>(grp->>'name');
                CONTINUE WHEN chosen IS NULL OR jsonb_typeof(grp->'options') IS DISTINCT FROM 'array';
                FOR o IN 0 .. jsonb_array_length(grp->'options') - 1 LOOP
                    opt := grp->'options'->o;
                    IF opt->>'name' = chosen AND jsonb_typeof(opt->'stock') = 'number' THEN
                        IF (opt->>'stock')::INTEGER < qty THEN
                            RAISE EXCEPTION 'out_of_stock:% (%)', prod.name, chosen;
                        END IF;
                        vars := jsonb_set(vars, ARRAY[g::TEXT, 'options', o::TEXT, 'stock'],
                                          to_jsonb((opt->>'stock')::INTEGER - qty));
                    END IF;
                END LOOP;
            END LOOP;
            UPDATE products SET variants = vars WHERE id = prod.id;
        END IF;
    END LOOP;
END;
$$;

-- Puts stock back (order failed to save, or was cancelled). Same p_items shape.
CREATE OR REPLACE FUNCTION public.release_product_stock(p_items JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item JSONB;
    prod RECORD;
    qty INTEGER;
    vars JSONB;
    grp JSONB;
    opt JSONB;
    chosen TEXT;
    g INTEGER;
    o INTEGER;
BEGIN
    FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
        qty := (item->>'quantity')::INTEGER;
        CONTINUE WHEN qty IS NULL OR qty < 1;

        SELECT id, stock, variants INTO prod
        FROM products WHERE id = item->>'id'
        FOR UPDATE;
        CONTINUE WHEN NOT FOUND;

        IF prod.stock IS NOT NULL THEN
            UPDATE products SET stock = stock + qty WHERE id = prod.id;
        END IF;

        vars := prod.variants;
        IF jsonb_typeof(vars) = 'array' THEN
            FOR g IN 0 .. jsonb_array_length(vars) - 1 LOOP
                grp := vars->g;
                chosen := item->'options'->>(grp->>'name');
                CONTINUE WHEN chosen IS NULL OR jsonb_typeof(grp->'options') IS DISTINCT FROM 'array';
                FOR o IN 0 .. jsonb_array_length(grp->'options') - 1 LOOP
                    opt := grp->'options'->o;
                    IF opt->>'name' = chosen AND jsonb_typeof(opt->'stock') = 'number' THEN
                        vars := jsonb_set(vars, ARRAY[g::TEXT, 'options', o::TEXT, 'stock'],
                                          to_jsonb((opt->>'stock')::INTEGER + qty));
                    END IF;
                END LOOP;
            END LOOP;
            UPDATE products SET variants = vars WHERE id = prod.id;
        END IF;
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_product_stock(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_product_stock(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_product_stock(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_product_stock(JSONB) TO service_role;
