-- Restrict review flag reasons to the values accepted by the application.
-- The guard keeps this migration safe if schema push already created the check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.review_flags'::regclass
      AND conname = 'CHK_review_flags_reason'
  ) THEN
    ALTER TABLE review_flags
      ADD CONSTRAINT "CHK_review_flags_reason"
      CHECK (reason IN ('fake', 'inappropriate', 'spam', 'other'));
  END IF;
END
$$;