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
git push "https://${GITHUB_TOKEN}@github.com/dugxex27-dotcom/homebase.git" main
```

Confirmed 2026-08-26: use the token directly as the username with no prefix.
Both `x-token:${GITHUB_TOKEN}@...` and `oauth2:${GITHUB_TOKEN}@...` are WRONG
for GitHub (that's GitLab's convention) and fail with "Invalid username or
token. Password authentication is not supported" even when the token itself
is completely valid — this misled a full debugging cycle across 4 "invalid"
tokens before the URL format itself was identified as the actual bug ahead of
this file being read again. Verify a token's basic validity independent of
push syntax with:
```bash
curl -o /dev/null -s -w "%{http_code}\n" -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```
200 means the token is fine and any push failure is about scope or URL syntax, not the token.

If this repo's history includes changes to files under `.github/workflows/`,
the token additionally needs the **`workflow`** classic scope (in addition to
`repo`) or GitHub rejects the push at the ref-update step with "refusing to
allow a Personal Access Token to create or update workflow ... without
`workflow` scope" — this happens only after objects fully transfer, so it
looks like a late-stage failure, not an auth problem.

Run from the **Shell tab** — the agent's bash environment has a stale copy of
`GITHUB_TOKEN` (always 401), confirmed to persist even across a fresh login
shell in the same agent process. Don't try to test/use a newly-requested
`GITHUB_TOKEN` via the agent's own bash tool — the only way to see a live
secret value is a command the user runs themselves in Replit's actual Shell
tab UI.

When relaying long commands with a variable-expanded URL for the user to
paste into the Shell tab, write them to a script file (e.g. `/tmp/x.sh`) and
have the user run `bash /tmp/x.sh` instead — pasting a long `git push
"https://...@github.com/..." main` line directly into a terminal is prone to
line-wrapping/truncation that mangles the URL (dropped `git push` prefix,
inserted newline mid-URL) and is hard for the user to diagnose themselves.

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

Confirmed 2026-08-26: this staleness survives even a fresh login shell
(`bash -lc '...'`) within the same agent ShellExec tool — the value's
length/prefix/suffix/hash stayed identical across 3 separate `requestSecrets`
updates and multiple new subprocess invocations. Don't try to "test" a newly
requested GITHUB_TOKEN via the agent's ShellExec tool at all — it will always
read the value from whenever the agent process itself started. The only way
to see the current secret value is a command run by the user in Replit's
actual Shell tab UI (a separate process Replit manages independently).
