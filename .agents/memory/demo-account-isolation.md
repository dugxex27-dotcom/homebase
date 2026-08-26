---
name: Demo account isolation (isDemoAccount)
description: Why public-facing demo accounts got their own isDemoAccount flag instead of reusing isQaAccount, and where the exclusion needs to be applied.
---

Permanent public-facing demo accounts (demo login on marketing pages, used for lead-gen) are a
**different concept** from QA fixtures, even though both need excluding from real aggregates,
search, and notifications:

- `isQaAccount = true` triggers `blockQaOperationalMutations` (blocks nearly all non-GET
  mutations) and admin-access denial. Demo accounts must stay fully interactive — visitors
  complete tasks, send invoices, message, etc. — so they cannot be marked `isQaAccount`.
- Solution: added a separate `users.isDemoAccount` boolean column. It mirrors QA's
  *data-isolation* effect (excluded from admin stats, contractor search/directory, reviews,
  error logs, growth/revenue metrics, search analytics, real outbound notifications) without QA's
  *access-control* effect (mutation blocking, admin denial, QA-only contact-blocking guards).
- Notification suppression call sites use a new `isSyntheticAccountUserId(userId)` helper
  (`qa-access.ts`) that is true for either flag — use this for "don't email/SMS/push this
  contact info" checks. Keep using `isQaAccountUserId` directly for QA-specific
  access-control semantics (route guards, admin checks, contact-blocking).
- There is also an **older, separate** demo-detection system in `storage.ts`:
  `isDemoId`/`isDemoEmail`/`isDemoUser`, based on hardcoded ID-prefix/email-domain lists. It
  predates the `isDemoAccount` column and several schedulers still rely on it alone. It does
  **not** match synthetic fixture users created with unrelated ID/email patterns (e.g. IDs like
  `agent-referral-N` with `*@email.com` addresses) — those need the DB flag, not just this list.

**Why:** literally setting `isQaAccount=true` on demo accounts (the original ask) would break the
demo experience entirely, since QA's mutation-block allowlist is tiny.

**How to apply:** when adding any new aggregate/search/analytics/notification-suppression query
over `users`, filter both `isQaAccount` and `isDemoAccount` unless the query is genuinely
QA-access-control (then use only `isQaAccount`/`isQaAccountUserId`).
