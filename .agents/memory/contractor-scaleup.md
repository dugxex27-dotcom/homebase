---
name: Contractor Scale-Up Plan phases
description: Status of the multi-phase contractor billing/CRM expansion plan, so future work knows what's already live vs. still pending.
---

Multi-phase plan to expand contractor billing/CRM. Status as of the last session that touched it:

- **Phases 1-4 + pricing simplification**: complete.
- **Phase 2 (quantity-based tech-seat billing)**: complete — checkout-session creation, invite, remove, and
  bulk-import all sync the Stripe seat subscription-item quantity synchronously (not just via startup
  recovery). See `quantity-based-seat-billing.md` for the billing mechanics and
  `seat-limit-fallback-reconciliation.md` for the seat-limit fallback-chain pitfalls.
- **Open recommendation (not yet decided/implemented)**: `maxTechSeats` still enforces a low hard ceiling
  (default 3 total, i.e. only 1 paid seat) even though seats are now billed per-seat via Stripe with no
  natural cap. A hard ceiling this low undercuts a self-serve per-seat pricing model — teams that want to
  grow hit a wall and need support intervention instead of just paying more. Recommendation: raise the
  ceiling to a much higher soft/abuse-prevention limit (e.g. tens of seats) rather than removing it
  entirely, since some ceiling is still useful for fraud/cost control. Not implemented — needs explicit
  product sign-off since it changes real billing/product behavior.
- **Pricing clarification**: the intended model is 1 owner + 2 additional people free (3 total), then
  every additional company member is $5/month regardless of role. The billing counter already counts
  owner, admin, tech, manager, dispatcher, and pending/suspended non-removed members together, but its
  formula subtracts only 2; with the owner included, owner + 2 team members currently incurs 1 paid seat.
- **Role/quota distinction**: the hard limit counts techs only. Separate admin, manager, and dispatcher
  limits exist as fields and UI controls but do not drive Stripe billing; `lead` is not a stored company
  role, with `manager` being the closest existing role.
- **Phase 5+**: pending, not yet scoped in memory.

**Why this file exists:** phase plans that span many sessions drift out of sync with the code if the
status isn't recorded somewhere; re-deriving "what phase are we on" from the codebase alone is slow and
error-prone for a plan this size.
