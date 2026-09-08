---
name: Large storage patch rebases
description: Why changes to repeated storage methods require a post-rebase compile check.
---

When editing repeated storage methods, anchor patches to the owning class and compile the module again after any rebase.

**Why:** The in-memory and database storage classes expose many matching method names. A low-context replay can apply cleanly to the wrong class and corrupt unrelated methods even when the pre-rebase code compiled.

**How to apply:** For storage changes that rebase across concurrent work, inspect the final class location and run a focused module build before accepting the merge.