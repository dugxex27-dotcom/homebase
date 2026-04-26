# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Replit IDE Preview — HMR Loop Fix

`artifacts/myhomebase/vite.config.ts` contains a custom Vite plugin (`replitIdeHmrKillerPlugin`) that is active only in the Replit IDE (`inReplitIDE = NODE_ENV !== "production" && REPL_ID !== undefined`).

**Root cause**: The Replit proxy hard-closes WebSocket connections every ~1.7 s. Vite's `/@vite/client` module creates a WebSocket; on disconnect it enters "polling for server restart" mode, polling `/@vite/ping`. When the ping returns 200 Vite calls `location.reload()`, creating an infinite reload loop that hammers `/api/auth/user` with 401s every ~1.8 s.

**Fix** (IDE only, no production impact):
1. Plugin registered with `enforce: "pre"` so its `configureServer` middleware is prepended before Vite's own handlers.
2. Intercepts `/@vite/client` → returns a minimal no-op stub (no WebSocket, no HMR). Served with `Cache-Control: no-store`.
3. Intercepts `/@vite/ping` → returns 404 so the browser-cached real Vite client never concludes the server restarted and never calls `location.reload()`.
4. `transformIndexHtml` (order: "post") strips any `<script src="/@vite/client">` tag as belt-and-suspenders.
5. `server.hmr: false` and `runtimeErrorOverlay` excluded in the IDE as additional guards.
