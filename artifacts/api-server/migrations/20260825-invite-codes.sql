-- Migration: invite-codes
-- Creates the admin/homeowner registration invite-code table declared in
-- lib/db/src/schema/schema.ts. This is intentionally limited to invite_codes.

CREATE TABLE IF NOT EXISTS public.invite_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  created_by VARCHAR REFERENCES public.users(id) ON DELETE SET NULL,
  used_by VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_invite_codes_code"
  ON public.invite_codes (code);
CREATE INDEX IF NOT EXISTS "IDX_invite_codes_is_active"
  ON public.invite_codes (is_active);