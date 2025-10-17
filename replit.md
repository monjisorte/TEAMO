# Sports Team Schedule & Attendance Management Application

## Overview

This is a comprehensive sports team management application designed for coaches to manage schedules, track attendance, and organize team members. The application features a modern, gradient-rich UI inspired by Linear and Notion, with a focus on spacious layouts and elegant design. The platform is built in Japanese (日本語) and targets sports clubs, teams, and coaching staff who need efficient schedule and attendance management tools.

The application provides functionality for managing categories (age groups like U-12, U-15), venues, coaches, schedules, and student attendance tracking. It includes a multi-step club registration flow and comprehensive dashboard for monitoring team activities.

## Recent Changes

**October 17, 2025 - Student Attendance & Category Management Enhancements**
- Extended database schema with `students` and `attendance` tables for comprehensive participant tracking
- Implemented attendance count display on schedule cards with visual indicators (○△×)
- Added clickable attendance summary that opens detailed participant view with transfer functionality
- Enabled student transfer between activities via dropdown menu in participant details
- Enhanced category cards to display registered student count
- Implemented category click-through to view full student roster
- All components updated with modern gradient design system
- Mock data added for development and testing purposes

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Radix UI primitives with shadcn/ui component system
- **Styling**: Tailwind CSS with custom design system
- **Build Tool**: Vite

**Design System:**
The application implements a custom design system with:
- Modern gradient-based color palette (blue-to-purple primary, green-to-teal secondary)
- Borderless design with subtle shadows instead of harsh borders
- Light and dark mode support with HSL-based theming
- Custom CSS variables for consistent theming across components
- Spacious layouts with generous whitespace
- Typography using Inter font family with variable weights

**Component Architecture:**
- Reusable UI components in `client/src/components/ui/`
- Feature components in `client/src/components/` (Dashboard, ScheduleList, CategoryManagement, etc.)
- Page components in `client/src/pages/` acting as route handlers
- Custom hooks in `client/src/hooks/` for shared logic (mobile detection, toast notifications)

**Key Features:**
- Responsive sidebar navigation with collapsible states
- Theme toggle (light/dark mode) with localStorage persistence
- Multi-step club registration wizard
- Schedule management with calendar and list views
- Attendance tracking with visual status indicators (○ present, △ maybe, × absent)
  - Schedule cards display attendance count summaries
  - Click to view detailed participant list with status
  - Student transfer functionality to move participants between activities
- Category/age group management with student associations
  - Category cards display student count
  - Click to view full student roster for each category
- Venue management for frequently used locations
- Coach management with contact information

### Backend Architecture

**Technology Stack:**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM
- **Database Driver**: Neon Serverless (PostgreSQL-compatible)
- **Session Management**: Prepared for connect-pg-simple (PostgreSQL session store)

**Server Structure:**
- **Entry Point**: `server/index.ts` - Express app setup with middleware
- **Routes**: `server/routes.ts` - API route registration (currently minimal structure)
- **Database**: `server/db.ts` - Drizzle ORM configuration with Neon serverless
- **Storage Layer**: `server/storage.ts` - Abstraction layer with IStorage interface
  - Currently implements in-memory storage (MemStorage class)
  - Designed for easy migration to database-backed storage
  - Provides CRUD operations for users

**Development Features:**
- Vite middleware integration for HMR in development
- Request/response logging with duration tracking
- Error handling middleware
- Static file serving in production

**Data Models** (defined in `shared/schema.ts`):
- **Users**: Authentication and user management
- **Categories**: Team categories/age groups (U-12, U-15, etc.)
- **Students**: Team members associated with categories
- **Schedules**: Events with title, date, time, venue, category, and notes
- **Attendance**: (Implied structure) Links students to schedules with status

All models use UUID primary keys generated via PostgreSQL's `gen_random_uuid()`.

### Database Architecture

**ORM and Schema:**
- Drizzle ORM with PostgreSQL dialect
- Schema-first approach with TypeScript type inference
- Zod integration for runtime validation
- Migration support via drizzle-kit

**Connection Strategy:**
- Neon Serverless with WebSocket support for serverless environments
- Connection pooling via `@neondatabase/serverless`
- Environment-based configuration (DATABASE_URL)

**Schema Design Principles:**
- UUID primary keys for distributed system compatibility
- Text fields for flexibility (names, descriptions, notes)
- Date and time fields separated for schedule management
- Foreign key relationships between students/categories and schedules/categories
- Zod schemas derived from Drizzle schemas for consistent validation

### External Dependencies

**UI Component Library:**
- **Radix UI**: Unstyled, accessible component primitives
  - Extensive set: Dialog, Dropdown, Popover, Tabs, Accordion, Select, etc.
  - Provides ARIA-compliant, keyboard-navigable components
  - Used as foundation for custom styled components

**Styling and Utilities:**
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **class-variance-authority**: Type-safe component variants
- **clsx** + **tailwind-merge**: Conditional className composition

**Form Management:**
- **React Hook Form**: Form state management (via @hookform/resolvers)
- **Zod**: Schema validation and type inference

**Data Fetching:**
- **TanStack Query**: Server state management with caching, background refetching
- Custom query client configuration with credential-based fetching

**Date Handling:**
- **date-fns**: Date manipulation and formatting utilities

**Database and Backend:**
- **Neon Serverless**: PostgreSQL-compatible serverless database
- **Drizzle ORM**: Type-safe ORM with PostgreSQL support
- **connect-pg-simple**: PostgreSQL-backed session store for Express

**Development Tools:**
- **Vite**: Fast build tool with HMR
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner
- **TypeScript**: Static type checking across client and server
- **esbuild**: Fast bundling for production server code

**Third-Party Services:**
- **Google Fonts**: Inter and JetBrains Mono font families
- WebSocket support for Neon database connections

**Build and Deployment:**
- Separate build processes for client (Vite) and server (esbuild)
- Production server serves static files from dist/public
- Environment-based configuration for database and services