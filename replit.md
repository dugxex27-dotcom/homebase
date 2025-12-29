# Home Base - Compressed replit.md

## Overview
Home Base is a full-stack web application designed to connect homeowners with contractors, facilitate a DIY product marketplace, and offer seasonal home maintenance guidance. It aims to streamline property management for homeowners and enhance operational efficiency for contractors. The project offers multi-property management, detailed proposal handling, and a gamified home health score, establishing a comprehensive ecosystem for home maintenance and improvement. Its landing page emphasizes a "Carfax-style home history" value proposition.

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
    - 14-day free trial, tiered subscription plans for homeowners.
    - Tiered contractor subscription plans (Basic, Pro) with referral credit caps.
    - Referral rewards system.
    - Stripe Billing Reconciliation for subscription management and billing history.
- **Real Estate Agent Affiliate System**: Agents earn referral commissions via unique codes, with automated $15 payouts after 4 months of paid subscription, managed through Stripe Connect.
- **Gamified Achievement System**: 66 achievements across 8 categories with real-time progress tracking and house-based filtering.
- **Review Fraud Prevention System**: Comprehensive measures including email verification, account age requirement, one review per customer-contractor, 90-day service window, device fingerprinting, IP address tracking, and an admin flagging system.
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

### Third-Party Services
- **Geocoding**: OpenStreetMap Nominatim
- **Address Autocomplete**: Google Places API, OpenStreetMap
- **AI**: Replit AI Integrations (for GPT-5)
- **SMS**: Twilio
- **Payments**: Stripe Connect