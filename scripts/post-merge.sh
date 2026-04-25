#!/bin/bash
set -e
pnpm install --frozen-lockfile
echo "" | pnpm --filter db push 2>/dev/null || pnpm --filter db push --force 2>/dev/null || true
