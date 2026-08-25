---
name: QA fixture lifecycle safety
description: Durable safety constraints for provisioning, retiring, and purging isolated QA fixtures.
---

QA fixture provisioning must only enroll dedicated, pristine identities with no operational ownership. Fixture cleanup removes deterministic fixture records only after every fixture is retired; it must retain suspended QA-marked identity records rather than deleting user accounts.

**Why:** Removing a user can cascade into unrelated customer-linked data if the identity was incorrectly selected or acquired additional records. Retaining the marked/suspended identity makes it remain excluded while avoiding irreversible account-data deletion.

**How to apply:** Keep provisioning server-only and explicitly enabled; validate all fixture identities before marking them. Require the full fixture set to be retired before purge. Public discovery must remain separate from authenticated QA self-read paths.