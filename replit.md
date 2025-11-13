# Home Base - Compressed replit.md

## Overview

Home Base is a full-stack web application designed to connect homeowners with specialized contractors, provide a marketplace for DIY products, and offer comprehensive seasonal maintenance guidance. It aims to deliver a sophisticated user experience with an Anthropologie-inspired aesthetic, supporting multi-property management for homeowners and detailed proposal management for contractors to enhance efficiency and organization for both user types.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Design and UI/UX
- **Aesthetic**: Modern purple/blue gradient theme with a custom HomeBase logo featuring a house-shaped design with a blue gradient "H" on a purple background. The design is clean, professional, and optimized for a consistent user experience.
- **Components**: Utilizes `shadcn/ui` built on Radix UI for a consistent and sophisticated look.
- **Theming**: Supports light/dark mode with a purple-based color palette (primary: `hsl(260, 65%, 55%)`) for the homeowner interface and a red theme for the contractor interface.
- **Navigation**: Role-based dashboards (Homeowner and Contractor) provide tailored content and quick actions.
- **Sign-in Page**: Features role selection buttons with left-aligned text, consistent padding, and wrapped subcopy for readability.
- **Messages Page**: Includes a collapsible review section, allowing homeowners to leave reviews for contractors while maximizing messaging space.

### Technical Implementation
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack Query for state management, and Tailwind CSS for styling. Vite is used for development and builds.
- **Backend**: Node.js with Express.js, written in TypeScript with ES modules, implementing a RESTful API with JSON responses.
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations and Drizzle Kit for schema management.
    - **Persistence**: All critical data, including contractor profiles, contractor licenses, project photos, houses, home maintenance data (systems, tasks, logs, service records), conversations, and messages, are persisted in PostgreSQL.
    - **Contractor Licenses**: Database-backed storage in `contractor_licenses` table with full CRUD operations (create, read, update, soft-delete). Multiple licenses per contractor are supported with type, number, municipality, state, and expiry date tracking.
    - **Contractor Search**: Enhanced `searchContractors()` to query the `companies` table, joining with `users` for zip codes, and implementing a two-way radius check for accurate matching.
    - **Messaging**: Conversations and messages are stored in PostgreSQL, ensuring persistence. Automatic notifications are sent for new messages, linking directly to the messages page.
- **Data Flow**: Client requests use TanStack Query, Express routes handle processing, Drizzle ORM accesses PostgreSQL, and responses are JSON, with shared TypeScript types ensuring end-to-end type safety.
- **Security**: Enterprise-grade security with Helmet.js, `express-rate-limit`, CORS validation, secure session cookies, SQL injection/XSS pattern detection, and Zod for input validation.

### Key Features and Specifications
- **User Management**: Three distinct user roles (Homeowner, Contractor, Real Estate Agent).
- **Authentication System**:
    - Email/password registration with bcrypt hashing.
    - Google OAuth integration via Replit Auth, including a complete-profile flow for OAuth users and data preservation.
    - A two-step password reset system with email verification, secure tokens, and rate-limiting.
    - Zip code capture for geographic analytics.
    - Optional invite code system.
- **Admin Dashboard**: Provides user analytics, signup trends by zip code, top search terms, recent searches, and invite code management.
- **Search Analytics**: Automatic tracking of contractor directory and marketplace product searches to power admin insights.
- **Company-Based Contractor Architecture**: All contractors must belong to a company. Features company ownership, multi-user support for employees, and dedicated API endpoints for company management.
- **Homeowner Features**:
    - Multi-property support with individual maintenance schedules and climate zone detection.
    - Centralized service records tracking.
    - **AI Contractor Recommendation**: An AI-powered feature (using GPT-5 via Replit AI) that analyzes homeowner problems and recommends contractor types with explanations, integrating directly into contractor search.
    - **House-Based Data Organization**: All maintenance data is filtered and organized by the homeowner's selected property.
    - **Contractor Search Integration**: Auto-populates contractor search location from the selected house.
- **Marketplace**: Functionality for listing and browsing DIY products with search analytics.
- **Maintenance Guidance**: Seasonal home maintenance schedule with location-based recommendations.
- **Notifications**: Enhanced bi-directional notification system:
    - **Homeowner Notifications**: Appointment reminders, maintenance task alerts, message replies from contractors, and high-priority proposal notifications
    - **Contractor Notifications**: New message alerts when homeowners send messages
    - **Features**: Real-time updates (30s polling), session-based authentication, notification bell with unread badge, immediate cache updates after read/delete
- **Proposal System**: 
    - **For Contractors**: Create and send detailed proposals from message conversations with scope, cost, duration, materials, and warranty information
    - **For Homeowners**: Clickable proposal list in messages page opens detailed dialog showing full proposal information (scope, materials, notes, etc.) with accept/reject buttons
    - **Notifications**: Homeowners receive high-priority notifications when contractors create or send proposals
- **Permanent Connection Code System**: Each homeowner has a permanent, user-attached connection code for simplified contractor access:
    - **For Homeowners**: Every homeowner automatically gets a unique 8-character permanent code attached to their account. Displayed with QR code for easy sharing. Optional code regeneration available if needed.
    - **For Contractors**: Enter or scan homeowner-provided codes to validate connection and add service records. Upon validation, contractor receives homeowner details (name, email, zip code).
    - **Features**: Permanent codes (no expiration/usage limits), automatic generation on first access, QR code generation with qrcode library, one code per homeowner account
    - **Database**: Connection code stored in `users.connection_code` field with unique constraint
- **Billing and Subscription System**:
    - **Homeowner Plans**:
        - 14-day free trial for all new signups
        - Base Plan: $3/month for up to 2 properties
        - Premium Plan: $10/month for up to 10 properties
        - Grandfathered users: Unlimited access for early adopters (3 users)
    - **Contractor Plans**:
        - 14-day free trial for all new signups
        - Single plan: $10/month
        - Grandfathered contractors: Unlimited access for early adopters (3 contractors)
    - **Features**:
        - Trial countdown banner in header (purple for homeowners, red for contractors)
        - House limit enforcement at API level with proper error codes
        - Upgrade dialog when hitting property limits
        - Role-based billing page showing appropriate plans
        - Trial preservation during subscription flows
        - Database fields: `trialEndsAt`, `subscriptionStatus` ('trialing' | 'active' | 'grandfathered'), `maxHousesAllowed`
    - **Pending**: Stripe integration (requires API keys)
- **Real Estate Agent Affiliate System**:
    - **Agent Role**: Third user type focused solely on earning referral commissions (no subscription required)
    - **Referral Tracking**:
        - Auto-generated unique 8-character referral codes for each agent (format: ABCDEFGHJKLMNPQRSTUVWXYZ23456789)
        - Shareable referral links with QR code generation (using qrcode library)
        - Referral capture via ?ref=CODE URL parameter during homeowner/contractor signup
        - Automatic creation of affiliate_referral records linking agent to referred user
    - **Payout Structure**:
        - $10 flat commission per referred signup after 4 consecutive months of active subscription
        - Consecutive month tracking via subscription_cycle_events table
        - Payout eligibility automatically calculated when consecutiveMonthsPaid >= 4
        - Automated payouts via Stripe Connect (pending Stripe API keys)
    - **Agent Dashboard**:
        - Total referrals, active subscribers, trial users count
        - Total earnings (sum of paid affiliate payouts)
        - Pending earnings (eligible but unpaid referrals)
        - Detailed referral list with status badges (trial, active, voided)
        - Progress tracking toward 4-month payout threshold
        - Shareable referral link with copy/share buttons
        - QR code generation and download for offline sharing
    - **Database Tables**:
        - `agent_profiles`: Agent metadata, commission rate (default 10%), Stripe Connect account ID
        - `affiliate_referrals`: Links agents to referred users with status, signup date, trial end, consecutive months paid
        - `subscription_cycle_events`: Tracks each billing cycle for consecutive month calculation
        - `affiliate_payouts`: Payment records with amount, status, Stripe transfer ID, payout date
    - **API Endpoints**:
        - GET /api/agent/profile - Current agent's profile
        - GET /api/agent/referrals - All referrals with user details
        - GET /api/agent/stats - Aggregated earnings and referral statistics
        - GET /api/referral/validate/:code - Public endpoint for referral code validation
    - **Signup Flow**:
        - Landing page with "Real Estate Agent" card routes to /signin?role=agent
        - Agent signup auto-generates referral code, creates agent profile, skips trial/subscription
        - Homeowner/contractor signup with ?ref=CODE validates referral and creates affiliate_referral record
        - Referral status starts as 'trial' and transitions to 'active' after first payment
    - **Future Automation** (requires Stripe webhooks):
        - Automatic subscription cycle event logging on successful payments
        - Consecutive month counter increment/reset based on payment history
        - Automatic payout creation and Stripe Transfer when referral hits 4 months
- **API Endpoints**: Structured for contractors, products, houses, notifications, proposals, connection codes, search analytics, billing/subscriptions, agent/affiliate system, and admin functions.

## External Dependencies

### Frontend
- **React Ecosystem**: React, React DOM, Wouter
- **State Management**: TanStack React Query
- **UI & Styling**: Radix UI, shadcn/ui, Tailwind CSS, class-variance-authority, clsx
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
- **Address Autocomplete**: Google Places API (primary), OpenStreetMap (fallback)
- **AI**: Replit AI Integrations (for GPT-5)