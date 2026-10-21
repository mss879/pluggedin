-- Migration: 20261021000001_bank_transfer_payments.sql
-- Description: Editable bank transfer details for checkout, plus bank-slip
-- (receipt) tracking and a "cancelled" status on orders.

-- -----------------------------------------------------------------------------
-- 1. Payment settings (single row, id = 1) shown on checkout for bank transfer
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    bank_name TEXT NOT NULL DEFAULT '',
    account_name TEXT NOT NULL DEFAULT '',
    account_number TEXT NOT NULL DEFAULT '',
    branch TEXT NOT NULL DEFAULT '',
    payment_note TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on payment_settings" ON payment_settings;
DROP POLICY IF EXISTS "Allow admin insert on payment_settings" ON payment_settings;
DROP POLICY IF EXISTS "Allow admin update on payment_settings" ON payment_settings;

-- Storefront checkout needs to read the bank details
CREATE POLICY "Allow public read access on payment_settings" ON payment_settings
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Allow admin insert on payment_settings" ON payment_settings
    FOR INSERT TO authenticated
    WITH CHECK (auth.jwt() ->> 'email' = 'admin@pluggedin.com');

CREATE POLICY "Allow admin update on payment_settings" ON payment_settings
    FOR UPDATE TO authenticated
    USING (auth.jwt() ->> 'email' = 'admin@pluggedin.com')
    WITH CHECK (auth.jwt() ->> 'email' = 'admin@pluggedin.com');

-- Placeholder row — edit the real details from Admin → Bank Transfer
INSERT INTO payment_settings (id, bank_name, account_name, account_number, branch, payment_note)
VALUES (
    1,
    'Bank Name',
    'PluggedIn',
    '0000000000',
    'Branch',
    'Please send a photo of your bank slip with your Order ID to our WhatsApp number.'
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Orders: bank slip tracking + cancelled status
-- -----------------------------------------------------------------------------
-- NULL payment_status on a bank_transfer order means "awaiting receipt".
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT
    CHECK (payment_status IN ('receipt_received', 'receipt_not_received'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'fulfilled', 'shipped', 'delivered', 'cancelled'));
