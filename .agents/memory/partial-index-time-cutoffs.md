---
name: Partial-index time cutoffs
description: PostgreSQL immutability requirement for timestamp cutoffs in partial-index predicates
---

When a partial index uses a fixed time cutoff, match the SQL literal type to the indexed timestamp column. For a `timestamp without time zone` column, use a `TIMESTAMP` literal rather than `TIMESTAMPTZ`.

**Why:** PostgreSQL rejected a partial unique index because comparing a timestamp-without-time-zone column to a `TIMESTAMPTZ` literal requires a timezone-dependent coercion, which is not immutable and therefore cannot appear in an index predicate.

**How to apply:** Inspect the column type before writing a time-bounded partial index. Use a matching typed literal and validate the exact `CREATE INDEX` statement in development before relying on a publish-time schema diff.