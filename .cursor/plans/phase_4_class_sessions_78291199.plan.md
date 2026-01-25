---
name: Phase 4 Class Sessions
overview: Implement Class Sessions and Group Time Schedules to introduce time as a first-class concept—manual session creation, session status (scheduled/held/cancelled), linking sessions to groups/teachers/venues, session history (immutable), calendar/list views with filtering, and group flexible scheduling (one-time or recurring patterns with duration and edit-to-update-future-only).
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
  - id: schema-group-schedules
    content: Add schema/migration for group time schedules (one-time or recurring, weekly/twice-weekly, duration per session in hours, effectiveFrom for edit-to-update-future-only)
    status: pending
  - id: db-queries-group-schedules
    content: Add db/queries/group-schedules.ts with getGroupSchedule, upsertGroupSchedule, getScheduleSlots, and applyScheduleToFutureSessions (or generate sessions from schedule from date X)
    status: pending
  - id: api-group-schedule
    content: Create app/api/organizations/[id]/groups/[groupId]/schedule/route.ts with GET and PATCH; PATCH applies to future sessions only, historical sessions unchanged
    status: pending
  - id: translations-schedules
    content: Add Group schedule translation keys (one-time/recurring, weekly/twice weekly, duration, apply to future) to messages/es.json and messages/en.json
    status: pending
  - id: ui-group-schedule-management
    content: Add Group schedule management UI on group detail page—time schedule config (one-time/recurring), weekly/twice weekly options, duration per session (hours), edit to update future sessions only
    status: pending
isProject: false
---

# Phase 4 — Class Sessions Implementation Plan

## Overview

Phase 4 implements the Class Sessions system and **Group Time Schedules** to introduce time as a first-class concept. It includes:

- **Manual class session creation** and session status (scheduled / held / cancelled)
- **Linking sessions** to groups, teachers, and venues
- **Session history** (immutable)
- **Group time schedules**: groups can have time schedules (one-time or recurring); recurring options are weekly or twice-weekly sessions; duration per session (hours); schedule can be edited to update **future sessions only** (historical sessions remain unchanged)
- **UI**: calendar/list view at `/organizations/[id]/sessions`, filters, create session form, session detail page, session list/table, bulk status updates, and **group detail integration** including a **Group schedule management** section

**Deliverables (aligned with roadmap):**

- Everything important happens in time
- Groups have flexible scheduling (one-time or recurring patterns)

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

### Group Time Schedules (schema + queries)

2. **Schema migration** (new table(s) for group schedules)

- Groups can have **time schedules** (one-time or recurring).
- **Recurrence**: one-time, weekly (same day/time each week), or twice-weekly (two day/time slots per week).
- **Duration per session** in hours (stored and used when generating or validating sessions).
- **Edit to update future only**: each schedule (or slot) has an `effectiveFrom` (and optionally `effectiveTo`). When the user “edits schedule”, create new schedule rows or new effective range so that only sessions with `date >= effectiveFrom` are affected; historical sessions remain unchanged.

Proposed shape (to be refined in implementation):

- Option A: `group_schedule_slots` — `groupId`, `recurrence` (one_time | weekly | twice_weekly), `day_of_week` (1–7 or JSON array for twice-weekly), `start_time`, `duration_hours`, `effective_from` (date), `effective_to` (optional).
- Option B: `group_schedules` parent + `group_schedule_slots` for the actual slots; parent has `effective_from` / `effective_to` for “apply to future only” semantics.

3. **`db/queries/group-schedules.ts`** (new)

- `getGroupSchedule(groupId, organizationId)` — active schedule(s) for the group (respecting effectiveFrom/To).
- `getScheduleSlots(groupId, organizationId, fromDate?, toDate?)` — slots in a range for display or generation.
- `upsertGroupSchedule(groupId, organizationId, payload)` — create or update schedule; when “edit to update future only” is requested, end current effective range and insert new rows from the given date.
- `generateSessionsFromSchedule(groupId, organizationId, fromDate, toDate)` or `applyScheduleToFutureSessions(groupId, fromDate)` — generate or update class_sessions from the group’s schedule for the given range; only future/dynamic sessions are touched, historical ones unchanged.

All queries must enforce tenant isolation via `organizationId` and group membership.

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

5. **`app/api/organizations/[id]/groups/[groupId]/schedule/route.ts`** (new)

- `GET` - Return the group’s time schedule (one-time or recurring, weekly/twice-weekly, duration per session, effective range).
- `PATCH` - Create or update the group’s schedule. When the client requests “apply to future only”, the backend must only affect sessions with `date >= effectiveFrom`; historical sessions remain unchanged. Validation: recurrence type, day-of-week, start time, duration hours; ensure group and organization exist and tenant isolation is enforced.

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
- Add **Group schedule management** section (roadmap alignment):
- **Time schedule configuration**: one-time or recurring
- **Recurring schedule options**:
- Weekly sessions (same day and time each week)
- Twice-weekly sessions (two days/times per week)
- **Duration per session** (hours)
- **Edit behaviour**: “Apply to future sessions only” — when the user edits the schedule, only future sessions are updated; historical sessions remain unchanged. UI must make this explicit (e.g. checkbox or copy: “Update only future sessions”).

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
- **Group schedule** (for roadmap alignment): `GroupSchedule.title`, `GroupSchedule.oneTime`, `GroupSchedule.recurring`, `GroupSchedule.weekly`, `GroupSchedule.twiceWeekly`, `GroupSchedule.durationHours`, `GroupSchedule.applyToFutureOnly`, `GroupSchedule.effectiveFrom`, etc.

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

6. **Group Time Schedules (roadmap alignment):**

- **Recurrence**: one-time, weekly (one day/time), or twice-weekly (two day/time slots). Validate day-of-week and times.
- **Duration per session**: required, in hours; used when generating or displaying sessions.
- **Edit to update future only**: any PATCH or “apply schedule” must only create/update sessions with `date >= effectiveFrom`; never alter sessions in the past. Historical sessions remain unchanged.
- **Effective range**: new or updated schedule rows use `effectiveFrom` (and optionally `effectiveTo`); overlapping or superseded ranges must be handled so “apply to future” is unambiguous.

## Testing Considerations

Following Phase 2 patterns, tests should be added for:

- Session CRUD operations
- Status change validations
- Filter functionality
- Date range queries
- Tenant isolation for sessions
- Relationship validations (group, teacher, venue)
- **Group schedules:** schedule CRUD, “apply to future only” (no changes to past sessions), recurrence rules (weekly/twice-weekly), tenant isolation for schedule endpoints

## Implementation Order

1. **Database queries** (`db/queries/class-sessions.ts`) — done
2. **API routes** (sessions CRUD, status endpoint, group sessions) — done
3. **Translations** (Sessions keys in both language files) — done
4. **Sessions list page** (`/sessions/page.tsx`) — done
5. **Session detail page** (`/sessions/[sessionId]/page.tsx`) — done
6. **Group detail page integration** (sessions section + quick create) — done
7. **Filtering and search** (list page) — done
8. **Bulk actions** (optional enhancement)
9. **Group time schedules (roadmap alignment):**

- Schema migration for group schedules (one-time/recurring, weekly/twice-weekly, duration, effectiveFrom/To)
- `db/queries/group-schedules.ts` (get, upsert, apply-to-future)
- `app/api/organizations/[id]/groups/[groupId]/schedule/route.ts` (GET, PATCH with “future only” semantics)
- Translations for Group schedule (see Internationalization)
- Group schedule management UI on group detail page (config, recurring options, duration, “apply to future only”)

10. **Calendar view** (month/week/day) — optional; list view satisfies “calendar or list” in roadmap

## Files Summary

### New Files (existing + roadmap-aligned)

- `db/queries/class-sessions.ts`
- `app/api/organizations/[id]/sessions/route.ts`
- `app/api/organizations/[id]/sessions/[sessionId]/route.ts`
- `app/api/organizations/[id]/sessions/[sessionId]/status/route.ts`
- `app/api/organizations/[id]/groups/[groupId]/sessions/route.ts`
- `app/[locale]/organizations/[id]/sessions/page.tsx`
- `app/[locale]/organizations/[id]/sessions/[sessionId]/page.tsx`
- **Group time schedules (roadmap):**
- Drizzle migration for group schedule table(s)
- `db/queries/group-schedules.ts`
- `app/api/organizations/[id]/groups/[groupId]/schedule/route.ts`

### Modified Files

- `messages/es.json` - Add Sessions translations; add Group schedule translations
- `messages/en.json` - Add Sessions translations; add Group schedule translations
- `app/[locale]/organizations/[id]/groups/[groupId]/page.tsx` - Add sessions section and Group schedule management UI
- `db/schema.ts` - Add group schedule table(s) when implementing schema migration

### Optional Enhancements (Future)

- Calendar view component (month/week/day views) — roadmap accepts “list view” as sufficient
- Session export functionality (CSV)
- Session templates beyond built-in recurring (e.g. custom templates)
- Session duplication feature