# Design Guidelines: Sports Team Schedule & Attendance Management App (Coach Interface)

## Design Approach

**Hybrid Reference + System Approach**: Drawing inspiration from leading team management platforms (TeamSnap, SportsEngine, Hudl) while anchoring in Material Design principles for consistency and usability. This balances professional functionality with an engaging, sports-appropriate aesthetic that coaches will enjoy using daily.

**Key Design Principles**:
- Clarity over complexity: Every element serves the coach's workflow
- Action-oriented: CTAs and important functions are immediately accessible
- Data-first: Information hierarchy prioritizes schedules and team data
- Mobile-friendly: Coaches manage teams on-the-go

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 212 100% 45% (Sport Blue - energetic, trustworthy)
- Secondary: 142 71% 45% (Field Green - athletic, fresh)
- Accent: 24 95% 53% (Alert Orange - for notifications, deadlines)
- Neutral Base: 220 13% 96% (backgrounds)
- Text Primary: 220 13% 18%
- Text Secondary: 220 9% 46%

**Dark Mode:**
- Primary: 212 100% 55%
- Secondary: 142 71% 55%
- Accent: 24 95% 58%
- Neutral Base: 220 13% 10% (backgrounds)
- Surface: 220 13% 15% (cards, panels)
- Text Primary: 220 13% 98%
- Text Secondary: 220 9% 70%

**Semantic Colors:**
- Success: 142 71% 45% (attendance confirmed)
- Warning: 45 93% 47% (pending responses)
- Error: 0 84% 60% (absences, conflicts)

### B. Typography

**Font Families:**
- Primary: 'Inter' (Google Fonts) - clean, modern, excellent readability for UI
- Headers: 'Inter' with tighter letter-spacing (-0.02em)
- Data/Numbers: 'JetBrains Mono' (Google Fonts) - for times, dates, IDs

**Hierarchy:**
- H1: 2.5rem (40px), font-weight 700, line-height 1.2
- H2: 2rem (32px), font-weight 600, line-height 1.3
- H3: 1.5rem (24px), font-weight 600, line-height 1.4
- Body: 1rem (16px), font-weight 400, line-height 1.6
- Small/Caption: 0.875rem (14px), font-weight 400, line-height 1.5
- Button Text: 0.9375rem (15px), font-weight 500

### C. Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Component padding: p-4 to p-6
- Section spacing: py-12 to py-20
- Card gaps: gap-4 to gap-6
- Input spacing: p-3
- Button padding: px-6 py-3

**Grid System:**
- Container max-width: max-w-7xl (1280px)
- Main content: 2-column layout (sidebar + content area)
- Forms: Single column, max-w-2xl for readability
- Schedule cards: Grid with responsive columns (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

### D. Component Library

**Navigation:**
- Top navbar: Team logo/name, quick actions (Add Schedule, Notifications), profile menu
- Sidebar: Icon + text navigation (Dashboard, Schedules, Team, Venues, Settings)
- Breadcrumbs: For deep navigation paths

**Data Display:**
- Cards: Rounded corners (rounded-lg), subtle shadow (shadow-sm), hover lift effect
- Tables: Striped rows, sortable headers, action column with icons
- Calendar View: Month/week/day toggle, color-coded by category, click-to-create events
- List View: Dense schedule list with date grouping, sport icons, attendance indicators

**Forms & Inputs:**
- Text inputs: Rounded (rounded-md), clear focus states with primary color ring
- Select dropdowns: Custom styled with sport icons for sports selection
- Date/Time pickers: Integrated calendar overlay, time slots
- Multi-step forms: Progress indicator for club registration
- Toggle switches: For optional fields (start/end time)
- Text areas: For notes/remarks with character count

**Buttons:**
- Primary: Solid background with primary color, white text, rounded-md
- Secondary: Outline with primary color border
- Danger: Red for deletions
- Icon buttons: For quick actions (edit, delete, copy)
- FAB (Floating Action Button): Bottom-right corner for "Add Schedule"

**Overlays:**
- Modals: Centered, max-w-2xl, backdrop blur
- Slide-overs: From right for quick forms (Add Coach, Add Venue)
- Toast notifications: Top-right corner for confirmations/errors
- Dropdowns: For action menus and filters

**Status Indicators:**
- Badges: Pill-shaped for categories (学年), attendance status
- Progress bars: For form completion, team capacity
- Icons: Heroicons for consistent iconography (calendar, users, map-pin, clipboard)

### E. Visual Enhancements

**Illustrations/Images:**
- Empty states: Sport-themed illustrations when no data (no schedules yet, no venues)
- Sport icons: Baseball, soccer, basketball icons in registration and display
- Team ID display: Large, prominent ID card design when club is created

**Micro-interactions:**
- Button hover: Slight scale (scale-105), shadow increase
- Card hover: Lift effect with shadow-md
- Form validation: Real-time with inline messages
- Loading states: Skeleton screens for data loading
- Success animations: Checkmark animation on save

**Spacing & Rhythm:**
- Consistent vertical rhythm with py-8 between major sections
- Card grid spacing: gap-6 for breathability
- Form field spacing: space-y-4 for comfortable scanning
- Dashboard widget spacing: gap-4 to gap-6

### F. Page-Specific Designs

**Club Registration Flow:**
- Multi-step wizard (4 steps): Basic Info → Sport Selection → Owner Account → Confirmation
- Visual progress indicator at top
- Large sport selection cards with icons
- Success screen with generated Team ID prominently displayed

**Dashboard:**
- Top stats row: Upcoming events, team members, active coaches (3-column grid)
- Recent schedules section with cards
- Quick actions panel: Add Schedule, Add Coach, Manage Venues
- Calendar widget showing week view

**Schedule Management:**
- Calendar/List view toggle (tabs)
- Filter sidebar: By category, venue, date range
- Add Schedule button (prominent, top-right)
- Schedule cards: Date/time header, title, venue, category badge, attendance count, quick actions

**Venue & Category Management:**
- Simple CRUD interface with tables
- Add button triggers slide-over form
- Edit inline or in modal
- Delete with confirmation

---

## Implementation Notes

- Use Heroicons CDN for all icons
- Prioritize mobile responsiveness (coaches use phones on field)
- Implement dark mode toggle in profile menu
- Use skeleton loaders during data fetch
- Maintain consistent 8px spacing grid throughout
- All interactive elements have clear hover/focus states
- Forms include helpful placeholder text and validation messages in Japanese