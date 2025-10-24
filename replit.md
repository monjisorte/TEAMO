# Sports Team Schedule & Attendance Management Application

## Overview
This application is a comprehensive sports team management platform designed for coaches to efficiently manage schedules, track attendance, and organize team members. Built in Japanese with a modern, gradient-rich UI, it targets sports clubs, teams, and coaching staff. Key capabilities include managing categories (age groups), venues, coaches, schedules (with recurring options and file attachments), student attendance, shared documents, and tuition payments. It also features a multi-step club registration process and a dashboard for monitoring team activities. The project's ambition is to provide an intuitive and elegant solution for sports team management, enhancing user experience and operational efficiency.

## Recent Changes

### October 24, 2025
*   **Sibling Discount Status Management Cleanup**:
    *   Removed deprecated `siblingDiscountStatus` field from students table schema
    *   MembersPage (coach), TuitionPage (coach), and PlayerMembersPage (player) now automatically display sibling discount status based on approved sibling links (read-only, no manual editing)
    *   Backend API endpoint `/api/student/:studentId` no longer accepts `siblingDiscountStatus` field
    *   Sibling discount status is now entirely determined by the `siblingLinks` table (status="approved")
    *   Enhanced GET `/api/sibling-links/team/:teamId/status` endpoint to return sibling details (id, lastName, firstName) instead of just boolean status
    *   All three pages display sibling information in format "兄弟 [姓名]" when siblings exist (e.g., "兄弟 文字麟太郎")
    *   When multiple siblings exist, only the first sibling's name is displayed
    *   **Rationale**: Eliminates data inconsistency by using single source of truth (siblingLinks table) instead of maintaining redundant field, while providing clear visibility of sibling relationships

### October 23, 2025
*   **Sibling Account Linking System**:
    *   Added `siblingLinks` table to database schema for managing sibling relationships between students
    *   Implemented complete backend API for sibling management:
        *   POST `/api/sibling-links` - Send sibling link requests via email address (with email notification)
        *   GET `/api/sibling-links/:studentId` - Retrieve all sibling links (pending and approved)
        *   PUT `/api/sibling-links/:linkId/approve` - Approve pending sibling requests (with email notification)
        *   DELETE `/api/sibling-links/:linkId` - Remove or reject sibling links
        *   GET `/api/siblings/:studentId` - Get approved siblings for account switching
    *   Added "Sibling Account Management" section to player profile page:
        *   Add sibling by email address
        *   View pending approval requests with approve/reject actions
        *   View sent requests and approved siblings
        *   Delete existing sibling links
    *   Implemented sibling account switcher in player portal header:
        *   Dropdown menu appears when student has approved sibling links
        *   One-click account switching without re-login
        *   Seamlessly switches between sibling accounts by updating localStorage and reloading
    *   Automatic sibling discount application:
        *   Tuition payment reset endpoint now automatically detects approved sibling relationships
        *   Students with approved siblings automatically receive configured sibling discount
        *   No manual siblingDiscountStatus setting required
    *   Email notifications using Resend:
        *   Request notification: Sent to sibling when link request is created
        *   Approval notification: Sent to requester when link is approved
        *   Both notifications include direct links to profile settings
        *   Error handling: Process continues even if email delivery fails
    *   **Design Notes**: Optional feature for families with multiple children; only affects users who set up sibling links. Requires same team membership for sibling linking. Link approval is bidirectional (both students must be involved in the relationship).

*   **Tuition Payment System Enhancement**:
    *   Restructured tuition payment tracking from single `enrollmentOrAnnualFee` field to separate fields: `annualFee` (年会費), `entranceFee` (入会金), and `insuranceFee` (保険料)
    *   Updated TuitionPage UI to display three separate input fields for each student's tuition details
    *   Removed redundant "月謝設定" (Tuition Settings) dialog
    *   Changed "月謝データ自動生成" (Auto-generate) to "月謝データ初期化" (Reset/Initialize)
    *   Modified reset functionality: Deletes only unpaid records for selected month and regenerates with current team settings
    *   Auto-generation logic applies annual fee and insurance fee based on configured billing months (`annualFeeMonth` and `insuranceFeeMonth`)
    *   Updated backend API endpoint from `/api/tuition-payments/auto-generate` to `/api/tuition-payments/reset-unpaid`
    *   Changed UI label from "入会/年会費" to "年会費" for clarity
    *   Entrance fee is manually set per student (not auto-generated)
    *   Team settings for fees (monthly, annual, insurance, entrance, sibling discount) are now managed exclusively in TeamInfoPage

*   **Player-Side UX Improvements**:
    *   Fixed recurring category selection prompt: Modified PlayerAttendancePage to initialize state directly from localStorage, eliminating unnecessary category selection screen on every visit
    *   Enhanced document preview: Updated PDF and text file iframes to use dynamic height (`calc(90vh - 200px)` with `min-height: 600px`), enabling full-page scrolling for multi-page documents

*   **Team Representative Authorization System**:
    *   Added `ownerCoachId` field to teams table to identify the team representative (代表)
    *   Implemented server-side authorization check in `/api/teams/:id` PUT endpoint
    *   Only the team representative (coach with role="owner") can edit team information
    *   Team registration automatically sets the first coach as owner and assigns `ownerCoachId`
    *   Added team name editing capability in TeamInfoPage for representatives
    *   Added entrance fee, insurance fee, and billing month configuration fields
    *   **Known Limitation**: Current implementation requires `coachId` in request body for authorization. Future improvement: implement session-based authentication to derive coach identity from server-side session instead of client-provided data.

*   **Terminology Update**: Changed all "オーナー" (owner) references to "代表" (representative) throughout the application.

*   **Coach Management Enhancement**: Added position/role display in coach list showing titles like "代表", "ヘッドコーチ", "U-8担当" etc.

*   **Environment Separation Fixed:** Resolved critical issue where Preview environment was redirecting to production (teamo.cloud), causing development work to affect production database.
    *   Removed all hardcoded `teamo.cloud` domain references from codebase
    *   Disabled automatic domain redirect in `server/index.ts` for development environments
    *   Updated password reset email URLs to use current request host instead of hardcoded production domain
    *   Modified logout handler to use internal routing instead of external redirect
    *   Development environment (replit.dev) now correctly isolated from production environment

### October 22, 2025
*   **Database Migration Completed:** Successfully migrated from single `name` field to structured `lastName` + `firstName` fields across students and coaches tables.
*   **Name Handling System:** Implemented `nameUtils.ts` with `getFullName()` and `getInitials()` helper functions for consistent name display throughout the application.
*   **Authentication Updates:** Updated all registration and login flows (both player and coach) to use separate name fields, including API endpoints and frontend components.
*   **Type System Updates:** Updated TypeScript interfaces (PlayerData, CoachData) across frontend and backend to enforce the new name structure.
*   **Backend API Changes:** All authentication endpoints now return and accept `lastName` and `firstName` instead of a single `name` field.
*   **Routing Improvements:** Added `/coach/login` and `/coach/*` routes to properly render CoachPortal, preventing fallback to PlayerPortal.
*   **Frontend Component Updates:** Systematically updated all components (Dashboard, CalendarView, PlayerMembersPage, PlayerCoachesPage, MembersPage, TuitionPage, CoachManagement, AdminTeams, PlayerDashboard, TeamInfoPage) to use `getFullName()` helper for consistent name display.
*   **Architecture Verification:** Confirmed zero references to legacy `name` field remain in codebase; all authentication flows tested and working correctly.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application features a modern, gradient-based design system inspired by Linear and Notion, utilizing a blue-to-purple primary palette. It emphasizes a borderless design with subtle shadows, light/dark mode support, spacious layouts, and the Inter font family. The UI is systematically optimized for mobile-first user experience, with streamlined layouts, concise button labels, and responsive components across all interfaces.

### Technical Implementations
*   **Frontend:** React 18 with TypeScript, Wouter for routing, TanStack Query for server state management, Radix UI primitives with shadcn/ui for components, and Tailwind CSS for styling. Vite is used for building.
*   **Backend:** Node.js with TypeScript, Express.js for API handling, and Drizzle ORM for database interaction.
*   **Data Models:** Defined using Drizzle ORM, including Users, Teams, Categories, Students, Schedules, Attendance, Venues, SharedDocuments, and TuitionPayments. Models feature UUID primary keys, team isolation via `teamId`, and support for complex features like recurring schedules, optional venues, and detailed tuition payment tracking. Name fields are structured as `lastName` and `firstName` (both required) with optional `lastNameKana` and `firstNameKana` fields for Japanese phonetic readings. Zod is integrated for runtime validation.
*   **Key Features:**
    *   **Coach Interface:** Comprehensive management of schedules (list and calendar views, recurring events, file attachments, multi-category selection, optional venues), venues (with Google Maps), categories, teams, and coaches. A dashboard provides real-time statistics. Shared documents management supports folder hierarchies and file uploads. Tuition management includes automatic payment generation, annual fees, sibling discounts, and payment status tracking. Participant moving between events is supported.
    *   **Player Interface:** Secure authentication, team registration via code, category subscription for schedule filtering, attendance management (○△× status), calendar views, shared documents access, contact form, and profile management (personal info, photo upload, category selection). Coach-specified events are visible but attendance modification is restricted.

### System Design Choices
The system utilizes a component-based frontend architecture with reusable UI components, feature-specific components, and page components. Custom hooks encapsulate shared logic. The backend is structured with clear separation for Express setup, API routes, Drizzle ORM configuration, and an abstraction layer for storage operations. Database schema design prioritizes UUID primary keys, flexible text fields, date/time separation, and foreign key relationships for data integrity. Neon Serverless with WebSocket support is used for the PostgreSQL-compatible database.

## External Dependencies
*   **UI Components:** Radix UI, shadcn/ui.
*   **Styling:** Tailwind CSS, class-variance-authority, clsx, tailwind-merge.
*   **Form Management & Validation:** React Hook Form, Zod.
*   **Data Fetching:** TanStack Query.
*   **Date Handling:** date-fns.
*   **Database & ORM:** Neon Serverless (PostgreSQL-compatible), Drizzle ORM.
*   **Session Management:** connect-pg-simple (prepared for).
*   **File Upload & Storage:** Uppy (UI), Replit Object Storage (powered by Google Cloud Storage) for file uploads and downloads.
*   **Mapping:** Google Maps (for venue integration).
*   **Fonts:** Google Fonts.
*   **Development Tools:** Vite, TypeScript, esbuild.