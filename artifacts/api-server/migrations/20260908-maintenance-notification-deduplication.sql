-- Keep only the most recently created unread maintenance notification for
-- each homeowner/task pair, then prevent that duplicate state from recurring.
WITH ranked_notifications AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY homeowner_id, maintenance_task_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS duplicate_rank
  FROM notifications
  WHERE is_read = false
    AND maintenance_task_id IS NOT NULL
)
DELETE FROM notifications
WHERE id IN (
  SELECT id
  FROM ranked_notifications
  WHERE duplicate_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "UX_notifications_unread_maintenance_task"
  ON notifications (homeowner_id, maintenance_task_id)
  WHERE is_read = false
    AND maintenance_task_id IS NOT NULL;