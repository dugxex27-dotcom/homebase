#!/usr/bin/env python3
"""Safely synchronize the current branch with origin/main."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def git(*args: str, capture: bool = False) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
    )
    return result.stdout.strip() if capture else ""


def main() -> int:
    branch = git("branch", "--show-current", capture=True)
    if branch != "main":
        print(f"Refusing to sync branch {branch!r}; switch to main first.", file=sys.stderr)
        return 2

    dirty = git("status", "--porcelain", "--untracked-files=all", capture=True)
    if dirty:
        print("Refusing to sync with uncommitted changes:", file=sys.stderr)
        print(dirty, file=sys.stderr)
        return 2

    git("fetch", "origin", "main")
    ahead, behind = map(
        int,
        git(
            "rev-list",
            "--left-right",
            "--count",
            "HEAD...origin/main",
            capture=True,
        ).split(),
    )

    if behind:
        print(f"Rebasing {ahead} local commit(s) onto {behind} remote commit(s)...")
        git("rebase", "origin/main")

    remaining = int(
        git("rev-list", "--count", "origin/main..HEAD", capture=True)
    )
    if remaining:
        print(f"Pushing {remaining} commit(s) to origin/main...")
        git("push", "origin", "main")
    else:
        print("origin/main is already up to date.")

    print(f"Synced main at {git('rev-parse', '--short', 'HEAD', capture=True)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())