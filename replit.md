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
The application defines two main entities:

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