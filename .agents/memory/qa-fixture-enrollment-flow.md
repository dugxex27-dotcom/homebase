---
name: QA fixture enrollment flow (admin/contractor/homeowner)
description: How to actually enroll the 3 dedicated QA persona accounts (task referred to as "QA isolation system") — the manual signup step plus the agent-run binding step.
---

Enrolling the 3 QA personas (admin/contractor/homeowner) is a two-part process with no self-service UI:

1. **Human step (no invite code, no special URL):** each of the 3 identities signs in once via the normal "Continue with Google" button on `/signin/homeowner`, then stops immediately at the dashboard — no house, no contractor onboarding, no company creation. Role at signup doesn't matter; binding overwrites it.
2. **Agent/operator step:** `provisionQaFixtures()` in `qa-fixture-service.ts` is deliberately server-only with **no HTTP route**. It must be invoked directly (script/DB access) after being told the 3 resulting user IDs/emails. It requires `QA_FIXTURE_PROVISIONING_ENABLED=true` (an operator safety interlock, off by default — enable only for the operation, then disable).

**Why:** `provisionQaFixtures` hard-rejects any identity that isn't pristine (owns a house, company, Stripe/Apple billing record) or is in the admin-emails list, so the human step must stay minimal or binding fails loudly.

**How to apply / pitfalls to warn about:**
- One person CAN provide all 3 identities, but must use 3 distinct Google accounts — a Gmail "+alias" resolves to the same Google identity/subject and just logs back into the same existing `users` row, not a new one.
- The app's actual third-party login is Google OAuth (`/auth/google`, `googleAuth.ts`), not a user-facing Replit OIDC button — `replitAuth.ts`'s native Replit OIDC (`/api/login`) exists server-side but isn't linked anywhere in the myhomebase frontend.
- After binding, verify via `/qa-admin-console` (admin persona) and by confirming write actions 403 with "QA accounts are read-only" for the contractor/homeowner personas.
