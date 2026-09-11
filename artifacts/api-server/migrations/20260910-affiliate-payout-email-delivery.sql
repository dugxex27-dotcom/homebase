ALTER TABLE affiliate_payouts
  ADD COLUMN IF NOT EXISTS email_status TEXT NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS email_attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_next_attempt_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS email_last_error TEXT,
  ADD COLUMN IF NOT EXISTS email_claim_token VARCHAR,
  ADD COLUMN IF NOT EXISTS email_claim_lease_until TIMESTAMP;

-- Existing rows receive not_applicable from the column default. Do not run a
-- later UPDATE here: migration replay must never reset legitimate pending jobs.
-- Only a future atomic paid transition explicitly sets email_status=pending.

CREATE INDEX IF NOT EXISTS "IDX_affiliate_payouts_email_delivery"
  ON affiliate_payouts (email_status, email_next_attempt_at);