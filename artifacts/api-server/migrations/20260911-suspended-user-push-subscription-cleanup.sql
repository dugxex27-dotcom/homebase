-- Remove legacy Web Push subscriptions owned by accounts that were already
-- suspended or removed before account-status changes began cleaning them up.
--
-- Select the exact rows first, then delete that selected set. If this migration
-- is run again, the selection is empty and the delete is a no-op.
WITH orphaned_subscriptions AS (
  SELECT subscription.id
  FROM push_subscriptions AS subscription
  INNER JOIN users AS owner
    ON owner.id = subscription.user_id
  WHERE owner.company_status IN ('suspended', 'removed')
)
DELETE FROM push_subscriptions AS subscription
USING orphaned_subscriptions AS orphaned
WHERE subscription.id = orphaned.id;