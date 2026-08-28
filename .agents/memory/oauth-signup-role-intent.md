---
name: OAuth signup role intent
description: Trust boundary for choosing contractor or agent roles during OAuth onboarding.
---

An OAuth role intent may select contractor or agent only while creating a brand-new account. Profile-completion fields never change the persisted role, and replaying an OAuth URL with a different intent never promotes an existing account.

**Why:** Treating a client-submitted profile role or a replayable OAuth intent as an existing-account role update enables role escalation, while assigning the trusted new-account role before profile completion preserves legitimate onboarding.

**How to apply:** Bind the validated intent to the OAuth session, persist the new account's role before rendering profile completion, and make profile completion preserve that persisted role.