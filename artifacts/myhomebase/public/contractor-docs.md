# MyHomeBase™ — Contractor Module
## Developer Reference: Architecture, API, Schema & Annotated Code

> **Generated:** 2026-06-26  
> **Routes version:** 2025-11-02-21:28  
> **Source sizes:** routes.ts 18,083 lines, schema.ts 2,377 lines  
> **Stack:** React 18 + TypeScript (Vite), Express 5 + Drizzle ORM (PostgreSQL)  
> **Monorepo:** pnpm workspaces — `@workspace/myhomebase` (frontend), `@workspace/api-server` (backend), `@workspace/db` (schema)

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Subscription Tiers (from live source)](#2-subscription-tiers)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [File Map](#4-file-map)
5. [Frontend Architecture](#5-frontend-architecture)
6. [API Reference — Public /api/contractors](#6-api-reference--public-apicontractors)
7. [API Reference — /api/contractor Management](#7-api-reference--apicontractor-management)
8. [API Reference — CRM /api/crm/*](#8-api-reference--crm-apicrm)
9. [API Reference — /api/proposals](#9-api-reference--apiproposals)
10. [Database Schema (from live schema.ts)](#10-database-schema)
11. [Annotated Code Walkthroughs](#11-annotated-code-walkthroughs)
12. [Integration Points](#12-integration-points)
13. [Key Patterns & Gotchas](#13-key-patterns--gotchas)

---

## 1. Module Overview

The contractor module is a B2B vertical within MyHomeBase™ serving three role types:

| Role | `companyRole` value | Capabilities |
|------|---------------------|--------------|
| **Owner** | `'owner'` | Full profile, billing, team management, all CRM |
| **Admin** | `'admin'` | Company-level admin; most owner rights except billing |
| **Tech** | `'tech'` | Invoice upload, own job history only |

**Routes extracted from live source:** 111 contractor endpoints total.

The module covers:
- **Profile & Discovery** — public-facing listing, reviews, ratings
- **Lead Capture** — homeowner messaging, proposals, connection codes
- **Team Management** — invite/suspend/remove techs; seat limits enforced server-side
- **CRM (Pro only)** — clients, jobs, quotes, invoices, Stripe payment links
- **Stripe Connect** — direct payout onboarding; charges-enabled check before invoicing
- **Boost** — paid geo-radius visibility boosts (Stripe charge at purchase)
- **Personal Home** — contractors may track one personal property

## 2. Subscription Tiers

**Source: `artifacts/api-server/src/routes/routes.ts` — `CONTRACTOR_PLANS` constant (auto-seeded to `subscription_plans` table at startup)**

```typescript
const CONTRACTOR_PLANS = [
    {
      tierName: 'contractor_basic',
      displayName: 'Contractor Basic',
      description: 'Essential tools for independent contractors',
      monthlyPrice: '20.00',
      minHouses: 0,
      maxHouses: 1, // 1 personal home for maintenance tracking
      planType: 'contractor',
      features: ['Get found by homeowners', 'Messaging with homeowners', 'Send proposals', 'Reviews and ratings profile', 'Earn up to $20/month in referral credits'],
      referralCreditCap: '20.00',
      hasCrmAccess: false,
      sortOrder: 0
    },
```

### Grandfathered Emails (from live source)

```typescript
const GRANDFATHERED_EMAILS = (process.env.GRANDFATHERED_EMAILS || 'lihandyman2008@gmail.com,bryanmendezdesign@gmail.com,freshandcleangutters@gmail.com').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
```

### Trial / Subscription State Machine

The `users.subscriptionStatus` field drives access:

```
trialing  →  active      (Stripe webhook: checkout.session.completed)
trialing  →  past_due    (trial ended, no payment)
active    →  past_due    (invoice.payment_failed)
past_due  →  canceled    (after grace period)
any       →  grandfathered (manual admin override; bypasses all checks)
```

## 3. Authentication & Authorization

### Session Shape

Express-session populated on login (Replit OIDC → `replitAuth.ts`, Google OAuth → `googleAuth.ts`, email/password → `storage.ts`).

```typescript
// req.session.user
{
  id: string;          // users.id
  email: string;
  role: 'contractor' | 'homeowner' | 'agent';
  companyId?: string;
  companyRole?: 'owner' | 'admin' | 'tech';
  firstName?: string;
  lastName?: string;
  subscriptionStatus?: string;
  trialEndsAt?: Date;
}
```

### Middleware Chain

```
isAuthenticated            — session check; 401 if missing
requireRole('contractor')  — role check; 403 if mismatch
requireContractorSubscription — trial/active check
requireCompanyRole(roles)  — checks req.session.user.companyRole
requireNotSuspended()      — checks suspendedUserIds Set
requireSameCompany         — cross-company data isolation
```

### `requireContractorSubscription` (from live source)

```typescript
const requireContractorSubscription = async (req: any, res: any, next: any) => {
  try {
    if (!req.session?.isAuthenticated || !req.session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.session.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Skip check for non-contractors
    if (user.role !== 'contractor') {
      return next();
    }
    
    // Check if grandfathered - free unlimited access
    const isGrandfathered = user.email && GRANDFATHERED_EMAILS.includes(user.email.toLowerCase());
    if (isGrandfathered || user.subscriptionStatus === 'grandfathered') {
      return next();
    }
    
    // Check if active subscription
    if (user.subscriptionStatus === 'active') {
      return next();
    }
    
    // Check if still in trial
    if (user.subscriptionStatus === 'trialing' && user.trialEndsAt) {
      const trialEnd = new Date(user.trialEndsAt);
      if (trialEnd > new Date()) {
        return next(); // Still in trial
      }
    }
    
    // Trial expired or no subscription - contractors have NO free features
    return res.status(403).json({ 
      message: 'Subscription required', 
      code: 'SUBSCRIPTION_REQUIRED',
      detail: 'Your free trial has ended. Contractors must subscribe to access HomeBase features.'
    });
  } catch (error) {
    console.error('[CONTRACTOR SUBSCRIPTION CHECK] Error:', error);
    return res.status(500).json({ message: 'Failed to verify subscription' });
  }
};
```

### `requireAdmin` (from live source)

Reads `ADMIN_EMAILS` env var (comma-separated). Protects `/api/admin/*` routes.

```typescript
const requireAdmin: any = (req: any, res: any, next: any) => {
    if (!req.session?.isAuthenticated || !req.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
    if (!adminEmails.includes(req.session.user.email)) {
      return res.status(403).json({ message: "Forbidden - admin access required" });
    }

    next();
  };
```

## 4. File Map

### Backend (`artifacts/api-server/src/`)

```
routes/routes.ts                     — All Express route registrations (18,083 lines)
replitAuth.ts                        — Replit OIDC setup + isAuthenticated, requireRole, etc.
googleAuth.ts                        — Google OAuth setup
storage.ts                           — IStorage interface + DatabaseStorage implementation
objectStorage.ts                     — Replit Object Storage wrapper
invoice-analysis-service.ts          — OpenAI-powered PDF invoice extraction
geocoding-service.ts                 — Nominatim + haversine distance
security-audit.ts                    — auditLogger, sessionManager
email-service.ts                     — SendGrid wrapper
sms-service.ts                       — Twilio wrapper
notification-orchestrator.ts         — Fan-out: push, email, SMS
db.ts                                — Drizzle + pg Pool singleton
```

### Database (`lib/db/src/`)

```
schema/schema.ts   — All Drizzle table definitions (2,377 lines)
index.ts           — Re-exports all tables and types
```

### Frontend (`artifacts/myhomebase/src/`)

```
pages/contractor-dashboard.tsx                   — 2011 lines — Main contractor hub
pages/contractor-crm.tsx                         — 2627 lines — Full CRM UI
pages/contractor-onboarding.tsx                  — 572 lines — 4-step registration wizard
components/proposals.tsx                         — 873 lines — Proposal CRUD + e-signature
components/stripe-connect-onboarding.tsx         — 293 lines — Stripe Connect setup
components/contractor-feature-gate.tsx           — 338 lines — Pro-tier paywall gate
```

## 5. Frontend Architecture

### contractor-dashboard.tsx — Exported identifiers

```typescript
export default function ContractorDashboard() {
```

### contractor-crm.tsx — Interfaces (type contracts)

```typescript
interface CrmLead {
interface CrmIntegration {
interface CrmClient {
interface CrmJob {
interface QuoteLineItem {
interface CrmQuote {
interface CrmInvoice {
interface DashboardStats {
```

### contractor-onboarding.tsx — Form steps and services list (head)

```typescript
import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Check, Briefcase, Wrench, Shield, Rocket, ChevronRight, ChevronLeft, Plus, X } from "lucide-react";
import "./home.css";

const C = {
  primary: '#1560A2',
  deep: '#0C3460',
  tint: '#EAF4FD',
  eyebrow: '#AFD6F9',
  border: 'rgba(21,96,162,0.12)',
};

const SERVICES = [
  "Appliance Installation", "Appliance Repair & Maintenance", "Basement Remodeling",
  "Bathroom Remodeling", "Cabinet Installation", "Carpet Cleaning", "Carpet Installation",
  "Chimney & Fireplace Services", "Concrete & Masonry", "Custom Carpentry",
  "Deck Construction", "Drainage Solutions", "Drywall & Spackling Repair",
  "Electrical Services", "Epoxy Flooring", "Exterior Painting", "Fence Installation",
  "Fire & Water Damage Restoration", "Furniture Assembly", "Garage Door Services",
  "General Contracting", "Gutter Cleaning and Repair", "Gutter Installation",
  "Handyman Services", "Hardwood Flooring", "Home Automation & Tech Services",
  "Home Inspection", "House Cleaning", "HVAC Services", "Interior Painting",
  "Irrigation Systems", "Junk Removal", "Kitchen Remodeling", "Laminate & Vinyl Flooring",
  "Landscape Design", "Lawn & Landscaping", "Local Moving", "Locksmiths",
  "Mold Remediation", "Pest Control", "Plumbing Services", "Pool Installation",
  "Pool Maintenance", "Pressure Washing", "Roofing Services",
  "Security System Installation", "Septic Services", "Siding Installation",
  "Snow Removal", "Tile Installation", "Tree Service & Trimming",
  "Trim & Finish Carpentry", "Window Cleaning", "Windows & Door Installation",
];

const EXPERIENCE_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "20+"];

const inpStyle: React.CSSProperties = {
  width: '100%', background: '#F3F5F7', border: `1.5px solid ${C.border}`,
  borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 500,
  color: '#1a1a1a', boxSizing: 'border-box', fontFamily: 'inherit',
  outline: 'none', appearance: 'none' as const,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: C.primary,
  letterSpacing: '0.03em', marginBottom: 6, display: 'block',
};

const STEPS = [
  { icon: Briefcase, label: "Basics" },
  { icon: Wrench,    label: "Services" },
  { icon: Shield,    label: "Credentials" },
  { icon: Rocket,    label: "Done!" },
];

type FormState = {
```

### contractor-feature-gate.tsx — Feature keys (from live source)

```typescript
const featureLabels: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  crm: { label: 'CRM Features', icon: <Users className="h-5 w-5" />, description: 'Full customer relationship management' },
  clients: { label: 'Client Management', icon: <Users className="h-5 w-5" />, description: 'Manage your customer database' },
  jobs: { label: 'Job Scheduling', icon: <Calendar className="h-5 w-5" />, description: 'Schedule and track jobs' },
  quotes: { label: 'Quotes & Estimates', icon: <FileText className="h-5 w-5" />, description: 'Create professional quotes' },
  invoices: { label: 'Invoicing', icon: <FileText className="h-5 w-5" />, description: 'Send invoices and track payments' },
  payments: { label: 'Payment Processing', icon: <CreditCard className="h-5 w-5" />, description: 'Accept payments via Stripe' },
  team: { label: 'Team Management', icon: <Users className="h-5 w-5" />, description: 'Manage your team members' },
  imports: { label: 'Data Import', icon: <Download className="h-5 w-5" />, description: 'Import from other CRMs' },
  analytics: { label: 'Business Analytics', icon: <BarChart3 className="h-5 w-5" />, description: 'Detailed business insights' },
};
```

### stripe-connect-onboarding.tsx — Status interface (from live source)

```typescript
interface StripeConnectStatus {
  hasAccount: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}
```

## 6. API Reference — Public /api/contractors

> Extracted from `routes.ts` — 14 routes

| Method | Path | Auth Middleware |
|--------|------|-----------------|
| `GET` | `/api/contractors` | none |
| `GET` | `/api/contractors/search` | none |
| `GET` | `/api/contractors/previously-used` | isAuthenticated |
| `GET` | `/api/contractors/:id` | none |
| `POST` | `/api/contractors/boost` | isAuthenticated |
| `GET` | `/api/contractors/boost/check` | isAuthenticated |
| `DELETE` | `/api/contractors/boost/:boostId` | isAuthenticated |
| `GET` | `/api/contractors/:contractorId/contacted-homeowners` | isAuthenticated |
| `GET` | `/api/contractors/:id/reviews` | none |
| `GET` | `/api/contractors/:id/rating` | none |
| `GET` | `/api/contractors/:id/can-review` | isAuthenticated |
| `GET` | `/api/contractors/:id/eligible-service-records` | isAuthenticated |
| `POST` | `/api/contractors/:id/reviews` | isAuthenticated |
| `POST` | `/api/contractors/:id/review-request` | isAuthenticated |

## 7. API Reference — /api/contractor Management

> Extracted from `routes.ts` — 35 routes

| Method | Path | Auth Middleware |
|--------|------|-----------------|
| `POST` | `/api/contractor/stripe-connect/create` | isAuthenticated, requireRole |
| `POST` | `/api/contractor/stripe-connect/onboarding-link` | isAuthenticated, requireRole |
| `GET` | `/api/contractor/stripe-connect/status` | isAuthenticated, requireRole |
| `POST` | `/api/contractor/stripe-connect/dashboard-link` | isAuthenticated, requireRole |
| `POST` | `/api/contractor/upload-logo` | isAuthenticated |
| `GET` | `/api/contractor/notifications/preferences` | isAuthenticated |
| `PATCH` | `/api/contractor/notifications/preferences` | isAuthenticated |
| `GET` | `/api/contractor/subscription` | isAuthenticated |
| `GET` | `/api/contractor/my-home` | isAuthenticated |
| `POST` | `/api/contractor/my-home` | isAuthenticated |
| `PATCH` | `/api/contractor/my-home/:houseId` | isAuthenticated |
| `DELETE` | `/api/contractor/my-home/:houseId` | isAuthenticated |
| `GET` | `/api/contractor/my-home/tasks` | isAuthenticated |
| `GET` | `/api/contractor/profile` | isAuthenticated, requireContractorSubscription |
| `PUT` | `/api/contractor/profile` | requireContractorSubscription |
| `GET` | `/api/contractor/licenses` | isAuthenticated |
| `POST` | `/api/contractor/licenses` | isAuthenticated |
| `PUT` | `/api/contractor/licenses/:id` | isAuthenticated |
| `DELETE` | `/api/contractor/licenses/:id` | isAuthenticated |
| `GET` | `/api/contractor/validate-token` | none |
| `POST` | `/api/contractor/accept-invite` | none |
| `POST` | `/api/contractor/invite-tech` | isAuthenticated, requireCompanyRole, requireNotSuspended |
| `POST` | `/api/contractor/team/:userId/resend-invite` | isAuthenticated, requireCompanyRole, requireNotSuspended |
| `GET` | `/api/contractor/team` | isAuthenticated, requireCompanyRole, requireNotSuspended |
| `PATCH` | `/api/contractor/team/:userId/suspend` | isAuthenticated, requireCompanyRole, requireNotSuspended, requireSameCompany |
| `PATCH` | `/api/contractor/team/:userId/reactivate` | isAuthenticated, requireCompanyRole, requireNotSuspended, requireSameCompany |
| `DELETE` | `/api/contractor/team/:userId/invite` | isAuthenticated, requireCompanyRole, requireNotSuspended, requireSameCompany |
| `PATCH` | `/api/contractor/team/:userId` | isAuthenticated, requireCompanyRole, requireNotSuspended, requireSameCompany |
| `DELETE` | `/api/contractor/team/:userId` | isAuthenticated, requireCompanyRole, requireNotSuspended, requireSameCompany |
| `GET` | `/api/contractor/team/audit-log` | isAuthenticated, requireCompanyRole, requireNotSuspended |
| `GET` | `/api/contractor/team/:userId/audit-log` | isAuthenticated, requireCompanyRole, requireNotSuspended |
| `GET` | `/api/contractor/company-homeowners` | isAuthenticated, requireCompanyRole, requireNotSuspended |
| `POST` | `/api/contractor/invoices/upload` | isAuthenticated, requireCompanyRole, requireNotSuspended |
| `GET` | `/api/contractor/invoices` | isAuthenticated, requireCompanyRole, requireNotSuspended |
| `GET` | `/api/contractor/invoices/:id` | isAuthenticated, requireNotSuspended |

## 8. API Reference — CRM /api/crm/*

> Extracted from `routes.ts` — 41 routes

| Method | Path | Auth Middleware |
|--------|------|-----------------|
| `POST` | `/api/crm/invoices/:invoiceId/payment-link` | isAuthenticated, requireRole |
| `GET` | `/api/crm/leads` | isAuthenticated, requireContractorSubscription |
| `POST` | `/api/crm/leads` | isAuthenticated, requireContractorSubscription |
| `GET` | `/api/crm/leads/:id` | isAuthenticated, requireContractorSubscription |
| `PATCH` | `/api/crm/leads/:id` | isAuthenticated |
| `DELETE` | `/api/crm/leads/:id` | isAuthenticated |
| `POST` | `/api/crm/leads/:leadId/notes` | isAuthenticated |
| `PATCH` | `/api/crm/notes/:id` | isAuthenticated |
| `DELETE` | `/api/crm/notes/:id` | isAuthenticated |
| `GET` | `/api/crm/integrations` | isAuthenticated |
| `POST` | `/api/crm/integrations` | isAuthenticated |
| `DELETE` | `/api/crm/integrations/:id` | isAuthenticated |
| `POST` | `/api/crm/webhooks/:integrationId` | none |
| `GET` | `/api/crm/webhooks/:integrationId/logs` | isAuthenticated |
| `GET` | `/api/crm/clients` | isAuthenticated, requireContractorSubscription |
| `POST` | `/api/crm/clients` | isAuthenticated, requireContractorSubscription |
| `GET` | `/api/crm/clients/:id` | isAuthenticated |
| `PATCH` | `/api/crm/clients/:id` | isAuthenticated |
| `DELETE` | `/api/crm/clients/:id` | isAuthenticated |
| `GET` | `/api/crm/jobs` | isAuthenticated |
| `POST` | `/api/crm/jobs` | isAuthenticated |
| `GET` | `/api/crm/jobs/:id` | isAuthenticated |
| `PATCH` | `/api/crm/jobs/:id` | isAuthenticated |
| `DELETE` | `/api/crm/jobs/:id` | isAuthenticated |
| `POST` | `/api/crm/jobs/:id/notify` | isAuthenticated |
| `GET` | `/api/crm/quotes` | isAuthenticated |
| `POST` | `/api/crm/quotes` | isAuthenticated |
| `GET` | `/api/crm/quotes/:id` | isAuthenticated |
| `PATCH` | `/api/crm/quotes/:id` | isAuthenticated |
| `POST` | `/api/crm/quotes/:id/send` | isAuthenticated |
| `DELETE` | `/api/crm/quotes/:id` | isAuthenticated |
| `GET` | `/api/crm/invoices` | isAuthenticated |
| `POST` | `/api/crm/invoices` | isAuthenticated |
| `GET` | `/api/crm/invoices/:id` | isAuthenticated |
| `PATCH` | `/api/crm/invoices/:id` | isAuthenticated |
| `POST` | `/api/crm/invoices/:id/send` | isAuthenticated |
| `POST` | `/api/crm/invoices/:id/payment` | isAuthenticated |
| `DELETE` | `/api/crm/invoices/:id` | isAuthenticated |
| `GET` | `/api/crm/dashboard` | isAuthenticated, requireContractorSubscription |
| `POST` | `/api/crm/import` | isAuthenticated |
| `GET` | `/api/crm/import/template` | isAuthenticated |

## 9. API Reference — /api/proposals

> Extracted from `routes.ts` — 7 routes

| Method | Path | Auth Middleware |
|--------|------|-----------------|
| `GET` | `/api/proposals` | isAuthenticated |
| `GET` | `/api/proposals/:id` | isAuthenticated |
| `POST` | `/api/proposals` | isAuthenticated |
| `PATCH` | `/api/proposals/:id` | isAuthenticated |
| `POST` | `/api/proposals/:id/sign` | isAuthenticated |
| `POST` | `/api/proposals/:id/contract` | isAuthenticated |
| `DELETE` | `/api/proposals/:id` | isAuthenticated |


### Proposal Status Flow

```
draft  →  sent  →  accepted  →  (contract uploaded)  →  (contract signed)
                →  rejected
                →  expired
```

## 10. Database Schema

> Extracted from `lib/db/src/schema/schema.ts` — 10 tables

### `companies` (`companies`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid/varchar | auto |
| `name` | text | not null |
| `bio` | text | not null |
| `experience` | int | not null, default: 0 |
| `location` | text | not null |
| `ownerId` | varchar | not null |
| `rating` | decimal | not null, default: "0" |
| `reviewCount` | int | not null, default: 0 |
| `services` | text[] | not null |
| `phone` | text | not null |
| `email` | text | not null |
| `address` | text |  |
| `city` | text |  |
| `state` | text |  |
| `postalCode` | text |  |
| `latitude` | decimal |  |
| `longitude` | decimal |  |
| `serviceRadius` | int | not null, default: 25 |
| `hasEmergencyServices` | bool | not null, default: false |
| `businessLogo` | text |  |
| `projectPhotos` | text[] | default: sql`ARRAY[]::text[]` |
| `website` | text |  |
| `facebook` | text |  |
| `instagram` | text |  |
| `linkedin` | text |  |
| `googleBusinessUrl` | text |  |
| `countryId` | varchar | FK → countries |
| `regionId` | varchar | FK → regions |
| `licenseNumber` | text | not null |
| `licenseMunicipality` | text | not null |
| `isLicensed` | bool | not null, default: true |
| `licenses` | text |  |
| `insuranceInfo` | text |  |
| `referralCode` | varchar | unique |
| `stripeConnectAccountId` | varchar |  |
| `stripeOnboardingComplete` | bool | default: false |
| `stripeChargesEnabled` | bool | default: false |
| `stripePayoutsEnabled` | bool | default: false |
| `stripeDefaultCurrency` | varchar | default: "usd" |
| `subscriptionTier` | text | default: "individual" |
| `maxTechSeats` | int | default: 3 |
| `createdAt` | timestamp | auto |
| `updatedAt` | timestamp | auto |

### `company_invite_codes` (`companyInviteCodes`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid/varchar | auto |
| `companyId` | varchar | FK → companies, not null |
| `code` | varchar | not null, unique |
| `createdBy` | varchar | not null |
| `isActive` | bool | not null, default: true |
| `usedBy` | varchar |  |
| `usedAt` | timestamp |  |
| `expiresAt` | timestamp |  |
| `createdAt` | timestamp | auto |

### `contractors` (`contractors`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid/varchar | auto |
| `userId` | varchar | not null |
| `companyId` | varchar | FK → companies, not null |
| `name` | text | not null |
| `company` | text | not null |
| `bio` | text | not null |
| `location` | text | not null |
| `distance` | decimal |  |
| `rating` | decimal | not null |
| `reviewCount` | int | not null, default: 0 |
| `experience` | int | not null |
| `services` | text[] | not null |
| `phone` | text | not null |
| `email` | text | not null |
| `address` | text |  |
| `city` | text |  |
| `state` | text |  |
| `licenseNumber` | text | not null |
| `licenseMunicipality` | text | not null |
| `isLicensed` | bool | not null, default: true |
| `serviceRadius` | int | not null, default: 25 |
| `hasEmergencyServices` | bool | not null, default: false |
| `profileImage` | text |  |
| `businessLogo` | text |  |
| `projectPhotos` | text[] | default: sql`ARRAY[]::text[]` |
| `isVerified` | bool | not null, default: false |
| `insuranceCarrier` | text |  |
| `insurancePolicyNumber` | text |  |
| `insuranceExpiryDate` | text |  |
| `insuranceCoverageAmount` | text |  |
| `website` | text |  |
| `facebook` | text |  |
| `instagram` | text |  |
| `linkedin` | text |  |
| `googleBusinessUrl` | text |  |
| `countryId` | varchar | FK → countries |
| `regionId` | varchar | FK → regions |
| `licenses` | text |  |
| `insuranceInfo` | text |  |
| `postalCode` | text |  |
| `createdAt` | timestamp | auto |

### `contractor_reviews` (`contractorReviews`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid/varchar | auto |
| `contractorId` | text | not null |
| `companyId` | varchar | FK → companies |
| `homeownerId` | text | not null |
| `rating` | int | not null |
| `comment` | text |  |
| `serviceDate` | timestamp |  |
| `serviceType` | text |  |
| `wouldRecommend` | bool | not null, default: true |
| `deviceFingerprint` | text |  |
| `ipAddress` | varchar |  |
| `isVerifiedService` | bool | not null, default: false |
| `serviceRecordId` | varchar |  |
| `reviewPhotoUrl` | text |  |
| `contractorResponse` | text |  |
| `contractorRespondedAt` | timestamp |  |
| `createdAt` | timestamp | auto |
| `updatedAt` | timestamp | auto |

### `proposals` (`proposals`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid/varchar | auto |
| `contractorId` | text | not null |
| `companyId` | varchar | FK → companies |
| `createdBy` | varchar |  |
| `homeownerId` | text |  |
| `title` | text | not null |
| `description` | text | not null |
| `serviceType` | text | not null |
| `estimatedCost` | decimal | not null |
| `estimatedDuration` | text | not null |
| `scope` | text | not null |
| `materials` | text[] | not null, default: sql`'{}'::text[]` |
| `warrantyPeriod` | text |  |
| `validUntil` | text | not null |
| `status` | text | not null, default: "draft" |
| `customerNotes` | text |  |
| `internalNotes` | text |  |
| `attachments` | text[] | default: sql`'{}'::text[]` |
| `contractFilePath` | text |  |
| `contractSignedAt` | timestamp |  |
| `customerSignature` | text |  |
| `contractorSignature` | text |  |
| `signatureIpAddress` | text |  |
| `createdAt` | timestamp | auto |
| `updatedAt` | timestamp | auto |

### `contractor_boosts` (`contractorBoosts`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid/varchar | auto |
| `contractorId` | text | not null |
| `serviceCategory` | text | not null |
| `businessAddress` | text | not null |
| `businessLatitude` | decimal | not null |
| `businessLongitude` | decimal | not null |
| `boostRadius` | int | not null, default: 10 |
| `startDate` | timestamp | not null |
| `endDate` | timestamp | not null |
| `amount` | decimal | not null |
| `stripePaymentIntentId` | text |  |
| `status` | text | not null, default: "active" |
| `isActive` | bool | not null, default: true |
| `createdAt` | timestamp | auto |
| `updatedAt` | timestamp | auto |
| `stripePaymentIntentIdUnique` | text |  |

### `crm_clients` (`crmClients`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid/varchar | auto |
| `contractorUserId` | varchar | FK → users, not null |
| `companyId` | varchar | FK → companies |
| `firstName` | text | not null |
| `lastName` | text | not null |
| `email` | text |  |
| `phone` | text |  |
| `secondaryPhone` | text |  |
| `address` | text |  |
| `city` | text |  |
| `state` | text |  |
| `postalCode` | text |  |
| `notes` | text |  |
| `tags` | text[] | default: sql`ARRAY[]::text[]` |
| `preferredContactMethod` | text | default: "phone" |
| `isActive` | bool | not null, default: true |
| `totalJobsCompleted` | int | not null, default: 0 |
| `totalRevenue` | decimal | default: "0.00" |
| `lastServiceDate` | timestamp |  |
| `createdAt` | timestamp | auto |
| `updatedAt` | timestamp | auto |

### `crm_jobs` (`crmJobs`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid/varchar | auto |
| `contractorUserId` | varchar | FK → users, not null |
| `companyId` | varchar | FK → companies |
| `clientId` | varchar | FK → crmClients, not null |
| `quoteId` | varchar |  |
| `title` | text | not null |
| `description` | text |  |
| `serviceType` | text | not null |
| `status` | text | not null, default: "scheduled" |
| `priority` | text | not null, default: "normal" |
| `scheduledDate` | timestamp | not null |
| `scheduledEndDate` | timestamp |  |
| `actualStartTime` | timestamp |  |
| `actualEndTime` | timestamp |  |
| `estimatedDuration` | int |  |
| `actualDuration` | int |  |
| `address` | text |  |
| `city` | text |  |
| `state` | text |  |
| `postalCode` | text |  |
| `laborCost` | decimal |  |
| `materialsCost` | decimal |  |
| `totalCost` | decimal |  |
| `notes` | text |  |
| `internalNotes` | text |  |
| `completionNotes` | text |  |
| `createdAt` | timestamp | auto |
| `updatedAt` | timestamp | auto |

### `crm_quotes` (`crmQuotes`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid/varchar | auto |
| `contractorUserId` | varchar | FK → users, not null |
| `companyId` | varchar | FK → companies |
| `clientId` | varchar | FK → crmClients, not null |
| `quoteNumber` | varchar | not null |
| `title` | text | not null |
| `description` | text |  |
| `serviceType` | text | not null |
| `status` | text | not null, default: "draft" |
| `lineItems` | jsonb | not null, default: sql`'[]'::jsonb` |
| `subtotal` | decimal | not null |
| `taxRate` | decimal | default: "0.00" |
| `taxAmount` | decimal | default: "0.00" |
| `discount` | decimal | default: "0.00" |
| `total` | decimal | not null |
| `validUntil` | timestamp |  |
| `sentAt` | timestamp |  |
| `viewedAt` | timestamp |  |
| `acceptedAt` | timestamp |  |
| `declinedAt` | timestamp |  |
| `notes` | text |  |
| `termsAndConditions` | text |  |
| `createdAt` | timestamp | auto |
| `updatedAt` | timestamp | auto |

### `crm_invoices` (`crmInvoices`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid/varchar | auto |
| `contractorUserId` | varchar | FK → users, not null |
| `companyId` | varchar | FK → companies |
| `clientId` | varchar | FK → crmClients, not null |
| `jobId` | varchar | FK → crmJobs |
| `quoteId` | varchar | FK → crmQuotes |
| `invoiceNumber` | varchar | not null |
| `title` | text | not null |
| `description` | text |  |
| `status` | text | not null, default: "draft" |
| `lineItems` | jsonb | not null, default: sql`'[]'::jsonb` |
| `subtotal` | decimal | not null |
| `taxRate` | decimal | default: "0.00" |
| `taxAmount` | decimal | default: "0.00" |
| `discount` | decimal | default: "0.00" |
| `total` | decimal | not null |
| `amountPaid` | decimal | default: "0.00" |
| `amountDue` | decimal | not null |
| `dueDate` | timestamp |  |
| `sentAt` | timestamp |  |
| `viewedAt` | timestamp |  |
| `paidAt` | timestamp |  |
| `paymentMethod` | text |  |
| `paymentNotes` | text |  |
| `notes` | text |  |
| `termsAndConditions` | text |  |
| `homeownerId` | varchar | FK → users |
| `houseId` | varchar | FK → houses |
| `createdAt` | timestamp | auto |
| `updatedAt` | timestamp | auto |

## 11. Annotated Code Walkthroughs

### 11.1 Stripe Connect Initialization (from routes.ts)

```typescript
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" })
  : null;
```

> Stripe instance is `null` when `STRIPE_SECRET_KEY` is absent. All Stripe routes must null-check before use.

### 11.2 Proposal Component — Signature Flow

```typescript
const signatureMutation = useMutation({
    mutationFn: ({ proposalId, signatureData }: { 
      proposalId: string; 
      signatureData: { signature: string; signerName: string; signedAt: string; ipAddress?: string } 
    }) => apiRequest(`/api/proposals/${proposalId}/sign`, "POST", signatureData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setShowSignature(false);
      setSigningProposal(null);
      toast({
        title: "Success",
        description: "Contract signed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sign contract",
        variant: "destructive",
      });
    },
  });
```

### 11.3 Stripe Connect Component — State Machine

Three display states driven by `StripeConnectStatus`:

```
!hasAccount              → show "Connect with Stripe" CTA
hasAccount && !charges   → show "Complete Setup" (incomplete onboarding)
hasAccount && charges    → show Connected + Stripe Express dashboard link
```

```typescript
if (!status?.hasAccount) {
    return (
      <Card className="border-2 border-dashed border-blue-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-blue-100">
```

### 11.4 Feature Gate — hasCrmAccess Logic

```typescript
export function ContractorFeatureGate({ children, feature, fallback }: ContractorFeatureGateProps) {
  const { hasCrmAccess, isLoading } = useContractorSubscription();

  if (isLoading) {
    return <div className="animate-pulse bg-muted h-32 rounded-lg" />;
  }

  if (hasCrmAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <ContractorUpgradePrompt feature={feature} />;
}
```

## 12. Integration Points

| Integration | Used by | Config env var |
|---|---|---|
| **Stripe Connect** | `/api/contractor/stripe-connect/*` | `STRIPE_SECRET_KEY` |
| **Stripe Payment Links** | `/api/crm/invoices/:id/payment-link` | `STRIPE_SECRET_KEY` |
| **Stripe Subscriptions** | Webhooks at `/api/stripe/webhook` | `STRIPE_WEBHOOK_SECRET` |
| **SendGrid** | Quote/invoice send, invite emails | `SENDGRID_API_KEY` |
| **Twilio** | Job notifications, quote/invoice SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |
| **OpenAI** | Invoice PDF analysis (GPT-4o Vision) | `OPENAI_API_KEY` |
| **Replit Object Storage** | Logos, photos, proposal attachments | managed |

## 13. Key Patterns & Gotchas

### 1. Company vs. Contractor Duality

Two tables exist: `contractors` (individual) and `companies` (team entity). Profile PUT auto-creates a company when `companyId` is null. Homeowner-facing queries prefer company data (logo, reviews) over individual contractor data.

### 2. Proposal Creation Restricted to Conversations

The Create Proposal `<DialogTrigger>` in `proposals.tsx` is inside `{false && ...}` — intentionally hidden. Proposal creation only surfaces in the Messages tab, scoped to active conversations, preventing cold spam.

### 3. Tech Role Reduced Capabilities

Techs (`companyRole === 'tech'`) see `<TechDashboard>` instead of the full dashboard. Techs can upload invoices and view their own history only.

### 4. CRM Subscription Gap

`GET /api/crm/clients` requires `requireContractorSubscription`, but individual `GET/PATCH/DELETE /api/crm/clients/:id` only have `isAuthenticated`. Expired contractors can still read/modify individual records they already created.

### 5. No Pagination on List Endpoints

All list endpoints return full unbounded sets. Cursor-based pagination is needed before contractor/CRM data grows large.

### 6. Emergency Reset Endpoint

`POST /api/admin/emergency-reset` still exists in routes.ts (search for `emergency-reset`). `EMERGENCY_RESET_SECRET` has been removed from production env (returns 404), but the dead code should be removed in a future cleanup pass.

### 7. Stripe API Version Pinned

`apiVersion: '2025-08-27.basil'` is pinned in routes.ts. Any Stripe SDK upgrade must be checked against this version's breaking changes.

### 8. Rate Limits

authLimiter: 100/15min. uploadLimiter: 10/hour. aiChatLimiter: 20/hour. All applied per-IP.

---

*Generated 2026-06-26 from live source — routes.ts v2025-11-02-21:28*  
*MyHomeBase™ · gotohomebase.com · © 2026 CodeStation AI*