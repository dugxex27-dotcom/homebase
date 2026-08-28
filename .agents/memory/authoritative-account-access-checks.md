---
name: Authoritative account access checks
description: Security policy for suspension and account-lifecycle checks across HTTP and WebSocket access.
---

Protected access must not positively cache an active account decision. Recheck the persisted membership and account-lifecycle statuses so a change made by another server instance applies on the next protected request. If the authoritative status store cannot be read, fail closed rather than allowing access.

**Why:** Process-local blocklists and positive active-status caches leave a cross-instance window where a suspended account can continue using HTTP or an established messaging channel. Failing open during a database error recreates the same bypass.

**How to apply:** Use this policy for session and OAuth principals, WebSocket upgrades, conversation frames, and recipient delivery. Block membership suspension/removal/pending states and account suspension/cancellation/deletion states consistently.