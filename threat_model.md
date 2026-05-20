# Threat Model

## Project Overview

HomeBase is a publicly deployed property-maintenance platform with separate experiences for homeowners, contractors, and agents. The production application consists of a React frontend in `artifacts/myhomebase` and an Express 5 API in `artifacts/api-server`, backed by PostgreSQL/Drizzle, Replit/Google auth flows, object storage, Stripe, SendGrid, Twilio, Firebase push, and OpenAI-powered document analysis.

The scan should focus on production-reachable code paths. `artifacts/mockup-sandbox` is dev-only unless a production route is shown to serve it. The deployment is public, so unauthenticated routes are internet-exposed.

## Assets

- **User accounts and sessions** — homeowner, contractor, and agent identities; session cookies; OAuth-linked accounts. Compromise enables impersonation and downstream access to homes, messages, billing, and business data.
- **Homeowner property data** — houses, maintenance logs, home documents, claim packages, handoff packages, invoices, inspection outputs, and disclosure data. This includes sensitive household and property information.
- **Contractor and agent business data** — company profiles, logos, analytics, reviews, payouts, referral data, and connected Stripe account identifiers.
- **Payment and subscription state** — Stripe customer IDs, subscription status, Stripe Connect accounts, invoice/payment metadata, referral credits, and payouts.
- **Private stored files** — uploaded contracts, handoff documents, vault documents, invoices, inspection files, and any object-storage-backed attachments.
- **Application secrets and outbound service authority** — database credentials, session secret, OAuth credentials, Stripe secret/webhook secret, SendGrid, Twilio, Firebase, and OpenAI keys.

## Trust Boundaries

- **Browser/mobile client to API server** — all request bodies, params, headers, uploaded files, and WebSocket messages are untrusted.
- **API server to PostgreSQL** — application code can read and modify all tenant data; injection or broken authorization at the API layer risks full data compromise.
- **API server to object storage** — the API issues upload URLs and serves private objects; ownership checks must prevent cross-tenant file access.
- **Public to authenticated users** — public endpoints exist for landing, auth initiation, geocoding, and some demo flows, while most account, document, and payment routes should require valid authentication.
- **Authenticated user to privileged roles** — homeowner, contractor, agent, and admin capabilities must be separated server-side; client-side role hints are not trusted.
- **API server to external providers** — Stripe, SendGrid, Twilio, OpenAI, Google/Nominatim, and Squarespace proxying all cross an external-service boundary and must not allow attacker-controlled privilege use.
- **Development/internal-only behavior to production** — debug/test endpoints, demo conveniences, and migration helpers must not remain exploitable on the public deployment.

## Scan Anchors

- **Primary production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/routes.ts`, `artifacts/myhomebase/src/main.tsx`.
- **Highest-risk server areas:** auth/session handling in `replitAuth.ts` and `googleAuth.ts`; the monolithic API route file; object storage and upload flows in `objectStorage.ts` and related routes; Stripe/webhook/payment routes; AI document-analysis routes; messaging and proposal/document flows.
- **Public surfaces:** `/api/login`, `/api/callback`, `/auth/google*`, public landing routes, `/api/address-suggest`, `/api/geocode`, `/api/health`, and any debug/demo/test endpoints reachable without auth.
- **Authenticated/privileged surfaces:** `/api/admin/*`, account/billing/session routes, document vault and `/objects/*`, messaging, proposals, review moderation, contractor/agent payout features.
- **Usually ignore unless proven production-reachable:** `artifacts/mockup-sandbox`, local/test-only tooling, migration helpers invoked only from scripts.

## Threat Categories

### Spoofing

The application relies heavily on session cookies and multiple auth paths (Replit OIDC, Google OAuth, email/password, and demo/debug conveniences). Production endpoints must never create or switch sessions based solely on user-supplied identifiers, and any test or emergency auth path must be removed or fully disabled in production.

### Tampering

Users can update homes, proposals, documents, company branding, payouts-related settings, and other tenant data. The API must enforce ownership and role checks server-side for every mutation, especially where object-storage paths, file uploads, email addresses, or IDs are supplied by the client.

### Information Disclosure

The platform stores household documents, invoices, maintenance history, claim packages, and business analytics. API responses, file-download routes, logs, and debug endpoints must not expose another tenant’s data, secrets, or internal object paths. Private object retrieval must be scoped to the owning user or authorized role, not merely “any authenticated user.”

### Denial of Service

The API accepts large JSON bodies and multiple upload flows, performs AI analysis on images/documents, and makes outbound calls to third-party providers. Public or lightly protected endpoints must not allow attackers to force high-cost AI calls, large in-memory uploads, or abusive notification/payment/provider traffic.

### Elevation of Privilege

The biggest risk areas are broken access control across multi-role features and debug/admin leftovers. Admin capabilities must be gated by validated server-side identity, tenant-scoped resources must not be accessible across users, and upload/object-storage flows must not permit arbitrary file replacement or retrieval through predictable identifiers or user-controlled paths.