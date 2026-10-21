/**
 * Bank transfer details shown at checkout and in bank-transfer order emails.
 * Stored as a single row (id = 1) in the `payment_settings` table and edited
 * from Admin → Bank Transfer. No SDK import here so storefront components can
 * use it without pulling in Supabase.
 */
export interface PaymentSettings {
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string;
  /** Free-text note shown just below the bank details (e.g. where to send the slip). */
  payment_note: string;
}

export const EMPTY_PAYMENT_SETTINGS: PaymentSettings = {
  bank_name: "",
  account_name: "",
  account_number: "",
  branch: "",
  payment_note: "",
};

export const BANK_RECEIPT_DEADLINE_NOTICE =
  "If the payment receipt for your bank transfer is not provided within 24 hours, your order will be cancelled.";

export function hasBankDetails(s: PaymentSettings | null | undefined): s is PaymentSettings {
  return !!s && !!(s.bank_name || s.account_number);
}

export function normalizePaymentSettings(row: Partial<PaymentSettings> | null | undefined): PaymentSettings {
  return {
    bank_name: row?.bank_name || "",
    account_name: row?.account_name || "",
    account_number: row?.account_number || "",
    branch: row?.branch || "",
    payment_note: row?.payment_note || "",
  };
}
