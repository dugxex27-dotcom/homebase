---
name: Stripe subscription event ordering
description: How Stripe subscription state is serialized across instances and reconciled when webhook timestamps collide.
---

Stripe does not guarantee webhook delivery order, and the existing dedup infrastructure (processedWebhookEventIds cache, claimStripeEvent) only protects against **exact duplicate** event redeliveries — it does nothing to stop a delayed/out-of-order **different** event from silently overwriting newer state with stale data.

**Rule:** serialize every subscription-state transition for a user with the same cross-instance database advisory lock, re-read the user while locked, and persist subscription ID, price, status, and event watermark in one atomic write. Use the Stripe event timestamp to reject older events, but define explicit precedence for equal-second collisions: deleted beats updated, updated beats created, updated beats payment failure, and invoice.paid loses to an already-applied cancellation or payment failure. Reconcile ambiguous equal-second updates from Stripe's current subscription.

**Why:** Stripe does not guarantee delivery order, its event timestamps have only second precision, and duplicate-event claims do not protect against different events racing across API instances. A read-before-lock stale check or separate ID/status writes can still let an older event finish last. Checkout snapshots can race too, so they must use the same lock and refuse to write if the subscription-event watermark advanced during retrieval.

**How to apply:** any path that changes persisted Stripe subscription identity or entitlement status must use the shared per-user subscription-state lock. Webhook snapshots advance the watermark; checkout reconciliation does not, because a checkout event timestamp is not a subscription-state version. Narrow entitlement updates must stay inside the lock and must not broad-upsert a stale user snapshot.

**Why not match on subscription ID instead:** a hard block keyed on "does this event's subscription ID match the one on file" risks false-positive blocking of legitimate resubscribe/upgrade flows (a user's subscription ID can legitimately change). Rejecting by timestamp alone correctly blocks both same-subscription redeliveries and stale events from a since-replaced subscription, while a genuinely newer event (including one for a brand-new subscription ID) always passes and establishes a new baseline.

**Why not match on subscription ID instead:** subscription IDs legitimately change during resubscribe and upgrade flows. Ordering must select the authoritative transition without rejecting a valid newer subscription merely because its ID differs.
