---
name: Invoice creation idempotency
description: The durable contract for distinguishing invoice-creation retries from legitimate similar invoices.
---

Invoice creation retries must carry an explicit client-generated idempotency key. Enforce uniqueness per contractor in PostgreSQL, and perform lookup, invoice-number allocation, and insertion inside one transaction using transaction-scoped advisory locks.

**Why:** Content fingerprints can silently collapse legitimate invoices, especially unlinked invoices with similar titles and amounts. Session advisory locks held on a separate pooled connection can also deadlock while storage waits for another connection.

**How to apply:** Reuse one request key for retries of the same submit action and generate a new key for a new action. Never use title, amount, homeowner, or a time window as a substitute for request identity.