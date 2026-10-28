/**
 * Who may sign in to /admin. Safe to import from client and server code.
 *
 * - ADMIN_EMAIL: the store owner. Signs in with password + emailed 6-digit code.
 * - SUPER_ADMIN_EMAIL: the developer. Same admin rights, no emailed code —
 *   the database function public.is_verified_admin() treats this account as
 *   verified (see migration 20261028000003_super_admin.sql).
 */
export const ADMIN_EMAIL = "admin@pluggedin.com";
export const SUPER_ADMIN_EMAIL = "admin@arcai.agency";

const normalize = (email: string | null | undefined) => (email || "").trim().toLowerCase();

export const isAdminEmail = (email: string | null | undefined) =>
  [ADMIN_EMAIL, SUPER_ADMIN_EMAIL].includes(normalize(email));

export const isSuperAdminEmail = (email: string | null | undefined) => normalize(email) === SUPER_ADMIN_EMAIL;
