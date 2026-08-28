---
name: Billing tests and demo access
description: How the contractor demo bypass affects live subscription and webhook verification.
---

The permanent contractor demo account always reports full active Pro access through subscription APIs and paid-feature middleware, regardless of its stored subscription status.

**Why:** A signed-webhook test correctly changed the database through trialing, active, past-due, cancelled, and recovered states, but API checks continued reporting active access because a browser demo login had restored the demo flag. This can produce a false passing result for billing gates.

**How to apply:** Authenticate first, then temporarily disable the demo flag before testing trial expiry, payment failure, cancellation, or recovery. Restore the flag and original fixture fields afterward. Alternatively, verify raw database state, but do not treat demo-bypassed API responses as subscription-state evidence.