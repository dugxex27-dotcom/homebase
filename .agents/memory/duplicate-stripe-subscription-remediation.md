---
name: Duplicate Stripe subscription remediation
description: Safe decision rule for resolving two Stripe subscriptions created by separate checkout attempts for one account.
---

When one account has two subscriptions for the same plan, preserve the subscription currently referenced by the application. Cancel another subscription only after verifying it came from a distinct completed Checkout Session and mapping its exact paid invoice to the correct Invoice Payment and PaymentIntent. Refund only that verified duplicate payment, using an idempotency key.

**Why:** Separate checkout attempts can create separate subscriptions hours apart even when webhook deduplication is working. Subscription creation time alone is not enough to identify the refundable charge, and changing the app-referenced subscription adds avoidable account-state risk.

**How to apply:** Compare customer, application user metadata, device fingerprint, plan, quantity, checkout completion, subscription creation, invoice period, and payment object. Re-read the retained subscription and application reference after cancellation/refund.