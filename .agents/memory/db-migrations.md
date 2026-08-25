---
name: Database migration workflow
description: How to apply narrow schema fixes safely while Drizzle migration history is unbaselined.
---

**Rule:** Do not use Drizzle's migration runner or generate/push commands as a recovery mechanism while `drizzle.__drizzle_migrations` is empty and existing SQL migration files are untracked. Use a hand-written, idempotent SQL file scoped only to the approved change, apply it directly to development with `executeSql`, and verify live metadata afterward.

**Why:** Replaying the existing on-disk migration set without a trustworthy history can create conflicts or apply unrelated schema changes. The migration tracker is empty in both development and production, so it cannot distinguish previously applied schema from pending work.

**How to apply:** Keep the migration narrow, record it under the API migration directory, and run only its static DDL against development after the user authorizes it. Never directly change production schema; use the supported publish-time schema flow after explicit approval. Reconcile/baseline migration history separately before adopting a runner-based workflow.