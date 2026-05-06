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

## ATTOM Data Integration

Two public (no auth required) server routes back the onboarding property pre-population flow:

- **`GET /api/property`** — calls `api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail` with `address1` + `address2` params. Returns `{ yearBuilt, bedrooms, bathrooms, sqft, lotSqft, propertyType, lastSaleDate, lastSalePrice, assessedValue, marketValue }`. Returns `{}` silently if address not found (ATTOM returns HTTP 400 for "SuccessWithoutResult").
- **`GET /api/avm`** — calls `api.gateway.attomdata.com/propertyapi/v1.0.0/attomavm/detail`. Returns `{ estimatedValue }` or `{}`.
- Requires `ATTOM_API_KEY` secret. If missing, routes return `{}` with a warning log — onboarding still works without it.
- All calls are server-side only; the API key is never exposed to the browser.

---

## Landing Page Architecture (artifacts/myhomebase)

The landing page (`artifacts/myhomebase/src/pages/landing.tsx` + `landing.css`) follows the conversion architecture: Problem → Stakes → Villain → Hero → Proof → CTA.

### 10 Sections
1. **Navigation** — sticky nav, logo left, `How It Works / Pricing / FAQ` smooth-scroll links, `Homeowner / Contractor / Agent / Sign In` right
2. **Hero** — amber eyebrow, bold H1, subheadline, primary quiz CTA, secondary scroll link, italic tagline
3. **Stat Tiles** — 4 tiles (42%, $18K, $5/mo, Refer 5.) each opening full-screen overlay modals
4. **Quiz Entry** (`id="quiz"`) — primary conversion section, opens quiz iframe modal
5. **How It Works** (`id="how-it-works"`) — 3 features with alternating layout + screenshot placeholder mockups
6. **Social Proof** — 3 placeholder testimonials (marked for replacement)
7. **Role Selection** — expandable role tiles (Homeowner/Contractor/Agent) → 3 options (Register/Sign In/Learn More)
8. **Pricing** (`id="pricing"`) — comparison $5/mo vs $18,311, opens Plans modal
9. **Pre-footer CTA** — mirrors hero CTA
10. **Footer** (`id="faq"`) — brand statement, Support/Legal/Social links, copyright

### 6 Modals (full-screen overlay with dark backdrop)
- **Insurance Reality Check** — 42% and $18K tiles (existing content, now full-screen)
- **Plans/Pricing** — $5/mo tile and pricing section button (existing content, now full-screen)
- **Referral Program** — Refer 5. tile (existing content, now full-screen)
- **Homeowner Learn More** — feature overview for homeowners
- **Contractor Learn More** — feature overview for contractors
- **Agent Learn More** — feature overview for real estate agents

### /coming-soon Route
`artifacts/myhomebase/src/pages/coming-soon.tsx` — placeholder page for footer links (Facebook, Instagram). Message: "This page is coming soon. Return to homepage."

### CSS
`landing.css` — all existing modal styles (msc-*, mpr-*, mrr-*) preserved at top; new section styles appended at bottom (~800 new lines). `html { scroll-behavior: smooth }` added for anchor scrolling.

---

## Replit IDE Preview — HMR Loop Fix

`artifacts/myhomebase/vite.config.ts` contains a custom Vite plugin (`replitIdeHmrKillerPlugin`) that is active only in the Replit IDE (`inReplitIDE = NODE_ENV !== "production" && REPL_ID !== undefined`).

**Root cause**: The Replit proxy hard-closes WebSocket connections every ~1.7 s. Vite's `/@vite/client` module creates a WebSocket; on disconnect it enters "polling for server restart" mode, polling `/@vite/ping`. When the ping returns 200 Vite calls `location.reload()`, creating an infinite reload loop that hammers `/api/auth/user` with 401s every ~1.8 s.

**Fix** (IDE only, no production impact):
1. Plugin registered with `enforce: "pre"` so its `configureServer` middleware is prepended before Vite's own handlers.
2. Intercepts `/@vite/client` → returns a minimal no-op stub (no WebSocket, no HMR). Served with `Cache-Control: no-store`.
3. Intercepts `/@vite/ping` → returns 404 so the browser-cached real Vite client never concludes the server restarted and never calls `location.reload()`.
4. `transformIndexHtml` (order: "post") strips any `<script src="/@vite/client">` tag as belt-and-suspenders.
5. `server.hmr: false` and `runtimeErrorOverlay` excluded in the IDE as additional guards.
