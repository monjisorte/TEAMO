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
*   **Data Models:** Defined using Drizzle ORM, including Users, Teams, Categories, Students, Schedules, Attendance, Venues, SharedDocuments, and TuitionPayments. Models feature UUID primary keys, team isolation via `teamId`, and support for complex features like recurring schedules, optional venues, and detailed tuition payment tracking. Name fields are structured as `lastName` and `firstName` (both required) with optional `lastNameKana` and `firstNameKana` fields for Japanese phonetic readings. Zod is integrated for runtime validation.
*   **Key Features:**
    *   **Coach Interface:** Comprehensive management of schedules (list and calendar views, recurring events, file attachments, multi-category selection, optional venues), venues (with Google Maps), categories, teams, and coaches. A dashboard provides real-time statistics. Shared documents management supports folder hierarchies and file uploads. Tuition management includes automatic payment generation, annual fees, sibling discounts, and payment status tracking. Participant moving between events is supported. Student withdrawal is supported with cascading deletion of related data.
    *   **Player Interface:** Secure authentication, team registration via code, category subscription for schedule filtering, attendance management (○△× status), calendar views, shared documents access, contact form, and profile management (personal info, photo upload, category selection). Coach-specified events are visible but attendance modification is restricted. Sibling account linking and switching are supported.

### System Design Choices
The system utilizes a component-based frontend architecture with reusable UI components, feature-specific components, and page components. Custom hooks encapsulate shared logic. The backend is structured with clear separation for Express setup, API routes, Drizzle ORM configuration, and an abstraction layer for storage operations. Database schema design prioritizes UUID primary keys, flexible text fields, date/time separation, and foreign key relationships for data integrity. Neon Serverless with WebSocket support is used for the PostgreSQL-compatible database. Team representative authorization is implemented for editing team information.

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