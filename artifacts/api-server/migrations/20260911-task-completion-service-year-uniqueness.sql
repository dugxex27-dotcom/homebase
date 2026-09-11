-- Record the normalized service type on invoice-backed task completions so the
-- database can enforce the same house/service/year rule as invoice confirmation.
ALTER TABLE task_completions
  ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Legacy invoice confirmations linked their scored completion through the
-- maintenance log. Backfill with the same normalization used by the API.
UPDATE task_completions AS completion
SET service_type = (
  SELECT lower(regexp_replace(btrim(log.service_type), '\s+', ' ', 'g')) AS normalized_service_type
  FROM maintenance_logs AS log
  WHERE log.task_completion_id = completion.id
    AND btrim(log.service_type) <> ''
  ORDER BY log.created_at ASC NULLS LAST, log.id ASC
  LIMIT 1
)
WHERE completion.service_type IS NULL
  AND EXISTS (
    SELECT 1
    FROM maintenance_logs AS log
    WHERE log.task_completion_id = completion.id
      AND btrim(log.service_type) <> ''
  );

-- Retain the earliest completion for each historical duplicate group and
-- repoint every known reference before removing the redundant rows.
CREATE TEMP TABLE task_completion_duplicate_map ON COMMIT DROP AS
WITH ranked_completions AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY house_id, service_type, year
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS retained_id,
    row_number() OVER (
      PARTITION BY house_id, service_type, year
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS duplicate_rank
  FROM task_completions
  WHERE service_type IS NOT NULL
)
SELECT id AS duplicate_id, retained_id
FROM ranked_completions
WHERE duplicate_rank > 1;

UPDATE maintenance_logs AS log
SET task_completion_id = duplicate.retained_id
FROM task_completion_duplicate_map AS duplicate
WHERE log.task_completion_id = duplicate.duplicate_id;

UPDATE invoice_analyses AS analysis
SET task_completion_id = duplicate.retained_id
FROM task_completion_duplicate_map AS duplicate
WHERE analysis.task_completion_id = duplicate.duplicate_id;

DO $$
BEGIN
  IF to_regclass('public.maintenance_evidence_reviews') IS NOT NULL THEN
    UPDATE maintenance_evidence_reviews AS review
    SET task_completion_id = duplicate.retained_id
    FROM task_completion_duplicate_map AS duplicate
    WHERE review.task_completion_id = duplicate.duplicate_id;
  END IF;
END
$$;

DELETE FROM task_completions AS completion
USING task_completion_duplicate_map AS duplicate
WHERE completion.id = duplicate.duplicate_id;

CREATE UNIQUE INDEX IF NOT EXISTS "UX_task_completions_house_service_year"
  ON task_completions (house_id, service_type, year)
  WHERE service_type IS NOT NULL;