# Sports Team Schedule & Attendance Management Application

## Overview
This application is a comprehensive sports team management platform for coaches to manage schedules, track attendance, and organize team members. It features a modern, gradient-rich UI and is built in Japanese, targeting sports clubs, teams, and coaching staff. Key capabilities include managing categories (age groups), venues, coaches, schedules, and student attendance, alongside a multi-step club registration and a dashboard for monitoring team activities. The project aims to provide efficient schedule and attendance management tools with a focus on elegant design and user experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
**Technology Stack:** React 18 with TypeScript, Wouter for routing, TanStack Query for server state, Radix UI primitives with shadcn/ui, Tailwind CSS for styling, and Vite for building.

**Design System:** A custom, modern, gradient-based design system inspired by Linear and Notion, featuring a blue-to-purple primary palette, borderless design with subtle shadows, light/dark mode support, spacious layouts, and Inter font family.

**Component Architecture:** Reusable UI components, feature-specific components (e.g., Dashboard, ScheduleList), and page components as route handlers. Custom hooks encapsulate shared logic.

**Key Features:**
*   **Coach Interface:** Responsive sidebar navigation, theme toggle, multi-step club registration, schedule management with 5-minute intervals and file attachments (up to 10 files), venue management with Google Maps integration, category/age group management, team management with unique codes, and coach contact information. Dashboard displays real-time statistics (upcoming events by period, team members count, active coaches count) connected to the database. Schedule management includes both list view and calendar view (month display) with category-based color coding. Calendar view displays participant counts (○ marks) for each event, and clicking dates shows event details with participant lists (○△× status) and edit functionality.
*   **Player Interface:** Unified design with the coach interface, secure email/password authentication, team registration via 8-character codes, category subscription for schedule filtering, attendance management (○△× status, comments, real-time save), calendar views (month/week) with event details and venue links, shared documents section, contact form, and a profile management page for personal information, photo upload, and category selection with Zod validation.

### Backend Architecture
**Technology Stack:** Node.js with TypeScript, Express.js, Drizzle ORM, Neon Serverless (PostgreSQL-compatible), and prepared for connect-pg-simple for session management.

**Server Structure:** `server/index.ts` handles Express setup, `server/routes.ts` for API routes, `server/db.ts` for Drizzle ORM configuration, and `server/storage.ts` provides an abstraction layer for storage operations, currently in-memory but designed for database-backed migration.

**Data Models:** Defined in `shared/schema.ts`, including Users, Teams, Categories, Students, StudentCategories, Schedules, Attendance, Venues, ScheduleFiles, and SharedDocuments. All models use UUID primary keys and are designed for team isolation via `teamId` foreign keys.

**API Endpoints:**
*   `/api/stats/:teamId` - GET dashboard statistics (upcoming events count by period, team members count, active coaches count, recent schedules). Accepts query parameter `period` (this-week, next-week, this-month, next-month).
*   `/api/schedules` - GET/POST schedule management
*   `/api/categories` - GET/POST/DELETE category management
*   `/api/venues` - GET/POST/DELETE venue management
*   `/api/students` - GET student data
*   `/api/coaches` - GET/POST/DELETE coach management
*   `/api/attendances` - GET/POST/PUT attendance tracking

### Database Architecture
**ORM and Schema:** Drizzle ORM with PostgreSQL dialect, schema-first approach with TypeScript type inference, Zod integration for runtime validation, and migration support via drizzle-kit.

**Connection Strategy:** Neon Serverless with WebSocket support for serverless environments and connection pooling.

**Schema Design Principles:** UUID primary keys, flexible text fields, separate date and time fields, foreign key relationships for data integrity, and Zod schemas derived from Drizzle for consistent validation.

## External Dependencies
**UI Component Library:** Radix UI for unstyled, accessible component primitives.
**Styling and Utilities:** Tailwind CSS, class-variance-authority, clsx, and tailwind-merge.
**Form Management:** React Hook Form and Zod for schema validation.
**Data Fetching:** TanStack Query for server state management.
**Date Handling:** date-fns for date manipulation.
**Database and Backend:** Neon Serverless, Drizzle ORM, and connect-pg-simple.
**Development Tools:** Vite, Replit Plugins, TypeScript, and esbuild.
**Third-Party Services:** Google Fonts, Google Maps for venue integration.