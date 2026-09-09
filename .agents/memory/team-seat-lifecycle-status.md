---
name: Team-seat lifecycle status rules
description: Contractor team statuses have distinct billing, capacity, and management semantics.
---

Do not reuse the billable-status set to decide whether a contractor team member can be removed. Active members are billable; suspended members are not billable but still reserve capacity and must remain removable.

**Why:** Narrowing billing to active-only can accidentally make suspended accounts impossible to remove if removal eligibility shares the same predicate. Status transitions also change Stripe quantity in both directions.

**How to apply:** Keep billing, reserved-capacity, and removal predicates explicit. After suspension and reactivation commit, immediately run the durable seat refresh; Stripe failure must not roll back the account mutation.