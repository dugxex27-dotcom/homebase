---
name: user-event paste signature
description: How to exercise paste behavior with the installed testing-library user-event version
---

Focus the destination element, then call the configured user instance’s paste method with the pasted text as its only argument. Passing the input element as the first argument makes it clipboard data and fails because it is not a DataTransfer.

**Why:** The installed user-event API targets the active element rather than accepting a target element argument, which is easy to confuse with other event helper signatures.

**How to apply:** In UI tests that need paste-path coverage, click or focus the input first and then paste the text.