---
name: routes.test.ts pool mock needs .query, not just .connect
description: Why vi.mock("../db") in routes.test.ts must stub pool.query directly, or the entire test file fails to load
---

`artifacts/api-server/src/lib/pg-rate-limit-store.ts` calls `pool.query(INIT_SQL)` as a
top-level side effect at import time. `routes.ts` imports it, and `routes.test.ts` imports
`routes.ts`, so the `vi.mock("../db", ...)` pool stub must expose a `.query` method directly
(in addition to `.connect().query()`), or the whole test file throws `pool.query is not a
function` during module load and **zero tests run** — not just DB-related ones.

**Why:** This is easy to miss because the failure looks like a broad test-infra breakage
unrelated to whatever feature you're testing, and it silently masks all other test results
(reports "no tests" rather than failures).

**How to apply:** If `routes.test.ts` (or any file importing `routes.ts`) fails to load with
`pool.query is not a function`, check the `vi.mock("../db", ...)` factory has both `pool.query`
and `pool.connect().query` mocked.
