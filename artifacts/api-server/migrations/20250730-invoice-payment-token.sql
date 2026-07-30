-- Migration: invoice payment-link tokens
-- Adds short-lived signed-token columns to crm_invoices so that unauthenticated
-- homeowners can open an invoice from an emailed payment link without needing a
-- session login.  The raw token is embedded in the URL; only the SHA-256 digest
-- is stored here.
-- Idempotent — safe to re-run; all statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

ALTER TABLE crm_invoices
  ADD COLUMN IF NOT EXISTS payment_token         VARCHAR(64),
  ADD COLUMN IF NOT EXISTS payment_token_expires_at TIMESTAMP;

-- Optional: index to support a future cleanup job that expires stale tokens
CREATE INDEX IF NOT EXISTS idx_crm_invoices_payment_token_expires
  ON crm_invoices (payment_token_expires_at)
  WHERE payment_token IS NOT NULL;
