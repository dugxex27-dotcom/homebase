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
- **Product rule**: contractor pricing is self-serve, flat per-seat pricing with a 50-person capacity
  ceiling. There is no Enterprise, unlimited-seat, or contact-sales tier. Divisions remain real team
  organization functionality and must not be deleted as part of tier cleanup.
- **Compatibility rule**: historical company-tier values, legacy plan identifiers, and explicit SSO/API
  access fields may still exist for stored-data compatibility. They do not gate normal contractor access;
  do not delete or migrate the stored fields without explicit product confirmation and a compatibility plan.
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

**How to apply:** remove obsolete Enterprise-facing UI and behavior, but preserve divisions and treat
historical storage fields as compatibility surfaces until a separate migration is approved. Normal company
owners can reach and save SSO settings without an Enterprise tier or API-access entitlement flag.
