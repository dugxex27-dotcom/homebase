ALTER TABLE crm_invoices
  ADD COLUMN IF NOT EXISTS idempotency_key varchar(128);

CREATE UNIQUE INDEX IF NOT EXISTS "UX_crm_invoices_idempotency"
  ON crm_invoices (contractor_user_id, idempotency_key);