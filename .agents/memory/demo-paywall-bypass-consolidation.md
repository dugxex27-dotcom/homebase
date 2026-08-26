---
name: Demo paywall bypasses must use isDemoAccount, not ID/email string matching
description: Ad-hoc demo-account bypass checks (ID prefixes, email substrings) are fragile and get accidentally load-bearing in tests; consolidate on the isDemoAccount DB flag.
---

Several paywall/access-control checks (`requireHomeownerSubscription`, `requireContractorSubscription`,
`hasCrmProAccess`, `GET /api/contractor/subscription`, `GET /api/my-subscription`) used to grant free
access via fragile matching: `userId.startsWith('demo-homeowner'/'demo-contractor')`,
`email?.includes('@homebase.com'/'precisionhvac')`, or `subscriptionStatus === 'grandfathered'` as a
demo-access side channel. All were consolidated to check `user.isDemoAccount === true` only (the real
DB column, set by the demo seeder) — never ID/email substrings, which could match an unintended real
account, and never an incidental status value.

**Why:** substring/prefix checks are not just a security smell — they get silently load-bearing.
A test (`invoice-send-token-rotation.http.test.ts`) named its fixture contractor
`demo-contractor-rotation-test` purely for readability and relied on the `demo-contractor` prefix
bypass to skip a real subscription check; removing the prefix match broke that test until its fixture
was given an explicit `isDemoAccount: true`. Any future removal of a similar ad-hoc string match should
grep test fixtures for the same ID/email patterns before assuming only production code paths use them.

**How to apply:** when adding a new paid-feature gate, check `user.isDemoAccount` (fetched fresh from
the DB, not inferred from ID/email). For middleware that fetches the user once per request
(`requireHomeownerSubscription`, `requireContractorSubscription`), lazily copy `isDemoAccount` onto
`req.session.user` so downstream handlers (e.g. deciding whether to skip a paid AI call) can read it
without a second DB round-trip — this mirrors the existing `companyTier` lazy-attach pattern in
`requireContractorSubscription`. All demo-login seed/creation paths (POST and GET variants, for
homeowner/contractor/agent) must explicitly set `isDemoAccount: true`; one GET homeowner-demo-login
fallback path was found creating a user without it and was fixed.
