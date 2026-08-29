---
name: GitHub secret history decision
description: Project decision about handling the leaked webhook in existing Git history
---

Keep the generated dump-file cleanup in the current tree, but do not rewrite existing Git history or force-push `main` to remove the historical copy.

**Why:** The repository owner explicitly declined the destructive history rewrite, so preserving existing commit history takes priority over historical removal.

**How to apply:** Normal pushes may remove the dump files from the latest tree after GitHub authentication is repaired, but the exposed Slack webhook must still be revoked because it remains in an older public commit.