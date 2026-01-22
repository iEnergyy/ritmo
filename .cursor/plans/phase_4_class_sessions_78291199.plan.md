---
name: Phase 4 Class Sessions
overview: Implement Class Sessions functionality to introduce time as a first-class concept, including manual session creation, status management, calendar/list views, filtering, and integration with groups, teachers, and venues.
todos:
  - id: db-queries-sessions
    content: "Create db/queries/class-sessions.ts with CRUD operations: getSessionsByOrganization, getSessionById, getSessionsByGroup, getSessionsByTeacher, createSession, updateSession, updateSessionStatus, deleteSession"
    status: completed
  - id: api-sessions-list
    content: Create app/api/organizations/[id]/sessions/route.ts with GET (list with filters) and POST (create) endpoints
    status: completed
  - id: api-sessions-detail
    content: Create app/api/organizations/[id]/sessions/[sessionId]/route.ts with GET (detail), PATCH (update), and DELETE endpoints
    status: completed
  - id: api-sessions-status
    content: Create app/api/organizations/[id]/sessions/[sessionId]/status/route.ts with PATCH endpoint for status changes
    status: completed
  - id: api-group-sessions
    content: Create app/api/organizations/[id]/groups/[groupId]/sessions/route.ts with GET (list group sessions) and POST (create session for group) endpoints
    status: completed
  - id: translations
    content: Add Sessions translation keys to messages/es.json and messages/en.json
    status: completed
  - id: ui-sessions-list
    content: Create app/[locale]/organizations/[id]/sessions/page.tsx with sessions list table, filters (group, teacher, venue, date range, status), create/edit dialogs, bulk actions, and status management
    status: completed
  - id: ui-session-detail
    content: Create app/[locale]/organizations/[id]/sessions/[sessionId]/page.tsx with session info, status change interface, edit dialog, and attendance records placeholder
    status: completed
  - id: ui-group-sessions-integration
    content: Modify app/[locale]/organizations/[id]/groups/[groupId]/page.tsx to add sessions section with list and quick creation
    status: completed
---

# Phase 4 — Class Sessions Implementation Plan

## Overview

Phase 4 implements the Class Sessions system to introduce time as a first-class concept. This includes manual session creation, status management (scheduled/held/cancelled), linking sessions to groups, teachers, and venues, and comprehensive UI for viewing and managing sessions.

## Architecture

The implementation follows existing patterns from Phase 1 and Phase 3:

- **API Routes**: `/api/organizations/[id]/sessions/*`
- **Query Functions**: `db/queries/class-sessions.ts`
- **UI Pages**: `app/[locale]/organizations/[id]/sessions/page.tsx` and `app/[locale]/organizations/[id]/sessions/[sessionId]/page.tsx`
- **Components**: Reuse shadcn/ui components (Dialog, Table, Select, Badge, Calendar, etc.)

## Database Layer

### Files to Create

1. **`db/queries/class-sessions.ts`** (new)

- `getSessionsByOrganization(organizationId, filters?)` - List sessions with optional filters (group, teacher, venue, date range, status)
- `getSessionById(organizationId, sessionId)` - Get single session with related entities (group, teacher, venue)
- `getSessionsByGroup(groupId, organizationId, filters?)` - Get all sessions for a specific group
- `getSessionsByTeacher(teacherId, organizationId, filters?)` - Get all sessions for a specific teacher
- `createSession(data)` - Create new session
- `updateSession(sessionId, data)` - Update session details (date, time, group, teacher, venue)
- `updateSessionStatus(sessionId, status)` - Update session status (scheduled/held/cancelled)
- `deleteSession(sessionId)` - Delete session (with validation - sessions should generally be immutable, but allow deletion for corrections)

**Key considerations:**

- Sessions are immutable by design (history preservation)
- Status changes should be logged/auditable
- Filtering by date range is critical for calendar views
- Joins with groups, teachers, and venues for complete session info

## API Layer

### Files to Create

1. **`app/api/organizations/[id]/sessions/route.ts`** (new)

- `GET` - List all sessions for organization (with optional filters: group, teacher, venue, dateFrom, dateTo, status)
- `POST` - Create new session

2. **`app/api/organizations/[id]/sessions/[sessionId]/route.ts`** (new)

- `GET` - Get single session with related entities
- `PATCH` - Update session (date, time, group, teacher, venue)
- `DELETE` - Delete session (with confirmation - should be rare)

3. **`app/api/organizations/[id]/sessions/[sessionId]/status/route.ts`** (new)

- `PATCH` - Update session status (scheduled/held/cancelled)

4. **`app/api/organizations/[id]/groups/[groupId]/sessions/route.ts`** (new)

- `GET` - List all sessions for a specific group
- `POST` - Create session for a specific group (convenience endpoint)

All API routes must:

- Use `enforceTenantIsolation` for security
- Validate organization membership
- Return appropriate error responses
- Follow existing error handling patterns
- Validate required fields (teacherId, date, status)
- Validate optional relationships (group, venue must belong to organization)

## UI Layer

### Files to Create

1. **`app/[locale]/organizations/[id]/sessions/page.tsx`** (new)

- **List/Table View:**
- Sessions table with columns: Date, Time, Group, Teacher, Venue, Status
- Sortable columns (date, group, teacher, status)
- Status badges (scheduled/held/cancelled) with color coding
- Quick status change actions (mark as held, cancel)
- Link to session detail page

- **Filters:**
- Group filter (dropdown)
- Teacher filter (dropdown)
- Venue filter (dropdown)
- Date range filter (date picker with from/to)
- Status filter (scheduled/held/cancelled/all)

- **Create Session Dialog:**
- Date picker (required)
- Time selection (start/end) - optional but recommended
- Group selection (optional, for group classes)
- Teacher selection (required)
- Venue selection (optional)
- Status selection (default: scheduled)

- **Bulk Actions:**
- Bulk status updates (select multiple sessions, change status)
- Export sessions (CSV) - optional for Phase 4

2. **`app/[locale]/organizations/[id]/sessions/[sessionId]/page.tsx`** (new)

- **Session Detail View:**
- Session info card showing:
- Date and time
- Group (if linked) with link to group page
- Teacher with link to teacher page
- Venue (if linked) with link to venue page
- Status with change interface
- Created date (immutable history indicator)
- Status change interface:
- Buttons to change status (mark as held, cancel, reschedule)
- Confirmation dialogs for status changes
- Linked attendance records section:
- Show attendance records if any exist (Phase 5 will implement this fully)
- Placeholder for future attendance integration
- Edit session dialog:
- Update date, time, group, teacher, venue
- Cannot change status from this dialog (use status endpoint)
- Delete session action:
- AlertDialog confirmation
- Warning about immutability and history preservation

3. **Modify `app/[locale]/organizations/[id]/groups/[groupId]/page.tsx`**

- Add "Sessions" section:
- List of sessions for this group
- Quick session creation button (pre-fills group)
- Link to full sessions page with group filter applied
- Show upcoming sessions, recent sessions, or all sessions with toggle

### UI Components to Reuse/Create

- **Status Badge**: Use shadcn Badge component with color coding:
- Scheduled: blue/yellow
- Held: green
- Cancelled: red/gray
- **Date/Time Display**: Format dates and times consistently
- **Session Form**: Dialog with all session fields
- **Status Change Confirmation**: AlertDialog showing impact preview
- **Calendar View**: Optional - can use shadcn Calendar component for month view (can be Phase 4.1 if time-constrained)
- **Filter Bar**: Reusable filter component with dropdowns and date pickers

## Internationalization

### Files to Modify

1. **`messages/es.json`** - Add Spanish translations for:

- Sessions page titles, buttons, labels
- Status labels (scheduled/held/cancelled)
- Session form labels
- Error messages
- Confirmation dialogs
- Filter labels

2. **`messages/en.json`** - Add English translations (same keys)

Translation keys needed:

- `Sessions.title`, `Sessions.createButton`, `Sessions.status.scheduled`, etc.
- `SessionDetail.title`, `SessionDetail.info`, etc.
- `SessionForm.date`, `SessionForm.time`, `SessionForm.group`, etc.
- `SessionStatus.markAsHeld`, `SessionStatus.cancel`, etc.

## Business Logic

### Key Validations

1. **Session Creation:**

- Teacher is required
- Date is required
- Group, if provided, must belong to organization
- Venue, if provided, must belong to organization
- Teacher must belong to organization
- Start time should be before end time (if both provided)

2. **Session Status Changes:**

- Status transitions should be logical (e.g., can't mark cancelled as held)
- Status changes are immutable (history preservation)
- Show confirmation for status changes

3. **Session Updates:**

- Can update date, time, group, teacher, venue
- Status changes should use dedicated status endpoint
- Updates should preserve history (createdAt never changes)

4. **Session Deletion:**

- Should be rare (sessions are immutable)
- Warn about data loss
- Check for linked attendance records (Phase 5)
- Require confirmation

5. **Date/Time Handling:**

- Store dates as date type
- Store times as time type
- Handle timezone considerations (use organization timezone if available, or UTC)
- Format dates/times consistently in UI

## Testing Considerations

Following Phase 2 patterns, tests should be added for:

- Session CRUD operations
- Status change validations
- Filter functionality
- Date range queries
- Tenant isolation for sessions
- Relationship validations (group, teacher, venue)

## Implementation Order

1. **Database queries** (`db/queries/class-sessions.ts`)
2. **API routes** (sessions CRUD, then status endpoint)
3. **Translations** (add keys to both language files)
4. **Sessions list page** (`/sessions/page.tsx`)
5. **Session detail page** (`/sessions/[sessionId]/page.tsx`)
6. **Group detail page integration** (add sessions section)
7. **Filtering and search** (enhance list page)
8. **Bulk actions** (optional enhancement)

## Files Summary

### New Files (8)

- `db/queries/class-sessions.ts`
- `app/api/organizations/[id]/sessions/route.ts`
- `app/api/organizations/[id]/sessions/[sessionId]/route.ts`
- `app/api/organizations/[id]/sessions/[sessionId]/status/route.ts`
- `app/api/organizations/[id]/groups/[groupId]/sessions/route.ts`
- `app/[locale]/organizations/[id]/sessions/page.tsx`
- `app/[locale]/organizations/[id]/sessions/[sessionId]/page.tsx`

### Modified Files (3)

- `messages/es.json` - Add Sessions translations
- `messages/en.json` - Add Sessions translations
- `app/[locale]/organizations/[id]/groups/[groupId]/page.tsx` - Add sessions section

### Optional Enhancements (Future)

- Calendar view component (month/week/day views)
- Session export functionality (CSV)
- Session templates for recurring sessions
- Session duplication feature