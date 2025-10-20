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
*   **Coach Interface:** Responsive sidebar navigation, theme toggle, multi-step club registration, schedule management with 5-minute intervals and file attachments (up to 10 files), venue management with Google Maps integration, category/age group management, team management with unique codes, and coach contact information. Dashboard displays real-time statistics (upcoming events by period, team members count, active coaches count) in a 3-column grid layout (both desktop and mobile), with responsive sizing and centered content for optimal viewing on all devices. Schedule management includes both list view and calendar view (month display) with category-based color coding. **Multiple category selection** is supported when creating schedules (checkbox-based UI). **Venue is optional** - defaults to "未定" (TBD) if not specified. **Recurring schedule auto-generation** creates multiple schedule instances based on recurrence rules (daily, weekly, monthly) with safety limit of 100 occurrences. **Recurring schedule deletion/editing** prompts confirmation dialog for both parent schedules and child instances with "this event only" vs "all events in series" options. Backend efficiently handles bulk operations via `updateType` (PUT) and `deleteType` (DELETE query param). Calendar view displays participant counts (○ marks) for each event, and clicking dates shows event details with participant lists (○△× status) and edit functionality. **Participant moving feature** allows coaches to move participants between events on the same day via "→" button in calendar event details dialog. **Shared documents management** with folder hierarchy support and file upload using Replit Object Storage (max 50MB per file). Coaches can create folders, upload files, and organize documents for team-wide access. **Tuition management** with comprehensive financial tracking: category selection ("チーム", "スクール", or "(未選択)"), detailed breakdown (月謝/baseAmount, 割引/discount, 入会・年会費/enrollmentOrAnnualFee, スポット/spotFee, 合計金額/amount), automatic payment generation from student registration date, automatic annual fee addition in April, auto-calculated totals with manual override capability, and payment status checkbox management per student per month. Auto-generation feature creates missing payment records for all students with appropriate fees based on student type (member vs school), with detailed toast notifications showing generation count or confirmation when no new records needed. **Category persistence** - when category is changed in tuition management, student's playerType is automatically updated via PATCH `/api/student/:studentId`, ensuring category selection persists across months. **Team settings dialog** in tuition management allows editing base monthly fees (monthlyFeeMember, monthlyFeeSchool), annual fee, and sibling discount via dedicated settings button, with validation and persistence to database via PUT `/api/teams/:id`. **Member list with category filter** allows filtering members by category for easy management.
*   **Player Interface:** Unified design with the coach interface, secure email/password authentication, team registration via 8-character codes, category subscription for schedule filtering, attendance management (○△× status, comments, real-time save), calendar views (month/week) with event details and venue links, shared documents section with folder navigation and file download capability, contact form, and a profile management page for personal information, photo upload, and category selection with Zod validation. **Coach-specified events** (schedules with `studentCanRegister: false`) are visible on calendar with "コーチ指定" badge but students cannot modify attendance - attendance buttons are hidden with explanation message. **Member list with category filter** allows viewing team members filtered by category.

### Backend Architecture
**Technology Stack:** Node.js with TypeScript, Express.js, Drizzle ORM, Neon Serverless (PostgreSQL-compatible), and prepared for connect-pg-simple for session management.

**Server Structure:** `server/index.ts` handles Express setup, `server/routes.ts` for API routes, `server/db.ts` for Drizzle ORM configuration, and `server/storage.ts` provides an abstraction layer for storage operations, currently in-memory but designed for database-backed migration.

**Data Models:** Defined in `shared/schema.ts`, including Users, Teams, Categories, Students, StudentCategories, Schedules, Attendance, Venues, ScheduleFiles, SharedDocuments, TuitionPayments, and Admins. All models use UUID primary keys and are designed for team isolation via `teamId` foreign keys. **Schedules table** supports both single category (`categoryId`) and multiple categories (`categoryIds` array) with backward compatibility, optional venue field (nullable), `studentCanRegister` boolean flag for coach-specified events, and recurring schedule metadata (`recurrenceRule`, `recurrenceInterval`, `recurrenceDays`, `recurrenceEndDate`, `parentScheduleId` for linking recurring instances). **TuitionPayments table** includes student ID, team ID, year/month, category ("team" | "school" | null for unselected), baseAmount (monthly fee based on student type), discount, enrollmentOrAnnualFee (annual fee automatically added in April), spotFee, amount (total calculated amount, manually editable), payment status (`isPaid`), payment timestamp, and notes. **Teams table** includes monthly fee settings for both members (monthlyFeeMember - チーム生の月会費) and school students (monthlyFeeSchool - スクール生の月会費), sibling discount (siblingDiscount), and annual fee (annualFee). **Coaches table** includes profile information fields: lastName, firstName, lastNameKana, firstNameKana, photoUrl, bio, and position (役職 - display title separate from role field used for permissions). **Students table** includes jerseyNumber (integer field for player jersey/uniform numbers).

**API Endpoints:**
*   `/api/stats/:teamId` - GET dashboard statistics (upcoming events count by period, team members count, active coaches count, recent schedules). Accepts query parameter `period` (this-week, next-week, this-month, next-month).
*   `/api/schedules` - GET/POST (with recurring schedule auto-generation) schedule management
*   `/api/schedules/:id` - PUT (with `updateType` parameter: "this" | "all" for recurring schedules), DELETE (with `deleteType` query parameter: "this" | "all" for recurring schedules)
*   `/api/categories` - GET/POST/DELETE category management
*   `/api/venues` - GET/POST/DELETE venue management
*   `/api/venues/:venueId` - PUT venue editing (name and address)
*   `/api/students` - GET student data
*   `/api/student/:studentId` - PATCH student profile update (supports name, schoolName, birthDate, photoUrl, playerType, jerseyNumber)
*   `/api/student-categories` - POST add student to category
*   `/api/student-categories/:studentId/:categoryId` - DELETE remove student from category
*   `/api/student/:studentId/email` - PUT student email change with current password verification
*   `/api/student/:studentId/password` - PUT student password change with current password verification
*   `/api/coaches` - GET/POST/DELETE coach management
*   `/api/coach/:coachId` - GET coach profile information (excluding password)
*   `/api/coach/:coachId` - PUT update coach profile (lastName, firstName, lastNameKana, firstNameKana, photoUrl, bio, position)
*   `/api/coach/:coachId/password` - PUT change coach password with current password verification
*   `/api/team/:teamId/coaches` - GET list of all coaches for a team (for student view, excluding passwords)
*   `/api/attendances` - GET/POST attendance tracking
*   `/api/attendances/:id` - PUT attendance update (supports scheduleId change for participant moving)
*   `/api/tuition-payments` - GET/POST tuition payment management (supports year and month query filters, handles create/update with baseAmount, discount, enrollmentOrAnnualFee, spotFee, amount, category fields)
*   `/api/tuition-payments/auto-generate` - POST auto-generate tuition payment records for all students from registration date's next month to current month, with automatic baseAmount assignment based on student type, annual fee for April, and total calculation
*   `/api/folders` - GET/POST/DELETE folder management (supports teamId and parentFolderId filters)
*   `/api/documents` - GET/POST/DELETE document management (supports teamId and folderId filters)
*   `/api/objects/upload` - POST to get presigned upload URL for object storage
*   `/objects/:objectPath` - GET to download files from object storage (with ACL check)
*   `/api/admin/register` - POST admin registration (only if no admins exist)
*   `/api/admin/setup-needed` - GET check if initial admin setup is needed
*   `/api/admin/login` - POST admin authentication
*   `/api/admin/stats` - GET system-wide dashboard statistics (total teams count)
*   `/api/admin/teams` - GET all teams with statistics (coach count, member count, event count)
*   `/api/admin/teams/:teamId` - GET detailed team information with coaches and members list
*   `/api/admin/accounts` - GET all admin accounts (excluding passwords), POST add new admin account (by existing admin)

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
**File Upload:** Uppy for file upload UI and Google Cloud Storage via Replit Object Storage.
**Development Tools:** Vite, Replit Plugins, TypeScript, and esbuild.
**Third-Party Services:** Google Fonts, Google Maps for venue integration, Replit Object Storage for file storage.

## Object Storage
**Implementation:** Replit Object Storage is configured with bucket ID and environment variables (PUBLIC_OBJECT_SEARCH_PATHS, PRIVATE_OBJECT_DIR). The ObjectStorageService (`server/objectStorage.ts`) and ObjectAcl (`server/objectAcl.ts`) handle file upload, ACL policies, and file serving. The ObjectUploader component (`client/src/components/ObjectUploader.tsx`) provides a modal-based upload interface using Uppy. Files are uploaded directly to Google Cloud Storage via presigned URLs, and ACL policies ensure team-wide public visibility for shared documents.