-- Migration: human review audit trail for maintenance evidence
-- Additive and idempotent. Automated evidence is retained in source records
-- and snapshotted again before every human decision.

CREATE TABLE IF NOT EXISTS public.maintenance_evidence_reviews (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_log_id VARCHAR REFERENCES public.maintenance_logs(id) ON DELETE SET NULL,
  task_completion_id VARCHAR REFERENCES public.task_completions(id) ON DELETE SET NULL,
  invoice_analysis_id VARCHAR REFERENCES public.invoice_analyses(id) ON DELETE SET NULL,
  reviewer_id VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  reviewer_email TEXT NOT NULL,
  decision TEXT NOT NULL,
  notes TEXT,
  automated_snapshot JSONB NOT NULL,
  resulting_ai_verification_status TEXT,
  resulting_verification_tier TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "CHK_maintenance_evidence_reviews_decision"
    CHECK (decision IN ('approve', 'reject', 'request_more_info')),
  CONSTRAINT "CHK_maintenance_evidence_reviews_source"
    CHECK (maintenance_log_id IS NOT NULL OR invoice_analysis_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "IDX_maintenance_evidence_reviews_log"
  ON public.maintenance_evidence_reviews (maintenance_log_id, created_at);
CREATE INDEX IF NOT EXISTS "IDX_maintenance_evidence_reviews_task"
  ON public.maintenance_evidence_reviews (task_completion_id, created_at);
CREATE INDEX IF NOT EXISTS "IDX_maintenance_evidence_reviews_invoice"
  ON public.maintenance_evidence_reviews (invoice_analysis_id, created_at);
CREATE INDEX IF NOT EXISTS "IDX_maintenance_evidence_reviews_reviewer"
  ON public.maintenance_evidence_reviews (reviewer_id, created_at);