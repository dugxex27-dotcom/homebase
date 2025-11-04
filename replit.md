# Home Base - Compressed replit.md

## Overview

Home Base is a full-stack web application designed to connect homeowners with specialized contractors and provide a marketplace for DIY products, alongside comprehensive seasonal maintenance guidance. It aims to offer a sophisticated user experience with an Anthropologie-inspired aesthetic. The platform supports multi-property management for homeowners and detailed proposal management for contractors, enhancing efficiency and organization for both user types.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Design and UI/UX
- **Aesthetic**: Modern purple/blue gradient theme with the new HomeBase logo featuring a house-shaped design with blue gradient "H" on purple background. Clean, professional appearance optimized for homeowner experience.
- **Components**: Utilizes shadcn/ui component library built on Radix UI primitives for a consistent and sophisticated look.
- **Theming**: Supports light/dark mode with purple-based color palette (primary: hsl(260, 65%, 55%)) for homeowner interface, maintaining red theme for contractor interface.
- **Navigation**: Role-based dashboards (Homeowner and Contractor) serve as primary interfaces, offering tailored content and quick actions.
- **Logo**: Updated to use custom HomeBase logo with house icon and gradient blue "H" design, imported from attached assets.
- **Signin Page**: Role selection buttons feature left-aligned text, consistent padding structure, and properly wrapped subcopy text for optimal readability and visual balance.
- **Messages Page**: Collapsible review section - homeowners can leave reviews for contractors but the review form is collapsed by default to maximize messaging space. Click "Leave a Review" button to expand the form.

### Technical Implementation
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack Query for state management, and Tailwind CSS for styling. Vite is used for fast development and optimized builds.
- **Backend**: Node.js with Express.js, written in TypeScript with ES modules. Implements a RESTful API with JSON responses.
- **Database**: PostgreSQL, integrated with Drizzle ORM for type-safe operations and Drizzle Kit for schema management.
    - **Database Field Mapping**: Manual snake_case ↔ camelCase conversion implemented in `server/storage.ts` for user fields (companyId, companyRole, canRespondToProposals) due to Drizzle ORM automatic casing not working in version 0.39.1
    - Mapping applied in `DbStorage.getUser()` and `DbStorage.getUserByEmail()` to ensure consistency
    - All API endpoints that return user data fetch fresh data via `storage.getUser()` to apply mapping
    - **Photo Persistence Fix**: Contractor profile photos (projectPhotos, businessLogo) are now persisted to the database-backed `companies` table instead of the in-memory `contractors` table via `updateContractorProfile()` calling `updateCompany()`, ensuring photos survive logout/server restarts
    - **Project Photos Upload Fix**: Fixed bug where adding new photos to contractor profile was removing existing photos. The upload handler now correctly preserves all existing photos when appending new ones to the projectPhotos array
    - **House Persistence Fix**: Houses are now stored in PostgreSQL database instead of in-memory storage. Database-backed methods implemented in DbStorage class (`getHouses`, `getHouse`, `createHouse`, `updateHouse`, `deleteHouse`) ensure properties persist across sessions and server restarts
    - **Home Maintenance Data Persistence**: Home systems, custom maintenance tasks, maintenance logs, and service records are now all database-backed for full persistence across sessions. All CRUD operations for these entities now write to PostgreSQL, ensuring data survives logout/server restarts
    - **Contractor Search Fix**: Fixed `searchContractors()` in DbStorage to query companies table instead of deprecated contractors table, joining with users table to get owner zip codes. Removed references to non-existent fields (businessHours, insuranceExpiry) that were causing query failures. Search now properly returns company-based contractors with service and location filtering.
    - **Two-Way Radius Check**: Contractor search results now only display if BOTH the contractor's service radius AND the homeowner's search radius intersect. This means contractors outside the homeowner's search area won't appear, and homeowners outside the contractor's service area won't see that contractor. Both radii must overlap for a match.
    - **Messaging Persistence**: All conversations and messages are now stored in PostgreSQL database instead of in-memory storage. Database-backed methods implemented in DbStorage class (`getConversations`, `getConversation`, `createConversation`, `getMessages`, `createMessage`, `markMessagesAsRead`, `getUnreadMessageCount`) ensure messages persist across sessions and server restarts. Conversations automatically display company names for contractors and homeowner names for homeowners.
    - **Message Notifications**: Automatic notification system for new messages - contractors receive notifications when homeowners send them messages, and homeowners receive notifications when contractors reply. Notifications include sender name (company name for contractors, personal name for homeowners) and link directly to the messages page.
- **Data Flow**: Client requests use TanStack Query, Express routes handle processing, data access is via Drizzle ORM to PostgreSQL, and responses are JSON. Shared TypeScript types ensure end-to-end type safety.
- **Security**: Enterprise-grade security with Helmet.js headers (CSP, HSTS, X-Frame-Options), express-rate-limit for API protection (100 req/15min general, 5 req/15min auth), CORS whitelist validation, secure session cookies (httpOnly, sameSite), SQL injection and XSS pattern detection, and comprehensive input validation via Zod schemas with custom security utilities.

### Key Features and Specifications
- **User Management**: Support for distinct Homeowner and Contractor roles.
- **Authentication System**:
    - Email/password registration with bcrypt password hashing (10 rounds)
    - Google OAuth integration via Replit Auth for quick signup
        - OAuth callback creates unified session format (req.session.isAuthenticated + req.session.user)
        - Complete-profile flow for OAuth users missing zip code/role
        - Data preservation: existing zipCode and role persist across repeat OAuth logins
        - Requires environment variables: REPLIT_DOMAINS, REPL_ID, ISSUER_URL
    - **Password Reset System**:
        - "Forgot Password?" link on sign-in page opens two-step reset dialog
        - Step 1: Request reset code via email address
        - Step 2: Enter 6-digit code and set new password
        - Reset tokens stored in `password_reset_tokens` table with 15-minute expiration
        - Single-use tokens (marked as used after successful reset)
        - Rate-limited endpoints for security
        - Development mode: reset codes logged to server console for testing
        - Production ready: email delivery mechanism to be configured (SendGrid, SES, etc.)
    - Zip code capture during registration for geographic analytics
    - Optional invite code system with usage tracking
    - Secure session management with httpOnly cookies
    - Session compatibility: OAuth and email/password use identical session structure
- **Admin Dashboard** (access controlled by ADMIN_EMAILS environment variable):
    - User analytics: total users, homeowner/contractor breakdown
    - Signups by zip code with sortable/filterable table
    - Top search terms across contractor directory and marketplace
    - Recent searches timeline with context (contractor/marketplace)
    - Invite code management: create, view usage stats, deactivate codes
- **Search Analytics**:
    - Automatic tracking of all contractor directory searches
    - Automatic tracking of all marketplace product searches
    - Captures: search term, service type, user zip code, timestamp, context
    - Powers admin dashboard insights and geographic trends
- **Company-Based Contractor Architecture** (IN PROGRESS):
    - **All contractors must belong to a company** - No individual contractor accounts
    - **Company Ownership Model**:
        - Owner creates company during registration and manages team
        - Employees join via invite code generated by owner
        - Owner has full control: edit company profile, generate invites, remove employees
        - **Proposal Management**: Only owners can respond to proposals by default; owner can toggle permission for employees if it's in their job description
        - Employees can create service records for completed jobs
    - **Multi-User Support**: Multiple employees from same company can work simultaneously on different devices
    - **Company Management API**:
        - POST /api/companies - Create company (owner only)
        - GET /api/companies/:id - Get company details
        - PUT /api/companies/:id - Update company profile (owner only)
        - GET /api/companies/:id/employees - View team members
        - DELETE /api/companies/:id/employees/:userId - Remove employee
        - POST /api/companies/:id/invite-codes - Generate invite code
        - GET /api/companies/invite-codes/:code - Validate invite code
    - **Database Schema**:
        - `companies` table: name, bio, services, contact info, licenses, ratings
        - `company_invite_codes` table: invite code management with expiration
        - `users.companyId` and `users.companyRole` (owner/employee)
        - Service records, proposals, and reviews reference companyId + employeeId
    - Address autocomplete with OpenStreetMap Nominatim supporting international addresses
    - Comprehensive proposal management system (company-level)
    - Service radius configuration in 5-mile increments
    - REMAINING WORK: Registration flow, search updates, UI for company management
- **Homeowner Features**:
    - Multi-property support with individual maintenance schedules
    - Automatic climate zone detection based on property address using geocoding
    - Address autocomplete functionality for property setup
    - Centralized service records tracking
    - **AI Contractor Recommendation** ("Who Should I Contact?"):
        - AI-powered feature to help homeowners determine which contractor type to contact
        - Uses GPT-5 via Replit AI Integrations (billed to Replit credits, no API key needed)
        - Homeowners describe their problem in natural language
        - AI analyzes the problem and provides:
            - Possible causes of the issue
            - 1-3 recommended contractor service types from available services
            - Explanation of why those contractors are recommended
        - Direct navigation to contractor search with pre-filled service type
        - Prominently featured on homeowner dashboard with gradient CTA card
        - Backend endpoint: POST /api/ai/contractor-recommendation
        - Frontend route: /ai-help (homeowner-only)
        - Enhanced error handling with structured error messages
    - **House-Based Data Organization**: All maintenance data is separated and filtered by the homeowner's selected property
        - Maintenance tasks, appliances, custom tasks, maintenance logs, and service records are all filtered by selected house
        - House selection dropdown on each page allows switching between properties
        - Backend enforces house ownership verification for security
        - Server-side filtering reduces payload size and improves performance
    - **Contractor Search Integration**: House selection from maintenance schedule automatically used when finding contractors
        - Prominent banner displays currently selected house and address
        - Dropdown allows switching between properties
        - Auto-populates contractor search location from selected house
        - Seamless navigation from maintenance schedule to contractor finder with preserved house context
- **Marketplace**: Functionality for listing and browsing DIY products with search analytics.
- **Maintenance Guidance**: Seasonal home maintenance schedule with location-based recommendations.
- **Notifications**: Enhanced system for appointments and maintenance task alerts, with priority levels and house-specific filtering.
- **API Endpoints**: Structured for contractors, products, houses, notifications, proposals, search analytics, and admin functions.

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
- **Authentication**: bcryptjs for password hashing, passport for session management

### Third-Party Services
- **Geocoding**: OpenStreetMap Nominatim (for climate zone detection).
- **Address Autocomplete**: Google Places API (when available), OpenStreetMap (fallback).