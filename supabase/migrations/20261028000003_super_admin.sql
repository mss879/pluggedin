-- Migration: 20261028000003_super_admin.sql
-- Description: Developer super admin (admin@arcai.agency) without the emailed
-- login code.
-- Requires 20261021000000_admin_2fa.sql.
--
-- Every admin permission (products, orders, collections, storage uploads, …)
-- goes through public.is_verified_admin(). It now returns true for:
--   1. admin@pluggedin.com once the current session has entered the emailed
--      code (unchanged), or
--   2. the super admin account admin@arcai.agency, as soon as it signs in
--      with its password. Its email must be confirmed in Supabase Auth.
--
-- The super admin is matched on the signed-in user's id in auth.users (not
-- just the email in the token), so an unconfirmed sign-up using that address
-- gets nothing.
-- Create the user first: Supabase -> Authentication -> Users -> Add user,
-- with "Auto Confirm User" ticked.

CREATE OR REPLACE FUNCTION public.is_verified_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        (
            coalesce(auth.jwt() ->> 'email', '') = 'admin@pluggedin.com'
            AND EXISTS (
                SELECT 1
                FROM public.admin_verified_sessions s
                WHERE s.session_id::text = coalesce(auth.jwt() ->> 'session_id', '')
                  AND s.expires_at > now()
            )
        )
        OR EXISTS (
            SELECT 1
            FROM auth.users u
            WHERE u.id = auth.uid()
              AND lower(u.email) = 'admin@arcai.agency'
              AND u.email_confirmed_at IS NOT NULL
        );
$$;

REVOKE ALL ON FUNCTION public.is_verified_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_verified_admin() TO anon, authenticated;
