-- Public contact forms create guest support tickets, so user_id must be nullable.
ALTER TABLE public.support_tickets ALTER COLUMN user_id DROP NOT NULL;