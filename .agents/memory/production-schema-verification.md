---
name: Production schema verification
description: Successful deployment builds do not by themselves prove production database changes landed.
---

After publishing any table or column change, query the production replica's `information_schema` before treating the release as complete.

**Why:** Application builds and health checks can succeed while the production database still lacks the new schema, leaving only the affected feature paths broken or silently degraded.

**How to apply:** Use the publish flow for production schema changes; never add runtime or deploy-time DDL. If production metadata differs from development, stop feature verification and report the mismatch, then re-publish through the supported flow after review.