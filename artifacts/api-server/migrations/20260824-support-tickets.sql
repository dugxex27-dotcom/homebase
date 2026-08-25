-- Migration: support-tickets
-- Creates the support ticket tables and indexes declared in the Drizzle schema.
-- This is intentionally limited to the support ticket feature.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_to_admin_id VARCHAR REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to_admin_email TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_support_tickets_user_id"
  ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS "IDX_support_tickets_status"
  ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS "IDX_support_tickets_category"
  ON public.support_tickets (category);
CREATE INDEX IF NOT EXISTS "IDX_support_tickets_assigned_to"
  ON public.support_tickets (assigned_to_admin_id);
CREATE INDEX IF NOT EXISTS "IDX_support_tickets_created_at"
  ON public.support_tickets (created_at);

CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  is_automated BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_ticket_replies_ticket_id"
  ON public.ticket_replies (ticket_id);
CREATE INDEX IF NOT EXISTS "IDX_ticket_replies_user_id"
  ON public.ticket_replies (user_id);
CREATE INDEX IF NOT EXISTS "IDX_ticket_replies_created_at"
  ON public.ticket_replies (created_at);