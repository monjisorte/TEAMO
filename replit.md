# Sports Team Schedule & Attendance Management Application

## Overview

This is a comprehensive sports team management application designed for coaches to manage schedules, track attendance, and organize team members. The application features a modern, gradient-rich UI inspired by Linear and Notion, with a focus on spacious layouts and elegant design. The platform is built in Japanese (日本語) and targets sports clubs, teams, and coaching staff who need efficient schedule and attendance management tools.

The application provides functionality for managing categories (age groups like U-12, U-15), venues, coaches, schedules, and student attendance tracking. It includes a multi-step club registration flow and comprehensive dashboard for monitoring team activities.

## Recent Changes

**October 17, 2025 - Player Interface Unification with Sidebar Navigation**
- Renamed all "student" terminology to "player" throughout the application
  - Changed URLs from `/student` to `/player`
  - Renamed components directory from `student/` to `player/`
  - Updated all file names: `StudentLogin` → `PlayerLogin`, `StudentDashboard` → `PlayerDashboard`, etc.
- Unified design between coach and player interfaces with sidebar navigation
  - Created `PlayerSidebar` component matching coach interface design
  - Integrated `SidebarProvider` into player portal
  - Added unified header with player info, theme toggle, and logout button
- Separated player dashboard into individual page components:
  - `PlayerAttendancePage` - Attendance management with category selection
  - `PlayerCalendarPage` - Calendar views (month/week) with schedule details
  - `PlayerDocumentsPage` - Shared documents repository
  - `PlayerContactPage` - Contact form for team administrators
  - `PlayerSettingsPage` - Category selection and preferences
- Implemented category persistence using localStorage
- Applied consistent gradient-based design system across both interfaces

**Earlier - Player Portal Implementation**
- Implemented complete player interface with authentication system
- Added team management with random 8-character team codes for secure access
- Created player account registration and login functionality
- Implemented category selection for players to choose which schedules to view
- Built attendance management view (○△× selection with comments)
- Created calendar view with month/week toggle and schedule details popup
- Added shared documents section for team resources
- Implemented contact form to send messages to team administrators
- Extended database schema:
  - `teams` table with unique team codes and contact emails
  - Updated `students` table with email/password authentication and team linking
  - `student_categories` table for category subscriptions
  - `attendance` table with comment field and timestamps
  - `shared_documents` table for team resources
- Added utility functions for password hashing and team code generation

**Earlier - Schedule Management Enhancements**
- Implemented 5-minute interval time selection for start time, end time, and gather time
- Added venue management with dropdown selection and Google Maps integration (clickable venue links)
- Changed registration control to "生徒側から参加登録を不可能にする" checkbox (default: unchecked = students can register)
- Implemented file upload functionality (max 10 files) using Replit object storage with Uppy
- Extended database schema with `venues`, `schedule_files` tables
- Database successfully pushed with all new tables

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

*Coach Interface:*
- Responsive sidebar navigation with collapsible states
- Theme toggle (light/dark mode) with localStorage persistence
- Multi-step club registration wizard
- Schedule management with 5-minute interval time selection
- File attachment support (up to 10 files per schedule)
- Venue management with Google Maps integration
- Category/age group management with student associations
- Team management with unique team code generation
- Coach contact information management

*Player Interface (Unified with Coach Design):*
- Responsive sidebar navigation matching coach interface
- Secure authentication with email/password
- Team registration using 8-character team codes
- Unified header with player info, theme toggle, and logout button
- Category subscription system to filter visible schedules (localStorage-persisted)
- Attendance management page:
  - ○△× status selection for each event
  - Comment field for additional notes
  - Real-time save functionality
  - Category selection prompt if no categories selected
- Calendar page:
  - Month view with event indicators
  - Week view with detailed schedule cards
  - Event detail popup with Google Maps venue links
  - Visual attendance status display
- Shared documents page for team resources
- Contact page to reach team administrators
- Settings page for category preferences
- Consistent gradient-based design system with coach interface

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
- **Users**: Coach authentication and user management
- **Teams**: Team information with unique 8-character codes and contact emails
- **Categories**: Team categories/age groups (U-12, U-15, etc.)
- **Students**: Team members with email/password authentication, linked to teams
- **StudentCategories**: Junction table for student category subscriptions
- **Schedules**: Events with title, date, time, venue, category, notes, and file attachments
- **Attendance**: Links students to schedules with status (○△×), comments, and timestamps
- **Venues**: Predefined locations with addresses for Google Maps integration
- **ScheduleFiles**: File attachments for schedules stored in object storage
- **SharedDocuments**: Team resources and documents accessible to all students

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