---
name: Payout email outbox migration
description: Safe initialization and ownership rules for durable affiliate payout confirmation delivery
---

Existing payout rows must initialize email delivery as `not_applicable`. Only the same payout-row update that records a new successful transfer may change delivery to `pending`; the retry worker must never call Stripe.

**Why:** Backfilling historical paid payouts as pending can resend confirmations for old transfers. Keeping delivery state on the payout row also removes the failure window between marking a payout paid and inserting a separate outbox row.

**How to apply:** When adding or resetting payout email delivery fields, preserve historical rows as terminal, explicitly enqueue only on a new paid transition, claim retries with a durable token and lease, and use the stable transfer ID as the email deduplication identity.