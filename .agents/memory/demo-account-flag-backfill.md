---
name: Demo account flag backfill after schema-only publish
description: Publishing only diffs/applies schema to production, never data — a new gating column (e.g. isDemoAccount) defaults to false on pre-existing production rows until backfilled; production executeSql is read-only so the agent can't patch it directly.
---

## The problem

When a new boolean/flag column is added to `users` (or any table) and existing
code is changed to gate access on that flag, **rows created before the column
existed keep the column's default value in every environment that already had
those rows** — publishing a schema change only applies DDL to production, it
never copies data. Dev often looks fine because a dev-only seeder re-runs the
upsert on every boot; production has no such seeder, so the gap is invisible
until someone actually checks the flag's value on production data.

**Why it matters:** if the new flag is the *sole* bypass for a paywall/rate
limit/feature gate, affected production rows silently fall through to normal
(non-bypassed) behavior — e.g. permanent demo accounts getting paywalled in
production while working fine in dev.

## How to detect

Query the specific known row IDs/emails directly in production
(`environment: "production"` in `executeSql`) and diff against the same rows
in development. Don't infer from schema-check success — a passing schema diff
says nothing about existing row values.

## How to apply the fix

`executeSql` with `environment: "production"` is **read-only (SELECT only)** —
there is no direct-write path to production data from the agent. The correct
fix is to make the code **self-healing**: wherever an already-existing row is
fetched (e.g. the login/seed path for a permanent fixture), check the flag and
patch it to the correct value if it doesn't match, in the same request. This
is idempotent, requires no manual per-environment migration, and fixes the
problem the next time the affected row is touched — but it still requires a
normal publish to reach production, and won't fire until something exercises
that code path in production (may need to manually trigger it once via curl
against the production URL after publishing, then re-verify via a read-only
query).

**How to apply:** any time a new gating flag is introduced alongside code that
depends on it exclusively, audit whether pre-existing rows need backfill —
especially "permanent" seeded/fixture rows (demo accounts, sample data) that
predate the flag and aren't touched by an ongoing production seeder.
