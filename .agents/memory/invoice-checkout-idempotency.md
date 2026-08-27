---
name: Invoice Checkout session idempotency
description: How duplicate/concurrent Stripe Checkout Session creation for the same CRM invoice is prevented across both payment-link endpoints
---

Two different endpoints create a Stripe Checkout Session for the same CRM invoice: the contractor-initiated "send payment link" route and the homeowner/token-based "pay now" route. Both needed protection against creating more than one live session per invoice.

**Design: two layers, not one.**
1. **Stripe idempotencyKey** (`<endpoint-prefix>-<invoiceId>-<amountInCents>`) on each `checkout.sessions.create` call — the safety net for a true race that slips past the app-layer check. Each endpoint uses its own key prefix (not shared) because the two endpoints pass different `success_url`/`cancel_url`/`metadata`; Stripe errors if the same idempotency key is replayed with different params.
2. **DB-level atomic claim**, shared across both endpoints, keyed by invoice id — an `UPDATE ... WHERE (session IS NULL OR expired OR amount changed) RETURNING` that only one concurrent request can win. The loser either reuses the winner's already-open session (verified live via `stripe.checkout.sessions.retrieve`) or gets a 409 "already in progress" if the winner hasn't finished yet. This is what actually stops the cross-endpoint race (contractor resend + homeowner click at once) that differing idempotency keys can't cover.

**Why both:** the app-layer claim avoids an extra Stripe round-trip on the common case and gives a fast, clean response; the idempotency key is what makes the claim's own race window (check-then-set) safe under genuine concurrency and across server instances/process crashes.

**Gotchas:**
- The "release the claim" storage method takes an `expectedSessionId` param and only clears if the stored value still matches it — releasing unconditionally would let a stale release clobber a session another request legitimately wrote in the meantime. Crash/error recovery releases `'pending'`; a stale-but-real session detected via Stripe retrieve releases that specific session id.
- The claimed amount is part of the reclaim condition, so editing an invoice's total after a session was created doesn't get stuck behind the old session — a differing amount is always reclaimable.
- Any HTTP route test file with a hand-built storage mock (`createStorageMock({...})`) that exercises either of these two routes must add `claimInvoiceCheckoutSession` to its overrides (defaulting to `{ outcome: 'claimed' }`) or the route 500s, since the auto-stub default resolves to `undefined` and the route destructures `.outcome` off the result.
