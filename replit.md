# HomeConnect - Contractor & DIY Products Platform

## Overview

HomeConnect is a full-stack web application that connects homeowners with trusted contractors and provides a marketplace for DIY products. The application features a modern React frontend with shadcn/ui components, an Express.js backend, and uses Drizzle ORM with PostgreSQL for data management.

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
- **Home**: Landing page with hero section and featured content
- **Contractors**: Contractor listing with search and filtering
- **Products**: DIY product marketplace
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