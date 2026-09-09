ALTER TABLE affiliate_payouts
  ADD COLUMN IF NOT EXISTS escalation_alert_sent_at TIMESTAMP;
