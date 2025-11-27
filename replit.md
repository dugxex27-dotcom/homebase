# Home Base - Compressed replit.md

## Overview

Home Base is a full-stack web application designed to connect homeowners with contractors, facilitate a DIY product marketplace, and offer seasonal home maintenance guidance. It aims to streamline property management for homeowners and enhance operational efficiency for contractors, featuring a modern purple gradient aesthetic and robust tools like multi-property management, detailed proposal handling, and a gamified home health score. The project seeks to create a comprehensive ecosystem for home maintenance and improvement.

**Landing Page**: Simplified homeowner home page (November 2025) with focused messaging on "Carfax-style home history" value proposition, featuring hero section with CTA button and referral rewards card. Home Health Score and Achievements accessible through maintenance and achievements pages respectively.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Design and UI/UX
- **Aesthetic**: Modern purple/blue gradient theme with a custom HomeBase logo, optimized for a consistent user experience.
- **Components**: Utilizes `shadcn/ui` built on Radix UI.
- **Theming**: Supports light/dark mode with role-based color palettes (purple for homeowners, red for contractors).
- **Navigation**: Features role-based dashboards.

### Technical Implementation
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack Query for state management, and Tailwind CSS for styling.
- **Backend**: Node.js with Express.js, TypeScript, and ES modules, implementing a RESTful API.
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations and Drizzle Kit for schema management.
- **Data Flow**: End-to-end type safety achieved through shared TypeScript types between frontend and backend.
- **Security**: Enterprise-grade security measures including Helmet.js, rate limiting, CORS validation, secure sessions, SQL/XSS prevention, and Zod input validation.

### Feature Specifications
- **User Management**: Supports Homeowner, Contractor, and Real Estate Agent roles.
- **Authentication**: Email/password with bcrypt, Google OAuth, two-step password reset, and optional invite codes. Includes demo logins for all user roles with realistic historical data.
- **Admin Dashboard**: Provides user analytics, signup trends, search insights, and invite code management.
- **Contractor Architecture**: Company-based structure supporting multi-user access and dedicated API endpoints.
- **Contractor Display Features**:
    - **Years on Platform Badge**: Visual medal badge showing contractor tenure (years since account creation), displayed on contractor cards to build trust and credibility with homeowners.
- **Homeowner Features**:
    - Multi-property support with climate zone detection and centralized service records.
    - **Home Health Score**: Gamified maintenance tracking based on completed/missed tasks.
    - **DIY Savings Tracker**: Tracks financial savings from DIY tasks, including professional cost estimates and regional multipliers, with per-property displays.
    - **Service Records Display**: Efficiently displays recent service records with options to view older ones.
    - **AI Contractor Recommendation**: AI-powered (GPT-5) recommendations for contractors based on homeowner needs.
    - **Permanent Connection Code System**: Unique 8-character codes for sharing service records with contractors.
    - **20-Mile Contractor Filtering**: Geocoded addresses enable distance-based contractor search for specific service categories.
    - **House Transfer System**: Comprehensive property ownership transfer with all associated data, secured by a token-based system.
    - **Previously Used Contractors**: When a house is selected, displays a dedicated "Your Contractors at [House Name]" section showing contractors previously used at that property, sorted by most recent work, making it easy to find and re-hire trusted contractors.
    - **Age-Based System Maintenance Recommendations**: Intelligent maintenance guidance based on installation year for all 24 home system types (heating, cooling, water, and special features). Provides age-appropriate recommendations with three urgency levels (critical/important/routine), cost estimates, and actionable maintenance tasks. Color-coded cards display system age, replacement timelines, and professional service schedules tailored to each system's typical lifespan.
- **Marketplace**: Functionality for listing and browsing DIY products.
- **Maintenance Guidance**: Seasonal home maintenance schedules with location-based and prioritized tasks.
- **Service Categories**: Supports 76 distinct service categories.
- **Notifications**: Bi-directional real-time notifications for homeowners and contractors.
- **Proposal System**: Contractors can create detailed proposals, and homeowners can view and manage them within the app.
- **Billing and Subscription**:
    - 14-day free trial.
    - Tiered subscription plans for homeowners.
    - **Contractor Subscription Tiers**:
        - **Basic ($20/month)**: Lead management, CRM integrations, $20/month referral credit cap
        - **Pro ($40/month)**: Full CRM access including client management, job scheduling, quotes, invoices, dashboard analytics, $40/month referral credit cap
    - Referral rewards system: $1 per active referral, capped by subscription tier.
- **Real Estate Agent Affiliate System**: Agents earn referral commissions via unique codes and track earnings through a dedicated dashboard.
- **CRM System for Contractors**: Includes manual lead management (CRUD) and a webhook integration system for automatic lead syncing from external CRMs, with company-scoped access control.
- **Error Tracking and Monitoring**: Features a React ErrorBoundary, client-side error logger, and a database schema for tracking errors, accessible via an admin-only developer console.
- **Stripe Billing Reconciliation**: Processes Stripe webhook events for subscription management, tracks subscription cycles, and provides users with a complete billing history UI.
- **Gamified Achievement System**: Features 66 achievements across 8 categories (Seasonal, Financial Savvy, Organization, Referral & Community, Milestones, Streaks, Special), with real-time progress tracking, house-based filtering (achievements show as unlocked only if the selected house meets the criteria independently), and retroactive checking. Performance optimized with pre-aggregated savings metrics.
- **Review Fraud Prevention System**: Comprehensive anti-fraud measures for contractor reviews including:
    - **Email Verification**: Required for all review submissions with 6-digit token verification system (24-hour expiry)
    - **Account Age Requirement**: Minimum 7-day account age before users can leave reviews
    - **One Review Per Customer-Contractor**: Database-level unique constraint prevents multiple reviews for same contractor
    - **90-Day Service Window**: Reviews must be based on service records within past 90 days (verified service badge)
    - **Device Fingerprinting**: Captures browser fingerprint to detect duplicate/fake reviews
    - **IP Address Tracking**: Logs IP addresses with automatic fraud alerts when >3 reviews from same IP/device
    - **Review Flagging System**: Users can report suspicious reviews; admins investigate via dedicated dashboard
    - **Admin Investigation Tools**: Flag management interface with status tracking (pending/investigating/resolved_valid/resolved_invalid)
- **API Endpoints**: Comprehensive set of APIs for managing all core functionalities.

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

### Third-Party Services
- **Geocoding**: OpenStreetMap Nominatim
- **Address Autocomplete**: Google Places API, OpenStreetMap
- **AI**: Replit AI Integrations (for GPT-5)

## Database Protection & Migrations

### Safe Schema Changes (Migrations)
The project uses Drizzle ORM with a migration system to protect user data during schema updates:

1. **Generate migrations** (after changing `shared/schema.ts`):
   ```bash
   npx drizzle-kit generate
   ```
   This creates incremental SQL files in `./migrations/` without touching the database.

2. **Apply migrations** (production-safe):
   ```bash
   npx tsx server/migrate.ts
   ```
   This applies pending migrations incrementally, preserving all existing data.

3. **Development sync** (use with caution):
   ```bash
   npm run db:push
   ```
   This is faster but less safe - only use in development when you're sure no data will be lost.

### Database Backups
The backup utility exports all important tables to JSON files:

1. **Create a backup**:
   ```bash
   npx tsx server/backup.ts
   ```
   Creates `backups/backup-{timestamp}.json` with all user data.

2. **List available backups**:
   ```bash
   npx tsx server/backup.ts list
   ```

### Best Practices
- **Always generate migrations** before making schema changes in production
- **Create backups** before major updates or schema changes
- **Never change ID column types** (serial ↔ varchar) as this breaks existing data
- **Test migrations** in development before applying to production