---
name: Stale session after server-side role change
description: Security requirements for synchronizing a teammate's active sessions after changing their company role.
---

Patch the affected teammate's stored sessions, not only the actor's session, and await session enumeration plus every matching session write before reporting the role change as successful. Persistence errors must reject the request rather than leave a demoted user with a successful response and stale elevated access.

**Why:** Session stores complete reads and writes asynchronously. Fire-and-forget patches create a race where the teammate's next request can still use the old role; this is especially dangerous during demotion.

**How to apply:** Any server-side company-role mutation must update the database, await the target user's session synchronization, and treat synchronization failure as an operation failure. Tests should use delayed asynchronous store callbacks to prove the response cannot complete before persistence.