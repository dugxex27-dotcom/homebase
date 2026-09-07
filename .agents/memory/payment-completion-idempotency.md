---
name: Payment completion idempotency
description: Durable rule for payment flows completed by both webhooks and browser return handlers.
---

When both a provider webhook and a browser return handler can finalize the same payment, idempotency must be enforced atomically at the persistence boundary. A read-then-insert check in each caller is not sufficient.

**Why:** Webhook delivery and browser redirects naturally race. Both can observe no existing record, then one insert wins and the other surfaces a unique-constraint error after the customer has already paid.

**How to apply:** Use the provider payment identifier as a unique claim and make insert-on-conflict return the existing application record. Both completion paths should treat that result as success.