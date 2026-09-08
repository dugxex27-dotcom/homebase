---
name: Handoff property transfer authorization
description: Authorization rule for linking and claiming existing houses through agent handoff packages.
---

An agent referral or marketing attribution is never authorization to transfer a homeowner's property data. An existing house may be linked to and claimed through a handoff package only when there is a live, property-specific transfer grant created by the current homeowner for the same recipient email.

**Why:** Referral records prove acquisition attribution, not homeowner consent. Treating them as authority would let a referring agent transfer any house owned by a referred account.

**How to apply:** Validate the house, current owner, intended recipient, transfer status, and expiry both when linking and inside the claim transaction. Atomically consume the package and owner grant with the ownership transfer.