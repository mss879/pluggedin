-- Migration: 20261021000000_admin_2fa.sql
-- Description: Email two-factor authentication for the admin dashboard.
--
-- Flow: the admin signs in with email + password (Supabase Auth). The server
-- then emails a 6-digit code to the 2FA inbox (ADMIN_2FA_EMAIL, default
-- pluggedin58@gmail.com). Only after the code is entered is the Supabase
-- session (identified by the `session_id` JWT claim) recorded as verified.
--
-- Both tables have RLS enabled with NO policies, so they are only reachable by
-- the service role (server API routes). The browser can never write a code or
-- mark its own session as verified.
--
-- Requires SUPABASE_SERVICE_ROLE_KEY to be set on the server.

CREATE TABLE IF NOT EXISTS admin_otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_otp_codes_session_idx ON admin_otp_codes (session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_verified_sessions (
    session_id UUID PRIMARY KEY,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE admin_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_verified_sessions ENABLE ROW LEVEL SECURITY;

-- Returns true when the caller is the admin AND their current Supabase session
-- has passed the email 2FA step. SECURITY DEFINER so it can read
-- admin_verified_sessions without exposing that table to the browser.
CREATE OR REPLACE FUNCTION public.is_verified_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        coalesce(auth.jwt() ->> 'email', '') = 'admin@pluggedin.com'
        AND EXISTS (
            SELECT 1
            FROM public.admin_verified_sessions s
            WHERE s.session_id::text = coalesce(auth.jwt() ->> 'session_id', '')
              AND s.expires_at > now()
        );
$$;

REVOKE ALL ON FUNCTION public.is_verified_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_verified_admin() TO authenticated;
