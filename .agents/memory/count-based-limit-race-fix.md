---
name: Count-based limit race fix pattern
description: When a stale-read-then-write race guards a COUNT-based limit (not a single-row flag/counter), use db.transaction + row-level FOR UPDATE lock, not a plain atomic UPDATE...WHERE...RETURNING.
---

## The distinction

Two families of "stale read-then-write" race fixes exist in this codebase:

1. **Single-row flag/counter guard** (e.g. promo code `usesRemaining`, agent payout status, house-transfer `status`): fixed with one atomic `UPDATE ... WHERE <still-valid-condition> RETURNING *`. An empty return means someone else already won; this needs no transaction or lock because Postgres evaluates the `WHERE` and applies the `UPDATE` atomically per-row.
2. **COUNT-based aggregate limit** (e.g. "this user may have at most N houses"): a bare `INSERT ... WHERE (SELECT COUNT(*) ...) < N` does **not** close the race under Postgres's default READ COMMITTED isolation — two concurrent transactions can each evaluate the subquery against a snapshot that doesn't see the other's uncommitted insert, so both can pass. This requires `db.transaction(async (tx) => { await tx.execute(sql\`SELECT id FROM <owner-table> WHERE id = ${ownerId} FOR UPDATE\`); ...count check...; ...insert/update...; })`. Locking the owner row serializes all concurrent requests for the *same* owner, so the count read inside the transaction is guaranteed consistent.

**Why:** the two "fixed by #883–#885" incidents were all single-row guards; the house-count-vs-plan-limit race was the first that needed row locking, because the guard depends on counting a set of rows rather than checking one row's state.

**How to apply:** when planning a fix for "N concurrent requests could exceed a plan/quota limit", check whether the limit is evaluated via `COUNT(*)`/aggregate over rows. If so, reach for `db.transaction` + `SELECT ... FOR UPDATE` on the owning entity's row, not a bare conditional `UPDATE...RETURNING`. If the same route also has an inner single-row guard (e.g. a transfer's own `status` field), you can combine both techniques in the same transaction: lock the owner row for the count, then use atomic `UPDATE...WHERE...RETURNING` for the single-row half.

## TypeScript closure-narrowing gotcha

A `let outcome: SomeUnionType | null = null` declared in a route handler and reassigned only inside `db.transaction(async (tx) => { ... outcome = {...}; ... })` will make TypeScript infer `never` when you later check `if (outcome) { outcome.foo }` after `await db.transaction(...)` — TS does not widen the variable back to its declared union type across that closure boundary in this codebase's tsconfig/TS version.

**Fix:** track the outcome via a property on a plain object declared before the transaction (`const outcome = { limitError: null, result: null }`, then `outcome.limitError = {...}` inside the closure). Reading `outcome.limitError` after the transaction narrows correctly. Do not fight this with type assertions scattered at every read site — the object-wrapper avoids the issue entirely and is the convention to reuse next time this pattern comes up.
