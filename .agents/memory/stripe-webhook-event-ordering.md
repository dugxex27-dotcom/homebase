---
name: Stripe subscription webhook out-of-order guard
description: How stale/out-of-order Stripe subscription webhook events (updated/deleted/payment_failed) are rejected, and why the guard is per-user-timestamp rather than per-subscription-ID.
---

Stripe does not guarantee webhook delivery order, and the existing dedup infrastructure (processedWebhookEventIds cache, claimStripeEvent) only protects against **exact duplicate** event redeliveries — it does nothing to stop a delayed/out-of-order **different** event from silently overwriting newer state with stale data.

**Design:** track a single `stripeSubscriptionEventAt` timestamp per user (the Stripe `event.created` time of the last successfully applied subscription-status-affecting event). Reject any incoming `customer.subscription.updated` / `customer.subscription.deleted` / `invoice.payment_failed` event whose `event.created` is strictly older than the stored timestamp — regardless of subscription ID.

**Why not match on subscription ID instead:** a hard block keyed on "does this event's subscription ID match the one on file" risks false-positive blocking of legitimate resubscribe/upgrade flows (a user's subscription ID can legitimately change). Rejecting by timestamp alone correctly blocks both same-subscription redeliveries and stale events from a since-replaced subscription, while a genuinely newer event (including one for a brand-new subscription ID) always passes and establishes a new baseline.

**How to apply:** the pure helper is `isStaleSubscriptionEvent(incomingEventCreatedAt, lastProcessedEventAt)` in routes.ts near the webhook idempotency cache section. Any new Stripe webhook handler that mutates subscription status/tier should call it the same way: compute `new Date(event.created * 1000)`, check staleness against `user.stripeSubscriptionEventAt` before writing, and pass the same timestamp through to the storage update call so it becomes the new baseline.

**Scope note:** non-webhook call sites that hit Stripe's live API directly (e.g. `/api/sync-subscription`, `/api/user` background sync, admin sync) were left out of this guard on purpose — they read fresh authoritative data from Stripe rather than acting on a possibly-stale webhook payload, so ordering isn't a concern there.

**Test gotcha:** `updateUserStripeSubscription` / `updateUserSubscriptionStatus` now take an optional trailing `eventAt: Date` arg. Any existing test asserting exact call args (`toHaveBeenCalledWith(...)`) on these two storage methods needs `expect.any(Date)` appended or it will fail even though behavior is correct.
