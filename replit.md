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
- **Admin Dashboard**: User analytics, signup trends, search insights, and invite code management.
- **Company-Based Contractor Architecture**: Contractors belong to companies, supporting multi-user access and dedicated API endpoints.
- **Homeowner Features**:
    - Multi-property support with climate zone detection and centralized service records.
    - **Home Health Score**: Gamified maintenance tracking, calculating a score based on completed/missed tasks.
    - **DIY Savings Tracker**: Financial tracking of money saved from DIY tasks, including professional cost estimates and regional multipliers.
    - **AI Contractor Recommendation**: AI-powered (GPT-5 via Replit AI) recommendations for contractor types based on homeowner problems.
    - **Permanent Connection Code System**: Unique 8-character code for homeowners to share with contractors for service record access.
- **Marketplace**: Listing and browsing DIY products.
- **Maintenance Guidance**: Seasonal home maintenance schedules with location-based and individual task priorities (traffic light system).
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
- **API Endpoints**: Structured for contractors, products, houses, notifications, proposals, connection codes, search analytics, billing/subscriptions, agent/affiliate system, and admin functions.

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