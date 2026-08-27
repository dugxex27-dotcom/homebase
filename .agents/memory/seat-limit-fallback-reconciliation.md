---
name: Seat/quota limit fallback reconciliation
description: How to reconcile two routes that enforce "the same" quota/seat limit but compute it via different fallback chains, and how to treat a nullish limit column correctly.
---

## The pattern

Two endpoints that should enforce one shared quota (e.g. "max tech seats per company") can drift because each was written independently with its own `companyRow?.overrideColumn ?? planRow?.includedX ?? <hardcoded default>` chain. The override and plan lookups usually match; the hardcoded tail-end default is the part most likely to silently diverge (e.g. one route falls back to 3, another to 10) since nothing forces the two literals to stay in sync.

**Why:** each route was likely added at a different time by a different change, and there is no shared constant enforcing the fallback — a lint rule or type system can't catch two unrelated numeric literals disagreeing.

**How to apply:** when asked to fix a race condition or bug across two "parallel" quota-checking routes, diff their full fallback chains line-by-line (not just the column names) before assuming they already agree. Extract the shared precedence into one helper function/constant, and reuse it from both routes.

## Don't invent "null means unlimited" without proof

A nullable limit column (e.g. `maxTechSeats: number | null`) does not automatically mean "null = unlimited." Check whether any actual code path ever writes that literal `null` value intentionally (e.g. an admin action, a plan-sync job, a signup flow) before treating it as a bypass sentinel. A comment in an unrelated plan-config literal (e.g. "unlimited; custom contract governs") is not proof that the column is ever actually set that way — grep for assignments to the column, not just its read sites.

**Why:** on this task, only a plan-config literal *described* unlimited seats via `maxTechSeats: null`, but no code path ever copies that onto a company row. Treating null as "unlimited" in the shared resolver would have been a new, untested behavior change beyond what was asked, and it broke the reconciliation tests in a way that revealed the assumption was wrong (ordinary companies with no override return `null` from a mocked/absent row too, which is indistinguishable from an intentional "unlimited" sentinel).

**How to apply:** preserve the original nullish-fallback semantics (`raw ?? plan ?? default`) unless there is a concrete, executed code path that assigns the sentinel value for that exact meaning. If asked to verify an "unlimited/grandfathered" bypass and no such mechanism exists for the feature in question, say so explicitly rather than adding one.
