---
name: Database migration workflow
description: How to apply narrow schema fixes safely while Drizzle migration history is only partially baselined.
---

**Rule:** Do not replay the legacy on-disk migration set to recover an unbaselined database. For a new approved schema fix, add only its narrow, idempotent SQL file and matching Drizzle journal entry, then apply the same static DDL directly to development with `executeSql` and verify live metadata afterward.

**Why:** The API runner silently skips all migrations when its `meta/_journal.json` is absent. Replaying legacy files without a trustworthy history can also create conflicts or apply unrelated schema changes. A journal containing only a newly approved, idempotent migration lets the runner record and apply that change without replaying the older set.

**How to apply:** Keep the migration narrow, place it under the API migration directory, and add its tag to that directory's journal. Run only its static DDL against development after authorization, then restart the API and confirm the runner reports success and records the migration. Never directly change production schema; use the supported publish-time schema flow after explicit approval. Reconcile the legacy history separately before adopting a full replay workflow.