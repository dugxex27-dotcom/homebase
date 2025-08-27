# Home Base - Contractor & DIY Products Platform

## Overview

Home Base is a full-stack web application that connects homeowners with skilled contractors specializing in niche services (gutters, drywall, custom work) and provides a marketplace for DIY products plus seasonal maintenance guidance. The application features an Anthropologie-inspired aesthetic with warm colors, elegant typography, and a sophisticated design approach using React frontend with shadcn/ui components, Express.js backend, and Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Comprehensive shadcn/ui component library with Radix UI primitives

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Middleware**: Custom logging, JSON parsing, and error handling
- **Development**: Hot reloading with Vite integration in development mode

### Data Storage Solutions
- **Database**: PostgreSQL (configured for use with Neon Database)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Development Storage**: In-memory storage class for development/testing
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`

## Key Components

### Database Schema
The application defines main entities:

1. **Contractors Table**:
   - Personal info (name, company, bio, location)
   - Professional details (license, insurance, experience)
   - Service offerings and availability
   - Rating and review metrics
   - Contact information

2. **Products Table**:
   - Product details (name, description, price)
   - Category and stock status
   - Rating and review metrics
   - Featured product flags

3. **Houses Table** (Multi-property support):
   - Property identification (name, address)
   - Location-specific settings (climate zone, home systems)
   - Default property designation for users
   - Links to appointments and maintenance records

4. **Notifications Table** (Enhanced system):
   - Support for both appointment and maintenance task notifications
   - Priority levels and categorization
   - House-specific filtering for multi-property users
   - Action URLs for direct navigation

5. **Proposals Table** (Contractor business management):
   - Contractor-generated service proposals with detailed scope of work
   - Cost estimation and project duration planning
   - Materials list and warranty period management
   - Status tracking (draft, sent, accepted, rejected, expired)
   - Proposal validity dates and internal contractor notes

### API Endpoints
- **Contractor Routes**:
  - `GET /api/contractors` - List contractors with filtering
  - `GET /api/contractors/search` - Search contractors by query
  - `GET /api/contractors/:id` - Get contractor details

- **Product Routes** (implied from schema and frontend):
  - Product listing and filtering
  - Search functionality
  - Category-based browsing

### Frontend Pages
- **Home**: Landing page with "Home Base" branding and Anthropologie-inspired hero section
- **Contractors**: Contractor listing with search and filtering (availability filters removed)
- **Products**: DIY product marketplace
- **Maintenance**: Seasonal home maintenance schedule with location-based recommendations
- **Contractor Profile**: Detailed contractor information
- **404**: Not found page

### Component Library
Extensive shadcn/ui component library including:
- Form components (inputs, selects, checkboxes, etc.)
- Layout components (cards, dialogs, sheets, etc.)
- Navigation components (menus, breadcrumbs, pagination)
- Data display components (tables, charts, badges, etc.)

## Data Flow

1. **Client Requests**: Frontend makes API calls using TanStack Query
2. **API Processing**: Express routes handle requests and validate parameters
3. **Data Access**: Storage layer (currently in-memory, designed for database integration)
4. **Response Formatting**: JSON responses with proper error handling
5. **Client Updates**: React Query manages caching and UI updates

The application uses a clean separation between client and server with shared TypeScript types for type safety across the stack.

## External Dependencies

### Frontend Dependencies
- **React Ecosystem**: React, React DOM, React Router (Wouter)
- **State Management**: TanStack React Query
- **UI Framework**: Radix UI primitives, shadcn/ui components
- **Styling**: Tailwind CSS, class-variance-authority, clsx
- **Forms**: React Hook Form with resolvers
- **Utilities**: date-fns, lucide-react icons

### Backend Dependencies
- **Server**: Express.js framework
- **Database**: Drizzle ORM, @neondatabase/serverless
- **Validation**: Zod for schema validation
- **Development**: tsx for TypeScript execution
- **Session Management**: connect-pg-simple for PostgreSQL sessions

### Build & Development Tools
- **Build System**: Vite with React plugin
- **TypeScript**: Full TypeScript support across stack
- **Database Tools**: Drizzle Kit for migrations
- **Development**: Replit-specific plugins for development environment

## Deployment Strategy

### Development Environment
- **Dev Server**: Vite dev server with HMR
- **API Server**: Express server with hot reloading via tsx
- **Database**: Configured for PostgreSQL with environment-based connection
- **Asset Handling**: Vite handles client assets, Express serves static files in production

### Production Build
- **Frontend**: Vite builds optimized bundle to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations handle schema updates
- **Environment**: Production mode serves static files from Express

The application is designed for deployment on platforms that support Node.js with PostgreSQL databases, with specific configuration for Replit's development environment.

## Recent Changes (January 2025)

- **Rebranded** platform from "HomeConnect" to "Home Base" with new tagline and messaging
- **Redesigned UI** with Anthropologie-inspired aesthetic featuring warm color palette (terra cotta, cream, soft browns)
- **Removed availability filters** from contractor search and profiles as requested
- **Enhanced maintenance schedule feature** with comprehensive real-world data from professional sources (January 25, 2025)
  - Added monthly recurring tasks (smoke detectors, HVAC filters, dryer vents, etc.)
  - Integrated seasonal maintenance schedules for all 12 months
  - Included professional services timing (HVAC tune-ups, chimney cleaning)
  - Added climate-specific recommendations for 8 US regions
  - Sourced from professional home maintenance guides and industry standards
- **Updated Home Base logo** with linear text layout, proper sizing, and alignment improvements
- **Expanded contractor services** to include niche specialties like gutter installation/cleaning, drywall installation/repair, and custom cabinetry
- **Updated color scheme** in CSS to use warmer, more elegant colors with proper light/dark mode support
- **Enhanced search placeholders** to highlight specialized services like "gutter cleaning, drywall repair, custom cabinetry"
- **Added comprehensive appointment scheduling system** (January 29, 2025)
  - Contractor appointment scheduler with full form validation
  - Automatic notification generation (24-hour, 4-hour, and 1-hour alerts)
  - Real-time notification display in header with badge counts
  - Complete CRUD operations for appointments and notifications
  - Integration with maintenance page for easy scheduling
  - Sample appointment data with active notifications for testing
- **Enhanced notification system with maintenance task alerts** (January 29, 2025)
  - Automatic notifications for pending maintenance tasks in current month
  - Priority-based notification system (high, medium, low)
  - Visual differentiation between appointment and maintenance notifications
  - Overdue task notifications with special styling and urgency indicators
  - Direct action links to maintenance page from notifications
  - Auto-generation of maintenance notifications when viewing current month tasks
- **Added multi-house support for maintenance scheduling** (January 29, 2025)
  - Users can now manage multiple properties with individual maintenance schedules
  - House-specific climate zones and home systems configuration
  - Property selector in maintenance interface for easy switching between homes
  - Sample data includes Main House and Vacation Cabin with different configurations
  - Maintenance tasks and notifications automatically filtered by selected property
  - Appointment scheduling links to specific houses for accurate record keeping
- **Implemented automatic climate zone detection** (February 2, 2025)
  - Climate zones are now automatically detected based on property address
  - Uses OpenStreetMap Nominatim geocoding service for coordinate lookup
  - Intelligent mapping of US coordinates to 8 climate regions
  - Real-time feedback with toast notifications when zone is detected
  - Manual override option still available if automatic detection is incorrect
  - Comprehensive coverage of all US regions with fallback logic
- **Added address autocomplete functionality** (February 2, 2025)
  - Real-time address suggestions as you type (300ms debounce)
  - Integration with Google Places API (when available) and OpenStreetMap fallback
  - Dropdown showing up to 5 address suggestions with structured formatting
  - One-click selection automatically triggers climate zone detection
  - Improves address accuracy and user experience for property setup
- **Transformed main page into role-based dashboards** (February 2, 2025)
  - Completely removed smart maintenance tab and content from main page for all users
  - Created role-based dashboard system serving as primary interface:
    - **Homeowner Dashboard**: Maintenance, service records, contractors, alerts, projects
    - **Contractor Dashboard**: Business overview, profile management, messages, active projects, reviews, leads
  - Made dashboard the default primary section for both user types with role-specific content
  - Added role-specific quick actions and features sections throughout the page
  - Enhanced with professional design system including gradient hero sections across all pages
  - Polished contractors, products, contractor detail, and maintenance pages with consistent styling
  - Added unique color themes for each page (amber for home, green for products, blue for contractor detail)
  - Improved typography, spacing, shadow effects, and interactive hover states throughout application
- **Enhanced contractor profile page with navigation header** (February 2, 2025)
  - Added Header component to contractor profile page for consistent navigation
  - Fixed header navigation links for contractors:
    - Updated My Profile link from `/profile` to `/contractor-profile` to match actual route
    - Fixed Dashboard link to point to dedicated contractor dashboard page (`/contractor-dashboard`)
  - Improved page structure with proper background styling and responsive layout
  - Completed service records linking system between contractors and homeowners
  - Added comprehensive homeowner service records page with filtering, search, and detailed display
  - Removed home value tracking feature from homeowner dashboard as requested
- **Added comprehensive proposal management system** (August 25, 2025)
  - Contractors can now create detailed service proposals with cost estimates and timelines
  - Full CRUD operations for proposals including create, edit, and delete functionality
  - Status tracking system (draft, sent, accepted, rejected, expired)
  - Comprehensive proposal forms with scope of work, materials lists, and warranty periods
  - Proposal validity dates and internal contractor notes for business management
  - Integrated proposal section directly into contractor dashboard for easy access
- **Updated service radius to 5-mile increments** (August 27, 2025)
  - Changed service radius options from large increments to precise 5-mile intervals
  - Updated both contractor profile configuration and homeowner filter sidebar
  - Now offers granular control from 5 miles up to 100 miles in 5-mile steps
- **Moved push notifications to contractor profile page** (August 27, 2025)
  - Relocated push notification management from contractor dashboard to My Profile section
  - Provides centralized location for contractors to manage notification preferences
  - Fixed runtime error that occurred when accessing contractor dashboard