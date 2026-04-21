# Home Base - Compressed replit.md

## Overview
Home Base is a full-stack web application designed to connect homeowners with contractors, facilitate a DIY product marketplace, and offer seasonal home maintenance guidance. It aims to streamline property management for homeowners and enhance operational efficiency for contractors. The project offers multi-property management, detailed proposal handling, and a gamified home health score, establishing a comprehensive ecosystem for home maintenance and improvement. Its landing page emphasizes a "Carfax-style home history" value proposition.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Design and UI/UX
- **Aesthetic**: Role-branded design system — Homeowner (purple), Contractor (blue), Agent (green).
- **Typography**: Inter for body/UI text, Quicksand for headings. Both loaded via Google Fonts.
- **Components**: Utilises `shadcn/ui` built on Radix UI plus custom design-spec component classes (`.page-header`, `.stat-chip`, `.card`, `.btn-primary`, `.form-input`, etc.) in `index.css`.
- **Theming**: CSS variables scoped to `body[data-role]` and `.theme-*` classes (applied to body by `App.tsx`). Supports dark mode via `.dark` class.
- **Navigation — 3 distinct viewport experiences**:
  - **Phone (< 768px)**: Dark primary-coloured top bar (logo + bell), bottom nav with 4 role-specific items.
  - **Tablet (768–1023px)**: Dark primary-coloured top bar with horizontal `TabletNav` row below it, no sidebar, no bottom nav.
  - **Desktop (1024px+)**: White left sidebar (w-52, desktop-only) + dark header (logo + bell + notifications).
- **Layout files**: `authenticated-layout.tsx` (no footer, `lg:ml-52` main offset), `header.tsx`, `bottom-nav.tsx`, `sidebar.tsx`.
- **Footer**: Retained in `footer.tsx` but only rendered in the unauthenticated layout (public pages).

### Technical Implementation
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack Query for state management, and Tailwind CSS for styling.
- **Backend**: Node.js with Express.js, TypeScript, and ES modules, implementing a RESTful API.
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations and Drizzle Kit for schema management.
- **Data Flow**: End-to-end type safety achieved through shared TypeScript types between frontend and backend.
- **Security**: Enterprise-grade security measures including Helmet.js, rate limiting, CORS validation, secure sessions, SQL/XSS prevention, and Zod input validation.
- **SOC 2 Type II Compliance**: Implements comprehensive technical controls including an audit logging system, advanced session security, enhanced security headers (CSP, HSTS), user-level rate limiting, and encryption helpers (AES-256-GCM).

### Feature Specifications
- **User Management**: Supports Homeowner, Contractor, and Real Estate Agent roles with email/password authentication, Google OAuth, and demo logins.
- **Admin Dashboard**: Provides user analytics, signup trends, and invite code management.
- **Contractor Features**:
    - Company-based architecture with multi-user access.
    - Years on Platform Badge for credibility.
    - Profile view tracking and monthly email reports for contractors.
    - CRM System for lead management (manual and webhook integration).
- **Homeowner Features**:
    - Multi-property support with climate zone detection and centralized service records.
    - Home Health Score and DIY Savings Tracker.
    - **Weekly Task Reminders**: Automated email reminders sent every Friday morning with remaining maintenance tasks for the current month. Shows high-priority tasks prominently, grouped by house. Respects homeowner `maintenance` notification preferences.
    - AI-powered contractor recommendations (GPT-5).
    - Permanent connection code system for sharing service records.
    - Geocoded 20-mile contractor filtering.
    - Comprehensive house transfer system.
    - Displays previously used contractors per property.
    - Age-based system maintenance recommendations for 24 home system types.
- **Marketplace**: Functionality for listing and browsing DIY products.
- **Maintenance Guidance**: Seasonal, location-based, and prioritized home maintenance schedules.
- **Notifications**: Bi-directional real-time notifications, including Twilio SMS for reminders and messages.
- **Proposal System**: Contractors can create and homeowners can manage detailed proposals.
- **Billing and Subscription**:
    - **Card-preload trial flow for homeowners**: New homeowner registrations start as `inactive`. After registration they are redirected to `/homeowner-pricing?onboarding=true`, where they pick a plan and complete Stripe Checkout with `trial_period_days: 14`. The card is saved but not charged until the 14-day trial ends. Contractors still auto-trial.
    - 14-day free trial, tiered subscription plans for homeowners.
    - Tiered contractor subscription plans (Basic, Pro) with referral credit caps.
    - Referral rewards system.
    - Stripe Billing Reconciliation for subscription management and billing history.
- **Real Estate Agent Affiliate System**: Agents earn referral commissions via unique codes, with automated $15 payouts after 4 months of paid subscription, managed through Stripe Connect.
- **Agent Home Handoff Package**: Agents upload closing/disclosure documents (PDF or images), AI (GPT-4o-mini) extracts home system and appliance data, and a magic-link email is sent to the buyer. Buyers click the link to claim a pre-populated home record (systems + appliances seeded). Routes: `/agent-handoff` (agent management), `/handoff/:token` (buyer claim). DB tables: `home_handoff_packages`, `handoff_documents`.
- **Gamified Achievement System**: 66 achievements across 8 categories with real-time progress tracking and house-based filtering.
- **Review System (Upgraded - Task #8)**:
    - Reviews require a **verified service record** linked to the homeowner + contractor, marked completed, with proof of work (invoice URL or photos), and at least **48 hours** past completion before a review can be submitted.
    - Reviews are **immutable** — cannot be edited or deleted by homeowners or contractors. Only admins can delete reviews.
    - **Star breakdown**: GET /api/contractors/:id/rating now returns `starBreakdown` (count per 1–5 stars) displayed with a collapsible progress bar breakdown in the UI.
    - **Contractor one-time response**: POST /api/reviews/:id/response — contractors can respond once (final, cannot be changed). Displayed in a blue-bordered box below the review.
    - **Review requests**: POST /api/contractors/:id/review-request — contractors can send a review request to a homeowner for a completed job. Sends in-app + push notification. GET /api/homeowner/review-requests for homeowner to see pending requests.
    - **Photo upload**: Review submission accepts an optional photo (multipart/form-data). Stored to object storage, URL saved as `reviewPhotoUrl`.
    - **Service record proof**: `service_records` table has `completedAt`, `invoiceUrl`, `servicePhotos[]`. `contractor_reviews` has `serviceRecordId`, `reviewPhotoUrl`, `contractorResponse`, `contractorRespondedAt`.
    - New `review_requests` table: tracks contractor-initiated review requests with status (pending/accepted/declined).
    - **Verified Service badge**: shown on reviews that have `isVerifiedService=true` (always true for new reviews since service record is required).
    - "Request Review" button in contractor's service records page for completed jobs with a linked homeownerId.
- **AI Invoice Analysis & Verification (Task #19)**:
    - Homeowners upload invoice/receipt photos from the Maintenance and Service Records pages via "AI Scan Invoice" button.
    - GPT-4o-mini vision extracts: service description, date, total amount, contractor name/company, home area, service type, and AI confidence level (high/medium/low).
    - Invalid images (non-invoices) return 422 INVALID_INVOICE and show a specific user-facing toast.
    - Contractor flow (3 steps): upload invoice → review/edit extracted data → confirm to create maintenance log.
    - DIY flow (4 steps): upload optional material receipt → **explicit diy-verify step** (before photos + after photos + optional receipt; AI verifies completion) → review/edit → confirm. Confirm is gated: DIY analyses require diyVerified=true.
    - "Verified by AI" badge appears on maintenance records created via the AI invoice flow.
    - API contract (implemented): JSON + base64 payloads (not multipart). Status values: pending/confirmed/rejected. Receipt is optional in both steps.
    - DB table: `invoice_analyses` (`0008_invoice_analyses.sql`). Service: `server/invoice-analysis-service.ts`. Routes: POST `/api/invoice-analyses/analyze` (returns 422 on invalid invoice), POST `/api/invoice-analyses/:id/diy-verify`, PATCH `/api/invoice-analyses/:id/confirm`, PATCH `/api/invoice-analyses/:id/reject`, GET `/api/invoice-analyses`.
- **Error Tracking**: React ErrorBoundary, client-side error logger, and database schema for error tracking accessible via an admin console.

## External Dependencies

### Frontend
- **React Ecosystem**: React, React DOM, Wouter
- **State Management**: TanStack React Query
- **UI & Styling**: Radix UI, shadcn/ui, Tailwind CSS
- **Forms**: React Hook Form
- **Utilities**: date-fns, lucide-react

### Backend
- **Server**: Express.js
- **Database**: Drizzle ORM, @neondatabase/serverless
- **Validation**: Zod
- **Development**: tsx
- **Session Management**: connect-pg-simple
- **Authentication**: bcryptjs, passport

### Mobile App (iOS & Android)
- **Framework**: Capacitor wraps the existing web app as a native iOS/Android app
- **App ID**: `com.gotohomebase.app`
- **Approach**: `server.url = 'https://gotohomebase.com'` — native app loads live web server (auto-updates without store releases)
- **Native projects**: `ios/` (Xcode) and `android/` (Android Studio) directories are committed
- **Icons/Splash**: Source images in `resources/`; generated sizes in native projects via `npx @capacitor/assets generate`
- **Config**: `capacitor.config.ts` at project root
- **Build guide**: `MOBILE_BUILD.md` covers prerequisites, build steps, and store submission for both platforms
- **CORS**: `capacitor://localhost` and `https://localhost` origins allowed for native WebView API calls

### Third-Party Services
- **Geocoding**: OpenStreetMap Nominatim
- **Address Autocomplete**: Google Places API, OpenStreetMap
- **AI**: Replit AI Integrations (for GPT-5)
- **SMS**: Twilio
- **Payments**: Stripe Connect