---
name: Linked evidence review concurrency
description: Concurrency rule for human review decisions spanning related maintenance, task, and invoice evidence.
---

Treat every maintenance log, task completion, and invoice analysis connected by a task or maintenance-log relationship as one review concurrency domain. Human review and later invoice confirmation must use the same stable group lock, and resolved-decision lookup must search the full linked group rather than one source ID.

**Why:** Locking only the requested row allows opposing decisions through sibling invoice IDs, while exact-ID lookup can make later confirmation miss a decision and recreate the automated `review_needed` result.

**How to apply:** Any new review source, linkage key, or confirmation path must join the shared group lock, update the full connected set, and resolve the latest final human decision across every linked source.

When an admin requests more information, notify the homeowner with the reviewer note and a deep link to a private evidence re-upload flow. Resubmission appends evidence across the linked group but remains `review_needed` without changing verification tier or score until a later admin decision.

**Why:** The confirmed product behavior is a complete homeowner follow-up loop, not an admin-only note. Evidence may contain invoices or household photos, so new uploads must remain private and use record-level access checks.

**How to apply:** Keep request notifications best-effort after the immutable decision, store re-uploads privately, preserve existing evidence for audit, and serialize resubmission with review and confirmation under the same group lock.