---
name: Stripe webhook mutation keys
description: How to scope Stripe idempotency keys for webhook-driven mutations that may take different branches on retry.
---

Webhook-driven Stripe writes must use a stable key derived from the Stripe event ID and a distinct operation suffix.

**Why:** A retry can observe state changed by the first delivery. For example, an item-create attempt may return on retry through the item-update branch. Reusing one unsuffixed key across different Stripe endpoints or parameters can produce an idempotency mismatch instead of safely deduplicating the write.

**How to apply:** Give each possible mutation in a webhook flow its own deterministic suffix, such as product-create, price-create, item-create, item-update, or item-delete. Keep a durable database claim as the primary event guard where available.