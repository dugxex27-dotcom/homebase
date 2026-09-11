---
name: GitHub sync workflow
description: Safe normal-push workflow for keeping dugxex27-dotcom/homebase synchronized.
---

# GitHub Sync Workflow

The Git panel can sync checkpoints to `dugxex27-dotcom/homebase`. The root
`pnpm run sync` command is also supported: it refuses a dirty tree, fetches
`origin/main`, rebases only when the remote has new commits, and performs a
normal push.

`origin` uses a credential-free GitHub HTTPS URL. Replit's configured Git
credential handling works for fetch and push without embedding a token in the
remote URL.

**Why:** An earlier setup depended on a stale environment token and later had a
missing custom helper, while the Git UI could report a dirty tree without
showing a commit candidate. Standard credentials plus a checked-in fail-closed
helper avoid both problems.

**How to apply:** Inspect `git status --porcelain=v2` first. Commit intentional
changes or remove genuine noise, then run `pnpm run sync`. Preserve local
history and never force-push `main`.