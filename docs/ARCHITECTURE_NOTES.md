# Sports Team Schedule & Attendance Management Application

## Overview
This application is a comprehensive sports team management platform designed for coaches to efficiently manage schedules, track attendance, and organize team members. Built in Japanese with a modern, gradient-rich UI, it targets sports clubs, teams, and coaching staff. Key capabilities include managing categories (age groups), venues, coaches, schedules (with recurring options and file attachments), student attendance, shared documents, and tuition payments. It also features a multi-step club registration process and a dashboard for monitoring team activities. The project's ambition is to provide an intuitive and elegant solution for sports team management, enhancing user experience and operational efficiency.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application features a modern, gradient-based design system inspired by Linear and Notion, utilizing a blue-to-purple primary palette. It emphasizes a borderless design with subtle shadows, light/dark mode support, spacious layouts, and the Inter font family. The UI is systematically optimized for mobile-first user experience, with streamlined layouts, concise button labels, and responsive components across all interfaces.

### Technical Implementations
*   **Frontend:** React 18 with TypeScript, Wouter for routing, TanStack Query for server state management, Radix UI primitives with shadcn/ui for components, and Tailwind CSS for styling. Vite is used for building.
*   **Backend:** Node.js with TypeScript, Express.js for API handling, and Drizzle ORM for database interaction.
*   **Data Models:** Defined using Drizzle ORM, including Users, Teams, Categories, Students, Schedules, Attendance, Venues, SharedDocuments, and TuitionPayments. Models feature UUID primary keys, team isolation via `teamId`, and support for complex features like recurring schedules, optional venues, and detailed tuition payment tracking. Name fields are structured as `lastName` and `firstName` (both required) with optional `lastNameKana` and `firstNameKana` fields for Japanese phonetic readings. Students include a `startDate` field (defaults to next month's first day) to track member start month for entrance fee calculation. Zod is integrated for runtime validation.
*   **Key Features:**
    *   **Coach Interface:** Comprehensive management of schedules (list and calendar views, recurring events, file attachments, multi-category selection, optional venues, information sharing for practice matches), venues (with Google Maps), categories (with edit functionality, school-only flag, and reordering capability), teams, and coaches. A dashboard provides real-time statistics (upcoming events, team members, active coaches, recent schedules, activity logs). Shared documents management supports folder hierarchies, file uploads, and storage usage display (MB used / limit with percentage for Free plan). Tuition management includes automatic payment generation (with entrance fee based on member startDate month), annual fees, sibling discounts, and payment status tracking. **Member management:** CSV Import/Export functionality allows bulk member data management (姓,名,姓（カナ）,名（カナ）,メールアドレス,学校名,生年月日,背番号,メンバータイプ,所属カテゴリ,開始日 format with semicolon-separated categories; handles line ending normalization for cross-platform compatibility; startDate defaults to next month's first day when blank). Participant moving between events is supported. Student withdrawal is supported with cascading deletion of related data. Coach password reset functionality via email with token-based verification. Schedule information sharing feature allows coaches to copy formatted practice match details (own team name as opponent, date/time, gathering time, venue with address if registered, notes) to clipboard for sharing with opposing team members via external messaging platforms. **Subscription management:** Teams can upgrade from Free to Basic plan (¥2,000/month) via Stripe integration with plan limits enforcement, accessible via dedicated subscription management page.
    *   **Player Interface:** Secure authentication, team registration via code with automatic player type detection (8-digit code = team member, 9-digit code with suffix = school member), category subscription for schedule filtering, attendance management (○△× status), calendar views, shared documents access, contact form, and profile management (personal info, photo upload, category selection). Coach-specified events are visible but attendance modification is restricted. Sibling account linking and switching are supported. Password reset functionality via email.
    *   **Subscription System:** Two-tier plan structure with Free and Basic (¥2,000/month) plans. Free plan limits: 100 team members, 50MB shared document storage, 1-month event history retention. Basic plan: unlimited members, unlimited storage, full event history. Stripe integration handles subscription creation, upgrades, and webhook processing. Storage usage tracking on document upload/delete. Automated cleanup endpoint (`/api/schedules/cleanup-old`) for removing events older than 1 month on Free plan (authentication required, should be triggered by scheduled job).

### System Design Choices
The system utilizes a component-based frontend architecture with reusable UI components, feature-specific components, and page components. Custom hooks encapsulate shared logic. The backend is structured with clear separation for Express setup, API routes, Drizzle ORM configuration, and an abstraction layer for storage operations. Database schema design prioritizes UUID primary keys, flexible text fields, date/time separation, and foreign key relationships for data integrity. Neon Serverless with WebSocket support is used for the PostgreSQL-compatible database. Team representative authorization is implemented for editing team information.

**Team Code Registration System:** Students register using team codes (8 or 9 digits). The system automatically determines player type: 8-digit codes default to "team" (team members), while 9-digit codes (8-digit base + suffix character) default to "school" (school members). Team validation uses the first 8 characters, allowing multiple registration paths to the same team with different default member types.

## Known Issues & Future Improvements

### Authentication & Authorization
**Current Issue**: The application's authentication system has architectural limitations. While users are authenticated through email/password login, the server-side authorization relies on client-provided IDs (teamId, studentId, coachId) rather than server-managed session data or JWT tokens. This creates a trust boundary issue where the server cannot independently verify which team/user a request originates from.

**Impact**: Endpoints trust client-supplied identifiers (e.g., teamId in category management, studentId in attendance) without server-side validation that the authenticated user has permission to access those resources.

**Recommended Solution**: Implement proper session management or JWT-based authentication where:
1. Login endpoints issue secure, server-signed tokens containing user ID and team ID
2. The `isAuthenticated` middleware validates tokens and populates `req.user` with verified user data
3. All endpoints use `req.user.teamId` or `req.user.id` (server-derived) instead of client-provided values
4. Add authorization middleware to verify team ownership before allowing resource mutations

**Current Mitigation**: Client-side data storage in localStorage + server-side validation that resources belong to specified team (partial protection).

## External Dependencies
*   **UI Components:** Radix UI, shadcn/ui.
*   **Styling:** Tailwind CSS, class-variance-authority, clsx, tailwind-merge.
*   **Form Management & Validation:** React Hook Form, Zod.
*   **Data Fetching:** TanStack Query.
*   **Date Handling:** date-fns.
*   **Database & ORM:** Neon Serverless (PostgreSQL-compatible), Drizzle ORM.
*   **Session Management:** connect-pg-simple (prepared for).
*   **File Upload & Storage:** Uppy (UI), Replit Object Storage (powered by Google Cloud Storage) for file uploads and downloads.
*   **Payment Processing:** Stripe (subscription billing and payment processing).
*   **Mapping:** Google Maps (for venue integration).
*   **Fonts:** Google Fonts.
*   **Development Tools:** Vite, TypeScript, esbuild.