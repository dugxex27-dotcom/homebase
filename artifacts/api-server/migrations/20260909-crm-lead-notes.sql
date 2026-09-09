-- Move the initial CRM lead note out of metadata into a dedicated editable field.
-- Idempotent so post-merge setup and local recovery can safely re-run it.
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS notes text;

UPDATE crm_leads
SET
  notes = COALESCE(notes, metadata ->> 'notes'),
  metadata = metadata - 'notes'
WHERE metadata ? 'notes';