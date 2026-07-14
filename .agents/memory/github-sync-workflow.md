---
name: GitHub sync workflow
description: How to push code from Replit to dugxex27-dotcom/homebase on GitHub, including token quirks and auto-sync options
---

# GitHub Sync Workflow

## Recommended: Replit Git Panel GitHub Integration

The Git panel (left sidebar) has a "Connect to GitHub" button. Once linked to
`dugxex27-dotcom/homebase`, Replit auto-pushes on every checkpoint — no manual
scripts needed.

## Manual push from Shell (when needed)

```bash
git push "https://x-token:${GITHUB_TOKEN}@github.com/dugxex27-dotcom/homebase.git" main
```

Run from the **Shell tab** — the agent's bash environment has a stale copy of
`GITHUB_TOKEN` (always 401). The Shell tab always has the fresh token.

## Why the agent can't set this up automatically

- `.git/config` edits and `.git/hooks/*` writes are blocked by the agent sandbox.
- `git remote add` and other git write commands are also blocked.
- All GitHub API pushes from the agent must be delegated to Shell commands.

## Origin remote URL

`.git/config` currently has `origin` pointing to GitHub HTTPS but with a stale
placeholder token in the URL. A `git push origin main` from the Shell will fail
until either:
1. The Replit Git panel GitHub integration overwrites it, or
2. The user manually updates line 11 of `.git/config` in the Shell:
   ```bash
   git remote set-url origin "https://x-token:${GITHUB_TOKEN}@github.com/dugxex27-dotcom/homebase.git"
   ```
   (This updates the URL for that session; the token will go stale again on reboot.)

## Token behavior

The agent bash tool environment captures `GITHUB_TOKEN` at process start.
Updating the secret in Replit doesn't refresh the running agent bash env.
Always delegate actual GitHub API pushes to Shell commands when the token is needed.
