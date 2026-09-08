ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_invite_sent_at TIMESTAMPTZ;

UPDATE users
SET last_invite_sent_at = invite_expires_at - INTERVAL '7 days'
WHERE company_status = 'pending_invite'
  AND invite_expires_at IS NOT NULL
  AND last_invite_sent_at IS NULL;