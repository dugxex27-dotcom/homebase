-- Keep the earliest flag for each user/review pair if historical duplicates
-- exist, then enforce one flag per reporter and review at the database layer.
WITH ranked_flags AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY review_id, reported_by
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS duplicate_rank
  FROM review_flags
)
DELETE FROM review_flags
WHERE id IN (
  SELECT id
  FROM ranked_flags
  WHERE duplicate_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "UX_review_flags_review_reporter"
  ON review_flags (review_id, reported_by);