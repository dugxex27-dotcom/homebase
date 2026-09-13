---
name: Notification occurrence idempotency
description: Durable identity and polling rules for in-app notifications.
---

Each in-app notification writer must supply a stable occurrence identity and rely on an atomic database conflict to claim it. Maintenance uses task plus recurrence month, appointments use appointment plus reminder kind, weather uses house/trigger plus forecast date, and regional suggestions use house/task plus month. Do not derive durable identity from insertion time or presentation wording.

**Why:** Read-before-write checks race across processes, and independently generated timestamps or copy changes allow the same event to be inserted more than once. Historical rows may already contain duplicate random IDs, so reads can apply a same-month compatibility filter without replacing insertion-time idempotency.

**How to apply:** Route every in-app notification insert through the idempotent storage boundary or provide the same deterministic ID on a direct insert with `ON CONFLICT DO NOTHING`. Keep exactly one authenticated-layout owner for unread polling; visible bells and sidebar indicators consume its shared state.