-- Migration: inspection-schema-additions
-- Adds columns for inspection-derived data, confidence scoring, and provenance tracking.
-- Idempotent — safe to re-run; all statements use ADD COLUMN IF NOT EXISTS / IF NOT EXISTS.
--
-- ── houses ────────────────────────────────────────────────────────────────────
-- year_built / square_footage: already present in schema.ts but included here
--   defensively so the migration is self-contained and safe to run against any
--   environment that may have been provisioned without them.
-- hvac_age / hvac_condition: inspection-extracted HVAC detail.
-- property_address_verified: cross-reference text from the inspection cover page;
--   never overwrites houses.address (homeowner-entered).
-- field_sources: jsonb map of column-name -> source home_documents.id;
--   only inspection-derived writes populate this; manual homeowner edits leave keys absent.
--   e.g. {"hvac_type": "doc-uuid-123", "hvac_age": "doc-uuid-123"}

ALTER TABLE houses
  ADD COLUMN IF NOT EXISTS year_built                INTEGER,
  ADD COLUMN IF NOT EXISTS square_footage            INTEGER,
  ADD COLUMN IF NOT EXISTS hvac_age                  INTEGER,
  ADD COLUMN IF NOT EXISTS hvac_condition             TEXT,
  ADD COLUMN IF NOT EXISTS property_address_verified  TEXT,
  ADD COLUMN IF NOT EXISTS field_sources              JSONB;


-- ── home_documents ────────────────────────────────────────────────────────────
-- ai_confidence: overall extraction confidence reported by the AI pipeline.
-- Expected values: 'high' | 'medium' | 'low' — nullable for documents not yet extracted.
-- (home_documents does not currently have this column; the ai_confidence that exists
--  elsewhere in the schema belongs to invoice_analyses, a different table.)

ALTER TABLE home_documents
  ADD COLUMN IF NOT EXISTS ai_confidence TEXT;


-- ── home_appliances ───────────────────────────────────────────────────────────
-- source_document_id: which inspection report produced this row (null = manual entry).
-- ON DELETE SET NULL so deleting the document doesn't cascade-delete the appliance record.

ALTER TABLE home_appliances
  ADD COLUMN IF NOT EXISTS source_document_id VARCHAR
    REFERENCES home_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_home_appliances_source_document_id
  ON home_appliances (source_document_id)
  WHERE source_document_id IS NOT NULL;


-- ── home_systems ──────────────────────────────────────────────────────────────
-- source_document_id: same provenance pattern as home_appliances above.

ALTER TABLE home_systems
  ADD COLUMN IF NOT EXISTS source_document_id VARCHAR
    REFERENCES home_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_home_systems_source_document_id
  ON home_systems (source_document_id)
  WHERE source_document_id IS NOT NULL;
