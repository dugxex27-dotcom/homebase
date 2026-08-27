---
name: Quantity-based tech-seat billing (replaces metered usage)
description: Design decisions for billing contractor tech seats as a Stripe quantity subscription item instead of metered usage records
---

Contractor tech-seat billing moved from metered usage-record reporting to a quantity-based
Stripe subscription item: 2 seats free, then $5/mo per additional seat billed via subscription
item `quantity`, not `createUsageRecord`.

- **Seat Price lookup, not an env var**: the $5/mo seat Price is found-or-created by a stable
  `lookup_key` (`contractor_tech_seat_v1`) rather than persisting a Price ID anywhere. Stripe
  enforces `lookup_key` uniqueness among active prices, so repeated create-or-find calls are
  idempotent. The resolved ID is cached in-process (reset via `resetSeatPriceCache()` in tests).
- **Quantity 0 means "no item," not "item with quantity 0"**: Stripe subscription items require
  quantity ≥ 1. When billed seats drop to 0 (cancellation, past_due, or team shrinks to the
  included-seat count), the code deletes the seat subscription item instead of trying to set its
  quantity to 0.
- **Seat item lookup key**: the existing item is found by matching `item.price.id` against the
  resolved seat Price ID — not by `usage_type === 'metered'` (that matched the old metered-item
  shape and no longer applies).

**Why:** Avoids needing a manually-managed Stripe Price ID in config, and quantity-based billing
doesn't support a real "0" line item the way metered usage did.

**How to apply:** Any new call site that needs to reconcile seat billing (checkout, invite,
remove, bulk import) should go through `syncSeatSubscriptionItem` / `syncSeatQuantityForSubscription`
rather than reintroducing usage-record calls or assuming a seat item always exists.
