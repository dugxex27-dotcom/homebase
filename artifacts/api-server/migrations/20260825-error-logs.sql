-- Create the internal error-observability tables declared in the Drizzle
-- schema. These tables support client error ingestion and admin review only.

CREATE TABLE IF NOT EXISTS public.error_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  url text,
  user_agent text,
  user_id varchar REFERENCES public.users(id) ON DELETE SET NULL,
  user_email text,
  user_role text,
  severity text NOT NULL DEFAULT 'error',
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp,
  resolved_by varchar REFERENCES public.users(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_error_logs_type"
  ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS "IDX_error_logs_severity"
  ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS "IDX_error_logs_resolved"
  ON public.error_logs(resolved);
CREATE INDEX IF NOT EXISTS "IDX_error_logs_user_id"
  ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS "IDX_error_logs_created_at"
  ON public.error_logs(created_at);

CREATE TABLE IF NOT EXISTS public.error_breadcrumbs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  error_log_id varchar NOT NULL
    REFERENCES public.error_logs(id) ON DELETE CASCADE,
  "timestamp" timestamp NOT NULL,
  event_type text NOT NULL,
  message text NOT NULL,
  data jsonb
);

CREATE INDEX IF NOT EXISTS "IDX_error_breadcrumbs_error_log_id"
  ON public.error_breadcrumbs(error_log_id);
CREATE INDEX IF NOT EXISTS "IDX_error_breadcrumbs_timestamp"
  ON public.error_breadcrumbs("timestamp");