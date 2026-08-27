---
name: Quantity-based team-seat billing
description: Contractor team pricing, capacity, and Stripe quantity-item compatibility decisions
---

The $20 contractor plan includes the owner plus two accepted members (three accepted people
total). Each accepted person beyond three costs $5/month regardless of role. Active and suspended
members are billable; pending invitations reserve capacity but are not billed; removed members
count neither. All non-removed people share one 50-person company ceiling.

- **Seat Price lookup, not an env var**: the $5/mo seat Price is found-or-created by a stable
  `lookup_key` (`contractor_tech_seat_v1`) rather than persisting a Price ID anywhere. Stripe
  enforces `lookup_key` uniqueness among active prices, so repeated create-or-find calls are
  idempotent. Keep this legacy lookup key even though the product is now named "Additional Team
  Seat," so existing subscriptions keep matching the same Price.
- **Quantity 0 means "no item," not "item with quantity 0"**: Stripe subscription items require
  quantity ≥ 1. When billed seats drop to 0 (cancellation, past_due, or team shrinks to the
  included-seat count), the code deletes the seat subscription item instead of trying to set its
  quantity to 0.
- **Seat item lookup key**: the existing item is found by matching `item.price.id` against the
  resolved seat Price ID — not by `usage_type === 'metered'` (that matched the old metered-item
  shape and no longer applies).

**Why:** Role-specific limits made capacity and billing disagree, while changing the Stripe lookup
key would strand existing subscription items. Quantity-based billing also cannot represent a real
"0" line item the way metered usage did.

**How to apply:** Count capacity and billing separately. Serialize invite/import admission against
the company row; do not sync Stripe for pending-invite creation/cancellation; sync on acceptance
and accepted-member removal. Never reintroduce role-specific ceilings or metered usage records.
