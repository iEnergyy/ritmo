---
name: Phase 3 Groups & Membership
overview: Implement Groups & Membership functionality to model ongoing classes accurately, including group lifecycle management, student-group enrollment with date ranges, multi-group enrollment support, and comprehensive UI for managing groups and enrollments.
todos:
  - id: db-queries-groups
    content: "Create db/queries/groups.ts with CRUD operations: getGroupsByOrganization, getGroupById, createGroup, updateGroup, deleteGroup"
    status: completed
  - id: db-queries-enrollments
    content: "Create db/queries/student-groups.ts with enrollment operations: getEnrollmentsByGroup, getEnrollmentsByStudent, createEnrollment, updateEnrollment, endEnrollment, moveStudentBetweenGroups"
    status: completed
  - id: api-groups-list
    content: Create app/api/organizations/[id]/groups/route.ts with GET (list) and POST (create) endpoints
    status: completed
    dependencies:
      - db-queries-groups
  - id: api-groups-detail
    content: Create app/api/organizations/[id]/groups/[groupId]/route.ts with GET (detail), PATCH (update), and DELETE endpoints
    status: completed
    dependencies:
      - db-queries-groups
  - id: api-groups-status
    content: Create app/api/organizations/[id]/groups/[groupId]/status/route.ts with PATCH endpoint for status changes
    status: completed
    dependencies:
      - db-queries-groups
  - id: api-enrollments-group
    content: Create app/api/organizations/[id]/groups/[groupId]/enrollments/route.ts with GET (list) and POST (create) endpoints
    status: completed
    dependencies:
      - db-queries-enrollments
  - id: api-enrollments-detail
    content: Create app/api/organizations/[id]/groups/[groupId]/enrollments/[enrollmentId]/route.ts with PATCH (update) and DELETE (end enrollment) endpoints
    status: completed
    dependencies:
      - db-queries-enrollments
  - id: api-enrollments-student
    content: Create app/api/organizations/[id]/students/[studentId]/enrollments/route.ts with GET (list student groups) and POST endpoints, plus move/route.ts for moving between groups
    status: completed
    dependencies:
      - db-queries-enrollments
  - id: translations
    content: Add Groups and Enrollments translation keys to messages/es.json and messages/en.json
    status: completed
  - id: ui-groups-list
    content: Create app/[locale]/organizations/[id]/groups/page.tsx with groups list table, create/edit dialogs, status management, and search/filter
    status: completed
    dependencies:
      - api-groups-list
      - api-groups-detail
      - api-groups-status
      - translations
  - id: ui-group-detail
    content: Create app/[locale]/organizations/[id]/groups/[groupId]/page.tsx with group info, enrolled students list, enrollment management, and status controls
    status: completed
    dependencies:
      - api-groups-detail
      - api-enrollments-group
      - api-enrollments-detail
      - translations
  - id: ui-student-enrollments
    content: Create or modify app/[locale]/organizations/[id]/students/[studentId]/page.tsx to show student groups and enrollment history
    status: completed
    dependencies:
      - api-enrollments-student
      - translations
---

# Phase 3 — Groups & Membership Implementation Plan

## Overview

Phase 3 implements the Groups & Membership system to model ongoing classes accurately. This includes group lifecycle management (active/paused/closed), student-group enrollment with date ranges, multi-group enrollment support, and comprehensive UI for managing groups and enrollments.

## Architecture

The implementation follows existing patterns from Phase 1 (students, teachers, venues):

- **API Routes**: `/api/organizations/[id]/groups/*` and `/api/organizations/[id]/groups/[groupId]/enrollments/*`
- **Query Functions**: `db/queries/groups.ts` and `db/queries/student-groups.ts`
- **UI Pages**: `app/[locale]/organizations/[id]/groups/page.tsx` and `app/[locale]/organizations/[id]/groups/[groupId]/page.tsx`
- **Components**: Reuse shadcn/ui components (Dialog, Table, Select, Badge, etc.)

## Database Layer

### Files to Create/Modify

1. **`db/queries/groups.ts`** (new)

- `getGroupsByOrganization(organizationId, search?, status?)` - List groups with optional filters
- `getGroupById(organizationId, groupId)` - Get single group with venue info
- `createGroup(data)` - Create new group
- `updateGroup(groupId, data)` - Update group details and status
- `deleteGroup(groupId)` - Delete group (with validation for existing enrollments)

2. **`db/queries/student-groups.ts`** (new)

- `getEnrollmentsByGroup(groupId, organizationId)` - Get all enrollments for a group with student info
- `getEnrollmentsByStudent(studentId, organizationId)` - Get all groups a student belongs to
- `getActiveEnrollmentsByGroup(groupId, organizationId, date?)` - Get active enrollments (endDate is null or in future)
- `createEnrollment(data)` - Create student-group enrollment
- `updateEnrollment(enrollmentId, data)` - Update enrollment dates
- `endEnrollment(enrollmentId, endDate)` - Set end date (soft remove)
- `moveStudentBetweenGroups(studentId, fromGroupId, toGroupId, startDate)` - End current and create new enrollment

## API Layer

### Files to Create

1. **`app/api/organizations/[id]/groups/route.ts`** (new)

- `GET` - List all groups for organization (with optional status filter)
- `POST` - Create new group

2. **`app/api/organizations/[id]/groups/[groupId]/route.ts`** (new)

- `GET` - Get single group with venue info
- `PATCH` - Update group (name, venue, status)
- `DELETE` - Delete group (only if no enrollments exist)

3. **`app/api/organizations/[id]/groups/[groupId]/status/route.ts`** (new)

- `PATCH` - Update group status with validation

4. **`app/api/organizations/[id]/groups/[groupId]/enrollments/route.ts`** (new)

- `GET` - List all enrollments for a group (with student info)
- `POST` - Create new enrollment (add student to group)

5. **`app/api/organizations/[id]/groups/[groupId]/enrollments/[enrollmentId]/route.ts`** (new)

- `PATCH` - Update enrollment dates
- `DELETE` - End enrollment (set endDate)

6. **`app/api/organizations/[id]/students/[studentId]/enrollments/route.ts`** (new)

- `GET` - Get all groups a student belongs to (current and historical)
- `POST` - Create enrollment (alternative entry point)

7. **`app/api/organizations/[id]/students/[studentId]/enrollments/move/route.ts`** (new)

- `POST` - Move student between groups (end current, start new)

All API routes must:

- Use `enforceTenantIsolation` for security
- Validate organization membership
- Return appropriate error responses
- Follow existing error handling patterns

## UI Layer

### Files to Create

1. **`app/[locale]/organizations/[id]/groups/page.tsx`** (new)

- Groups list table with status badges (active/paused/closed)
- Search/filter by name and status
- Create group dialog (name, venue selection, initial status)
- Edit group dialog
- Delete group confirmation (with enrollment check)
- Status change actions (activate, pause, close) with confirmation
- Link to group detail page

2. **`app/[locale]/organizations/[id]/groups/[groupId]/page.tsx`** (new)

- Group detail view showing:
    - Group info card (name, venue, status, created date)
    - Enrolled students list with date ranges
    - Student enrollment history (all enrollments, including ended)
    - Add student to group button/dialog
    - Edit enrollment dates
    - Remove student from group (set end date)
- Status management section with change buttons

3. **`app/[locale]/organizations/[id]/students/[studentId]/page.tsx`** (new or modify existing)

- Student profile view showing:
    - Student basic info
    - All groups student belongs to (current and historical)
    - Enrollment date ranges per group
    - Add to group action
    - Move between groups action
    - End enrollment action

### UI Components to Reuse/Create

- **Status Badge**: Use shadcn Badge component with color coding (green=active, yellow=paused, gray=closed)
- **Date Range Display**: Show "Start Date - End Date" or "Start Date - Present" for active enrollments
- **Enrollment Form**: Dialog with student select, start date picker, optional end date
- **Move Student Dialog**: Select source group, target group, and start date
- **Status Change Confirmation**: AlertDialog showing impact preview (e.g., "This will affect X active enrollments")

## Internationalization

### Files to Modify

1. **`messages/es.json`** - Add Spanish translations for:

- Groups page titles, buttons, labels
- Status labels (active/paused/closed)
- Enrollment form labels
- Error messages
- Confirmation dialogs

2. **`messages/en.json`** - Add English translations (same keys)

Translation keys needed:

- `Groups.title`, `Groups.createButton`, `Groups.status.active`, etc.
- `Enrollments.addStudent`, `Enrollments.dateRange`, etc.
- `GroupDetail.title`, `GroupDetail.enrolledStudents`, etc.

## Business Logic

### Key Validations

1. **Group Status Changes**:

- Validate no active enrollments before closing (or warn user)
- Allow status changes but show impact preview

2. **Enrollment Date Ranges**:

- Start date must be valid date
- End date must be after start date (if provided)
- Prevent overlapping enrollments for same student-group pair
- When moving students: automatically end current enrollment and create new one

3. **Multi-Group Enrollment**:

- Students can belong to multiple groups simultaneously
- Each enrollment has independent date range
- No restrictions on overlapping date ranges across different groups

4. **Group Deletion**:

- Only allow deletion if no enrollments exist (or provide cascade option)
- Show enrollment count in delete confirmation

## Testing Considerations

Following Phase 2 patterns, tests should be added for:

- Group CRUD operations
- Enrollment CRUD operations
- Date range validations
- Multi-group enrollment scenarios
- Status change validations
- Tenant isolation for groups and enrollments

## Implementation Order

1. **Database queries** (`db/queries/groups.ts`, `db/queries/student-groups.ts`)
2. **API routes** (groups CRUD, then enrollments)
3. **Translations** (add keys to both language files)
4. **Groups list page** (`/groups/page.tsx`)
5. **Group detail page** (`/groups/[groupId]/page.tsx`)
6. **Student profile integration** (show enrollments)
7. **Status management UI** (status change buttons with confirmations)

## Files Summary

### New Files (15)

- `db/queries/groups.ts`
- `db/queries/student-groups.ts`
- `app/api/organizations/[id]/groups/route.ts`
- `app/api/organizations/[id]/groups/[groupId]/route.ts`
- `app/api/organizations/[id]/groups/[groupId]/status/route.ts`
- `app/api/organizations/[id]/groups/[groupId]/enrollments/route.ts`
- `app/api/organizations/[id]/groups/[groupId]/enrollments/[enrollmentId]/route.ts`
- `app/api/organizations/[id]/students/[studentId]/enrollments/route.ts`
- `app/api/organizations/[id]/students/[studentId]/enrollments/move/route.ts`
- `app/[locale]/organizations/[id]/groups/page.tsx`
- `app/[locale]/organizations/[id]/groups/[groupId]/page.tsx`
- `app/[locale]/organizations/[id]/students/[studentId]/page.tsx` (or modify existing)

### Modified Files (2)

- `messages/es.json` - Add Groups and Enrollments translations
- `messages/en.json` - Add Groups and Enrollments translations