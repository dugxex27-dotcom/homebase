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
    - **Persistence**: All critical data, including contractor profiles, project photos, houses, home maintenance data (systems, tasks, logs, service records), conversations, and messages, are persisted in PostgreSQL.
    - **Contractor Search**: Enhanced `searchContractors()` to query the `companies` table, joining with `users` for zip codes, and implementing a two-way radius check for accurate matching.
    - **Messaging**: Conversations and messages are stored in PostgreSQL, ensuring persistence. Automatic notifications are sent for new messages, linking directly to the messages page.
- **Data Flow**: Client requests use TanStack Query, Express routes handle processing, Drizzle ORM accesses PostgreSQL, and responses are JSON, with shared TypeScript types ensuring end-to-end type safety.
- **Security**: Enterprise-grade security with Helmet.js, `express-rate-limit`, CORS validation, secure session cookies, SQL injection/XSS pattern detection, and Zod for input validation.

### Key Features and Specifications
- **User Management**: Distinct Homeowner and Contractor roles.
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
- **Authentication**: bcryptjs, passport

### Third-Party Services
- **Geocoding**: OpenStreetMap Nominatim
- **Address Autocomplete**: Google Places API (primary), OpenStreetMap (fallback)
- **AI**: Replit AI Integrations (for GPT-5)