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

### Technical Implementation
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack Query for state management, and Tailwind CSS for styling. Vite is used for fast development and optimized builds.
- **Backend**: Node.js with Express.js, written in TypeScript with ES modules. Implements a RESTful API with JSON responses.
- **Database**: PostgreSQL, integrated with Drizzle ORM for type-safe operations and Drizzle Kit for schema management.
- **Data Flow**: Client requests use TanStack Query, Express routes handle processing, data access is via Drizzle ORM to PostgreSQL, and responses are JSON. Shared TypeScript types ensure end-to-end type safety.

### Key Features and Specifications
- **User Management**: Support for distinct Homeowner and Contractor roles.
- **Contractor Features**:
    - Detailed profiles with personal, professional, and service offering information.
    - Comprehensive proposal management system (create, edit, delete, status tracking).
    - Service radius configuration in 5-mile increments.
- **Homeowner Features**:
    - Multi-property support with individual maintenance schedules.
    - Automatic climate zone detection based on property address using geocoding.
    - Address autocomplete functionality for property setup.
    - Centralized service records tracking.
- **Marketplace**: Functionality for listing and browsing DIY products.
- **Maintenance Guidance**: Seasonal home maintenance schedule with location-based recommendations.
- **Notifications**: Enhanced system for appointments and maintenance task alerts, with priority levels and house-specific filtering.
- **API Endpoints**: Structured for contractors and products, with implied support for houses, notifications, and proposals.

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

### Third-Party Services
- **Geocoding**: OpenStreetMap Nominatim (for climate zone detection).
- **Address Autocomplete**: Google Places API (when available), OpenStreetMap (fallback).