-- Migration: invoice-hash
-- Adds the nullable SHA-256 content hash used to prevent duplicate invoice scans.
-- This is intentionally limited to invoice_analyses; do not treat it as a
-- generated full-schema migration.

ALTER TABLE public.invoice_analyses
  ADD COLUMN IF NOT EXISTS invoice_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_analyses_house_hash
  ON public.invoice_analyses (house_id, invoice_hash);