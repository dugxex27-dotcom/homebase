# Home Base - Compressed replit.md

## Overview

Home Base is a full-stack web application connecting homeowners with contractors, offering a DIY product marketplace, and providing seasonal home maintenance guidance. It features an Anthropologie-inspired aesthetic, supports multi-property management for homeowners, and includes detailed proposal management for contractors, aiming to enhance efficiency and organization for all user types.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Design and UI/UX
- **Aesthetic**: Modern purple/blue gradient theme with a custom HomeBase logo. Clean, professional, and optimized for a consistent user experience.
- **Components**: Utilizes `shadcn/ui` built on Radix UI for a consistent and sophisticated look.
- **Theming**: Supports light/dark mode with a purple-based color palette for homeowners and a red theme for contractors.
- **Navigation**: Role-based dashboards for Homeowner and Contractor.

### Technical Implementation
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack Query for state management, and Tailwind CSS for styling. Vite for development.
- **Backend**: Node.js with Express.js, TypeScript, and ES modules, implementing a RESTful API with JSON responses.
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations and Drizzle Kit for schema management. Persistence for all critical data including contractor profiles, licenses, project photos, home maintenance data, conversations, and messages.
- **Data Flow**: Client requests use TanStack Query, Express routes process, Drizzle ORM accesses PostgreSQL, with shared TypeScript types for end-to-end type safety.
- **Security**: Enterprise-grade security with Helmet.js, `express-rate-limit`, CORS validation, secure session cookies, SQL injection/XSS pattern detection, and Zod for input validation.

### Feature Specifications
- **User Management**: Three distinct roles: Homeowner, Contractor, Real Estate Agent.
- **Authentication**: Email/password with bcrypt, Google OAuth via Replit Auth, two-step password reset, and optional invite codes.
- **Demo Logins** (Nov 2025): One-click demo logins for all three user roles with realistic 6-month historical data:
    - **Homeowner Demo**: Sarah Anderson (sarah.anderson@homebase.com, code: DEMO4567) with 2 properties (Main Residence in Seattle with 10 maintenance logs, Lake House in Bellevue with 4 maintenance logs), 14 total service records showing DIY maintenance over 6 months, $1,360 in tracked DIY savings, 15 completed seasonal maintenance tasks spanning May-November 2025 across both properties for home health score calculation (10 tasks for Main Residence, 5 tasks for Lake House)
    - **Contractor Demo**: David Martinez with Precision HVAC company profile
    - **Agent Demo**: Jessica Roberts with sample referrals and commission tracking
- **Admin Dashboard**: User analytics, signup trends, search insights, and invite code management.
- **Company-Based Contractor Architecture**: Contractors belong to companies, supporting multi-user access and dedicated API endpoints.
- **Homeowner Features**:
    - Multi-property support with climate zone detection and centralized service records.
    - **Home Health Score**: Gamified maintenance tracking, calculating a score based on completed/missed tasks.
    - **DIY Savings Tracker**: Financial tracking of money saved from DIY tasks, including professional cost estimates and regional multipliers. Displays separate cards for each house with house name labels, showing per-property savings totals, task counts, and average savings per task.
    - **Service Records Display**: Shows the 2 most recent service records by default with a collapsible dropdown to view older records. Improves page load performance and reduces visual clutter for homeowners with extensive maintenance history.
    - **AI Contractor Recommendation**: AI-powered (GPT-5 via Replit AI) recommendations for contractor types based on homeowner problems.
    - **Permanent Connection Code System**: Unique 8-character code for homeowners to share with contractors for service record access.
    - **20-Mile Contractor Filtering**: Geocoded addresses enable distance-based contractor search. Maintenance task "Find Contractor" links automatically filter contractors within 20 miles of selected house for specific service categories. Uses OpenStreetMap Nominatim for geocoding with rate limiting and caching. Gracefully handles missing location data.
    - **House Transfer System** (Nov 2025): Comprehensive property transfer functionality allowing homeowners to transfer house ownership with all associated data to another user. Transfers include: maintenance logs, service records, home appliances, contractor appointments, custom tasks, home systems, task completions (for home health score continuity), and task overrides (custom priority settings). Secure token-based acceptance system with expiration and status tracking.
- **Marketplace**: Listing and browsing DIY products.
- **Maintenance Guidance**: Seasonal home maintenance schedules with location-based and individual task priorities (traffic light system).
- **Service Categories** (Updated Nov 2025): Platform supports 76 service categories including newly added: Carpet Cleaning, Chimney & Fireplace Services, Locksmiths, Local Moving, and Window Cleaning.
- **Notifications**: Bi-directional system for homeowners (reminders, task alerts, messages, proposals) and contractors (new messages). Real-time updates with unread badges.
- **Proposal System**: Contractors create detailed proposals from messages; homeowners view and accept/reject proposals within the app.
- **Billing and Subscription**:
    - 14-day free trial for all new signups.
    - **Homeowner Plans**: Base ($5/month for up to 2 homes), Premium ($20/month for 3-6 homes), Premium Plus ($40/month for 7+ homes).
    - **Contractor Plan**: $20/month for full contractor features.
    - **Referral Rewards**: $1/month discount per active paying referral. Free subscription when referrals equal monthly cost (Base: 5 refs, Premium: 20 refs, Premium Plus: 40 refs, Contractor: 20 refs).
- **Real Estate Agent Affiliate System**:
    - Agent role for earning referral commissions (no subscription).
    - Profile picture uploads for agents.
    - Unique referral codes and shareable links with QR codes.
    - Payout structure: $10 per referred signup after 4 consecutive months of active subscription.
    - Agent Dashboard for tracking referrals, earnings, and payout progress.
- **CRM System for Contractors** (Nov 2025):
    - **Manual Lead Management**: Full CRUD operations for manually adding and managing leads.
    - **Webhook Integration System**: Automatic lead syncing from external CRMs (ServiceTitan, Jobber, HubSpot, Salesforce, etc.)
        - Unique webhook URLs and secrets for each integration
        - Platform-specific setup instructions
        - Webhook activity logging for debugging
        - Copy-to-clipboard functionality for easy setup
    - **Dual-Tab Interface**: Separate "Leads" and "Integrations" tabs in CRM page
    - Company-scoped access control (contractors only see their company's leads).
    - Lead tracking with notes, status, contact information, and follow-up dates.
- **Error Tracking and Monitoring** (Nov 2025):
    - **ErrorBoundary**: React error boundary wraps entire app, catches runtime errors, displays fallback UI with error details.
    - **Client Error Logger**: Automatic capture of unhandled errors and promise rejections, logs to backend API.
    - **Database Schema**: `errorLogs` table tracks errors with type, message, stack trace, user context, timestamps.
    - **Storage Layer**: `createErrorLog()` method for persisting errors.
    - **Developer Console**: Admin-only page at `/developer-console` displays all logged errors with filtering and search.
    - **Security**: Console access restricted to users with `isAdmin` flag.
- **Stripe Billing Reconciliation** (Nov 2025):
    - **Webhook Handler**: Processes Stripe events (invoice.paid, invoice.payment_failed, subscription updates) with signature verification for security.
    - **Raw Body Parsing**: Server configured to preserve raw request body for webhook signature validation.
    - **Database Tracking**: Automatic creation of subscription cycle events for payment tracking and affiliate commission calculation.
    - **Billing History API**: GET `/api/billing-history` endpoint returns user's payment history sorted by date.
    - **Billing History UI**: Displays payment cycles with status (paid/failed/voided), dates, amounts, and invoice IDs. Color-coded status badges and icons for visual clarity.
    - **User Status Updates**: Automatic subscription status updates based on webhook events.
    - **Payment Transparency**: Users can view complete billing history on billing page.
- **Gamified Achievement System** (Nov 2025):
    - **66 Total Achievements** across 8 categories with progression tracking (expanded from 62 in Nov 2025)
    - **Seasonal Achievements** (16 - EXPANDED!): Tiered progression system for year-round engagement
        - **Tiered Seasonal** (12): Bronze (3 tasks), Silver (5 tasks), Gold (10 tasks) for Winter, Spring, Summer, Fall
        - **Special Seasonal** (4): All Seasons Master (tasks in all 4 seasons), Seasonal Perfectionist (15+ tasks in one season), Year-Round Caretaker (3+ per season), Seasonal Consistency (5+ per season)
    - **Financial Savvy** (19 - EXPANDED!): Designed for long-term engagement (6-12+ months to complete all tiers)
        - **Total Savings Tiers** (8): Budget Boss ($500), Savings Expert ($1K), Frugal Master ($2.5K), Savings Titan ($5K), Savings Legend ($10K), Savings Master ($25K), Savings Guru ($50K), Ultimate Saver ($100K)
        - **Under Budget Tiers** (6): DIY Champion (10 tasks), Penny Pincher Pro (25 tasks), Budget Expert (50 tasks), Budget Legend (100 tasks), Budget Master (250 tasks), Budget Champion (500 tasks)
        - **Savings Streaks** (3): Consistent Saver (6 consecutive months with savings), Year-Long Saver (12 months), Savings Marathon (24 months)
        - **High ROI per Task** (3): Efficiency Expert (avg $200/task), ROI Master (avg $500/task), Value Maximizer (avg $1K/task) - requires minimum 10 tasks with progressive pre-threshold progress
        - **Quarterly Savings Goals** (3): Quarterly Winner ($1K in a quarter), Quarterly Champion ($2.5K), Quarterly Legend ($5K)
    - **Organization** (14 - EXPANDED!): Tiered progression system for documentation excellence
        - **Service Records** (5): Getting Started (3), Record Keeper (10), Documentation Pro (25), Archive Master (50), Documentation Legend (100)
        - **Photo Pairs** (4): Photo Journalist (5), Photo Pro (10), Visual Archivist (15), Visual Master (30)
        - **Documents** (3): Receipt Ranger (10), Document Keeper (25), Archive Expert (50)
        - **Detailed Logs** (2): Detail Oriented (10 logs with 50+ char descriptions), Master Documenter (25 detailed logs)
    - **Referral & Community** (4): Helpful Neighbor (1 referral), Community Builder (3 referrals), Ambassador (5 referrals), Influencer (10 referrals)
    - **Milestones** (6): First Step (1 task), Getting Serious (10 tasks), Maintenance Master (25 tasks), Home Hero (50 tasks), Multi-Property Manager (2+ properties), Contractor Connection (first hire)
    - **Streaks** (3): Monthly Momentum (3 consecutive months), Quarterly Qualifier (6 months), Year-Round Warrior (12 months)
    - **Special** (4): Early Adopter (signup before 2026), Premium Member (active premium plan), Complete Profile (5+ home systems), Safety First (5 high-priority safety tasks)
    - **Progress Tracking**: Real-time percentage progress for all achievements, automatic unlocking when criteria met
    - **Achievement Page**: Purple-themed UI with category tabs, stat cards, progress bars, unlock dates, and achievement detail modals
    - **Retroactive Checking**: POST `/api/achievements/check` endpoint processes historical data to award missed achievements
    - **Implementation**: Six criteria types: `consecutive_savings_months` (fixed calendar arithmetic for year rollovers), `average_savings_per_task` (progressive ROI tracking), `quarterly_savings`, `all_seasons`, `seasonal_peak`, `year_round`/`seasonal_consistency`
    - **Performance Optimization** (Nov 2025): Pre-aggregation of savings metrics (totals, monthly buckets, quarterly sums) eliminates O(N*achievements) database scans, improving achievement checking from ~50 queries to 1 per homeowner
- **API Endpoints**: Structured for contractors, products, houses, notifications, proposals, connection codes, search analytics, billing/subscriptions, billing history, error logging, agent/affiliate system, CRM leads, achievements, and admin functions.

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