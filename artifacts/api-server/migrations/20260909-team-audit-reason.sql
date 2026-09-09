-- Optional administrator-provided context for team suspension/removal events.
-- Idempotent so post-merge setup and local recovery can safely re-run it.
ALTER TABLE security_audit_logs
ADD COLUMN IF NOT EXISTS reason text;