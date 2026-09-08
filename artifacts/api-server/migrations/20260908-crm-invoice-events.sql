CREATE TABLE IF NOT EXISTS crm_invoice_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id varchar NOT NULL REFERENCES crm_invoices(id) ON DELETE CASCADE,
  field text NOT NULL,
  old_value text NOT NULL,
  new_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_crm_invoice_events_invoice_created"
  ON crm_invoice_events (invoice_id, created_at);