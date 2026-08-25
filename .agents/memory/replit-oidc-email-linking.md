---
name: Replit OIDC email linking
description: Safe account linking when an OIDC subject changes but the verified account email is already known.
---

When Replit OIDC receives a new provider subject for an existing email, resolve the account by email and preserve that account's database ID in the Passport session. Authorization and suspension checks must prefer this application user ID over the raw provider subject.

**Why:** The users table has a unique email constraint, while legacy accounts and identity-provider migrations can produce a different OIDC subject. Treating that combination as a new user causes a duplicate-email insert failure. Using only the provider subject after linking also makes downstream authorization miss the linked account.

**How to apply:** Resolve by email and subject, reject the case where each belongs to a different account, then update the selected account rather than insert. Keep the OIDC subject in claims for token refresh, but use the persisted application ID for account-scoped lookups.