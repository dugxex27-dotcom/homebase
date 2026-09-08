ALTER TABLE invoice_analyses
ADD COLUMN IF NOT EXISTS contractor_id text,
ADD COLUMN IF NOT EXISTS crm_job_id text;