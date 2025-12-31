🎶 Cadence

Cadence is a multi-tenant CRM, administration, and intelligence platform for dance schools and independent teachers.

It helps organizations manage students, groups, classes, attendance, payments (via bank transfer), and teacher payouts — while unlocking powerful operational insights through data and AI.

🌍 Who is Cadence for?

Cadence is designed for two primary organization types:

🏫 Dance Schools

Multiple groups and schedules

Multiple teachers and venues

Students may belong to multiple groups

Admins, teachers, staff, parents

🧑‍🏫 Independent Teachers

Teach solo or at multiple venues

Run group classes and private sessions

Need strong organization with minimal overhead

Often operate without traditional “school” structure

Both are modeled cleanly and equally using a shared multitenant architecture.

🧠 Core Philosophy

Cadence is built around real-world events, not abstractions.

Attendance, payments, and payouts are derived from what actually happened, not what was planned.

This allows Cadence to evolve into an intelligence platform, not just a CRUD system.

🏗️ Architecture Overview
🌐 Internationalization

Built with next-intl

Locale-based routing (URL prefixes: `/es/`, `/en/`)

Default locale: Spanish (es)

Supported locales: Spanish, English

Language switcher in navigation

All UI text is translatable via JSON message files

🔐 Authentication & Multitenancy

Uses BetterAuth

Organizations are tenants

One database, strict tenant isolation

Users can belong to multiple organizations

Students and parents may exist without logging in.

🏢 Organizations

An Organization is the core tenant.

Organization types:

school

independent_teacher

A dance school = one organization
A solo teacher = one organization
Same schema, different behavior via configuration.

👥 Users & Roles

Users authenticate via BetterAuth and may have roles:

admin

teacher

staff

Users can:

Belong to multiple organizations

Have different roles per organization

Be linked to a teacher profile (optional)

🎓 Students

Students are not required to have user accounts

Can belong to:

Multiple groups

Multiple organizations

Have full attendance and payment history

Students can be registered via:

Admin panel

Public registration forms

🧑‍🏫 Teachers

Teachers can:

Be platform users or offline profiles

Teach group classes and private sessions

Be paid using different methodologies

💰 Teacher Payment Models

Fixed monthly salary

Per-class payment

Per-head (based on attendance)

Payment calculation is derived from actual class sessions and attendance.

🏢 Venues

Venues are first-class entities:

Used by schools with multiple locations

Critical for independent teachers who move between studios

A class session always knows where it happened.

👯 Groups (Classes)

Groups represent ongoing classes, not specific events.

Lifecycle states:

Active

Paused

Closed

Students can join or leave at any time

Historical data is preserved

📅 Class Sessions (Key Concept)

A Class Session represents a real class that occurred on a specific date.

Group → generates → Class Sessions → record Attendance

Sessions:

Exist even if cancelled

Are never deleted

Are the foundation for:

Attendance

Teacher payouts

Analytics

✅ Attendance

Attendance is a first-class domain, not a checkbox.

Recorded per student, per class session

Statuses:

Present

Absent

Excused

Late

Attendance drives:

Teacher pay

Student eligibility

Retention analytics

Dropout detection

🧑‍🏫 Private Classes

Private sessions are modeled separately:

One teacher

One student

One date

Duration-based

Attendance is implicit if the session is held.

💳 Payments (Bank Transfer Friendly)

Cadence does not process payments.

Instead, it supports:

Monthly payment tracking

Receipt uploads

Payment reminders

Overdue detection

This matches how many dance schools and teachers operate in real life.

📊 Intelligence Platform Vision

Because Cadence models events, attendance, and history correctly, it enables AI-driven insights such as:

Dropout risk prediction

Revenue forecasting

Teacher utilization analysis

Attendance anomaly detection

Late payment prediction

Optimal class sizing

AI is an evolution, not a bolt-on.

🧩 Tech Stack

TypeScript

Next.js 16 (App Router)

next-intl (Internationalization)

Drizzle ORM

PostgreSQL

BetterAuth (Organization Plugin)

Event-driven domain design

AI-ready data modeling

📐 Initial Schema

The initial database schema represents the core domain model:

**Note:** The actual implementation uses BetterAuth's built-in tables (`user`, `organization`, `member`, `session`, `account`, `verification`, `invitation`) with text-based IDs. The domain entities (students, teachers, venues, groups, etc.) use UUIDs and reference BetterAuth's `organization` table. The schema below represents the conceptual domain model.

```typescript
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  date,
  time,
  numeric,
} from "drizzle-orm/pg-core";

/* ----------------------------------
 ENUMS
---------------------------------- */

export const organizationTypeEnum = pgEnum("organization_type", [
  "school",
  "independent_teacher",
]);

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "teacher",
  "staff",
]);

export const groupStatusEnum = pgEnum("group_status", [
  "active",
  "paused",
  "closed",
]);

export const classSessionStatusEnum = pgEnum("class_session_status", [
  "scheduled",
  "held",
  "cancelled",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "excused",
  "late",
]);

export const teacherPaymentTypeEnum = pgEnum("teacher_payment_type", [
  "fixed_monthly",
  "per_head",
  "per_class",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "overdue",
]);

/* ----------------------------------
 ORGANIZATIONS (BetterAuth tenant)
---------------------------------- */

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: organizationTypeEnum("type").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 USERS (AUTH USERS)
---------------------------------- */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 ORGANIZATION MEMBERS
---------------------------------- */

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().defaultRandom(),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),

  role: userRoleEnum("role").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 STUDENTS (CAN EXIST WITHOUT USER)
---------------------------------- */

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),

  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 TEACHERS
---------------------------------- */

export const teachers = pgTable("teachers", {
  id: uuid("id").primaryKey().defaultRandom(),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),

  userId: uuid("user_id").references(() => users.id),

  fullName: text("full_name").notNull(),

  paymentType: teacherPaymentTypeEnum("payment_type").notNull(),
  monthlyRate: numeric("monthly_rate"),
  ratePerHead: numeric("rate_per_head"),
  ratePerClass: numeric("rate_per_class"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 VENUES (IMPORTANT FOR SOLO TEACHERS)
---------------------------------- */

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),

  name: text("name").notNull(),
  address: text("address"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 GROUPS (CLASSES)
---------------------------------- */

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),

  venueId: uuid("venue_id").references(() => venues.id),

  name: text("name").notNull(),
  status: groupStatusEnum("status").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 STUDENT ↔ GROUP (WITH DATE RANGE)
---------------------------------- */

export const studentGroups = pgTable("student_groups", {
  id: uuid("id").primaryKey().defaultRandom(),

  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),

  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id),

  startDate: date("start_date").notNull(),
  endDate: date("end_date"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 CLASS SESSIONS (REAL EVENTS)
---------------------------------- */

export const classSessions = pgTable("class_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),

  groupId: uuid("group_id").references(() => groups.id),
  venueId: uuid("venue_id").references(() => venues.id),

  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id),

  date: date("date").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),

  status: classSessionStatusEnum("status").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 ATTENDANCE
---------------------------------- */

export const attendanceRecords = pgTable("attendance_records", {
  id: uuid("id").primaryKey().defaultRandom(),

  classSessionId: uuid("class_session_id")
    .notNull()
    .references(() => classSessions.id),

  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),

  status: attendanceStatusEnum("status").notNull(),

  markedAt: timestamp("marked_at").defaultNow().notNull(),
});

/* ----------------------------------
 PRIVATE CLASSES
---------------------------------- */

export const privateSessions = pgTable("private_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),

  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id),

  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),

  venueId: uuid("venue_id").references(() => venues.id),

  date: date("date").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),

  status: classSessionStatusEnum("status").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 STUDENT PAYMENTS (BANK TRANSFER)
---------------------------------- */

export const studentPayments = pgTable("student_payments", {
  id: uuid("id").primaryKey().defaultRandom(),

  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),

  month: date("month").notNull(),

  amount: numeric("amount").notNull(),
  receiptUrl: text("receipt_url"),

  status: paymentStatusEnum("status").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 TEACHER PAYOUTS
---------------------------------- */

export const teacherPayouts = pgTable("teacher_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),

  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),

  month: date("month").notNull(),

  totalAmount: numeric("total_amount").notNull(),

  status: paymentStatusEnum("status").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

🗺️ Roadmap (Atomic Phases)

Each phase is independently shippable and reduces real-world pain.

**Current Status:** Phase 0 is ~95% complete. Core infrastructure (auth, database, organization management, internationalization, tenant isolation) is in place. Schema definitions for all domain entities are complete. Organization member management UI is implemented. UI/API implementations for students, teachers, venues, and groups are pending.

**Phase 0 — Groundwork**

Goal: make the system safe to build on

- [x] Project scaffolding (repo, linting, env)
- [x] PostgreSQL + Drizzle setup
- [x] BetterAuth integration
- [x] Organization (tenant) creation - UI and API implemented
- [x] Organization types:
  - [x] school
  - [x] independent_teacher
- [x] Basic role system (admin / teacher / staff) - Fully implemented: Schema (`organizationMembers` table), API routes, and UI (`/organizations/[id]/members`)
- [x] Internationalization (i18n) - Implemented with next-intl, locale-based routing, Spanish (default) and English support
- [x] Tenant isolation enforcement - Implemented: `enforceTenantIsolation` function used in all organization API routes (`/api/organizations/*`)
- [x] Organization member management - Fully implemented: UI for inviting members, managing roles, removing members, viewing pending invitations
- [~] Multi-tenant login via subdomain - Partially implemented: Middleware exists for subdomain-based tenant routing (`middleware.ts`), but may need additional client-side handling

**UI Expectations:**
- [x] Organization creation form with type selection (school/independent_teacher)
- [x] Organization member management page (`/organizations/[id]/members`) with:
  - [x] Member list with roles
  - [x] Invite member form (email + role selection)
  - [x] Role change interface
  - [x] Remove member action
  - [x] Pending invitations list
- [x] Organization switcher component in navigation
- [x] Language switcher in navigation
- [x] Sign in/sign up pages with locale support
- [x] Dashboard page with organization context

Deliverable:
- [x] Secure, multi-tenant foundation (Core infrastructure complete: auth, org creation, i18n, tenant isolation, member management. Subdomain routing partially implemented)

**Phase 1 — Core Actors**

Goal: represent real people and places

- [x] Student entity (no-login support) - Schema defined in `db/schema.ts`, UI/API pending
- [x] Teacher entity (user-linked or standalone) - Schema defined in `db/schema.ts`, UI/API pending
- [x] Venue management - Schema defined in `db/schema.ts`, UI/API pending
- [x] Organization member management - Fully implemented: Schema (Better Auth `member` table + custom `organizationMembers` table), API routes, and UI (`/organizations/[id]/members`)
- [ ] Public student registration form (minimal) - Not yet implemented
- [x] i18n (internationalization) - Implemented with next-intl, supports Spanish (default) and English with locale-based routing

**UI Expectations:**
- [ ] Students management page (`/organizations/[id]/students`) with:
  - [ ] Student list (table/cards) with search and filters
  - [ ] Create student form (full name, email, phone)
  - [ ] Edit student details
  - [ ] View student profile with basic info
  - [ ] Delete/archive student action
- [ ] Teachers management page (`/organizations/[id]/teachers`) with:
  - [ ] Teacher list with payment type indicators
  - [ ] Create teacher form (full name, link to user account optional, payment type and rates)
  - [ ] Edit teacher details and payment configuration
  - [ ] View teacher profile
  - [ ] Link/unlink teacher to user account
- [ ] Venues management page (`/organizations/[id]/venues`) with:
  - [ ] Venue list
  - [ ] Create venue form (name, address)
  - [ ] Edit venue details
  - [ ] Delete venue action
- [ ] Public student registration form (minimal, accessible without login):
  - [ ] Simple form with student info
  - [ ] Organization selection or auto-assignment
  - [ ] Success confirmation

Deliverable:
- [~] Real-world entities represented correctly (Schema complete for all entities. Organization member management fully implemented. Students, teachers, and venues: schema only, UI/API pending)

**Phase 2 — Groups & Membership**

Goal: model ongoing classes accurately

- [ ] Group lifecycle (active / paused / closed)
- [ ] Student ↔ group membership with date ranges
- [ ] Move students between groups
- [ ] Multi-group enrollment
- [ ] Group-level views

**UI Expectations:**
- [ ] Groups management page (`/organizations/[id]/groups`) with:
  - [ ] Group list with status indicators (active/paused/closed)
  - [ ] Create group form (name, venue selection, initial status)
  - [ ] Edit group details and status
  - [ ] Group detail page showing:
    - [ ] Group info (name, venue, status, dates)
    - [ ] Enrolled students list with date ranges
    - [ ] Student enrollment history
- [ ] Student enrollment interface:
  - [ ] Add student to group form (student selection, start date, optional end date)
  - [ ] Edit enrollment dates
  - [ ] Remove student from group (sets end date)
  - [ ] Move student between groups (end current, start new)
- [ ] Student profile view showing:
  - [ ] All groups student belongs to (current and historical)
  - [ ] Enrollment date ranges per group
- [ ] Group status management:
  - [ ] Status change buttons/actions (activate, pause, close)
  - [ ] Status change confirmation with impact preview

Deliverable:
- [ ] Flexible class structure without data loss

**Phase 3 — Class Sessions**

Goal: introduce time as a first-class concept

- [ ] Manual class session creation
- [ ] Session status (scheduled / held / cancelled)
- [ ] Link sessions to:
  - [ ] groups
  - [ ] teachers
  - [ ] venues
- [ ] Session history (immutable)

**UI Expectations:**
- [ ] Class sessions calendar/list view (`/organizations/[id]/sessions`) with:
  - [ ] Calendar view (month/week/day) or list view
  - [ ] Filter by group, teacher, venue, date range, status
  - [ ] Color coding by status (scheduled/held/cancelled)
- [ ] Create session form:
  - [ ] Date picker
  - [ ] Time selection (start/end)
  - [ ] Group selection (optional, for group classes)
  - [ ] Teacher selection (required)
  - [ ] Venue selection (optional)
  - [ ] Status selection (default: scheduled)
- [ ] Session detail page:
  - [ ] Session info (date, time, group, teacher, venue, status)
  - [ ] Status change interface (mark as held, cancel)
  - [ ] Linked attendance records (if any)
  - [ ] Immutable history indicator
- [ ] Session list/table view:
  - [ ] Sortable columns (date, group, teacher, status)
  - [ ] Bulk status updates
  - [ ] Quick status change actions
- [ ] Group detail page integration:
  - [ ] Sessions list for the group
  - [ ] Quick session creation from group page

Deliverable:
- [ ] Everything important happens in time

**Phase 4 — Attendance**

Goal: capture what actually happened

- [ ] Attendance per student per session
- [ ] Attendance states (present / absent / excused / late)
- [ ] Teacher attendance marking UI
- [ ] Admin override & audit
- [ ] Missing-attendance detection

**UI Expectations:**
- [ ] Attendance marking interface (for teachers):
  - [ ] Session-focused view: Select session → see enrolled students → mark attendance
  - [ ] Quick-mark interface with status buttons (present/absent/excused/late)
  - [ ] Bulk mark all present/absent
  - [ ] Save confirmation
- [ ] Attendance list/view page (`/organizations/[id]/attendance`) with:
  - [ ] Filter by session, student, date range, status
  - [ ] Attendance records table
  - [ ] Visual indicators for each status
- [ ] Session detail page integration:
  - [ ] Attendance section showing all students and their status
  - [ ] Quick edit attendance for individual students
  - [ ] Missing attendance indicators (students not yet marked)
- [ ] Student profile integration:
  - [ ] Attendance history for the student
  - [ ] Attendance statistics (attendance rate, trends)
- [ ] Admin override interface:
  - [ ] Edit attendance records with audit trail
  - [ ] Reason/note field for overrides
  - [ ] Override history visible
- [ ] Missing attendance alerts/dashboard:
  - [ ] List of sessions with missing attendance
  - [ ] Reminders for teachers
  - [ ] Admin oversight view

Deliverable:
- [ ] Reliable operational truth

**Phase 5 — Private Classes**

Goal: support 1-on-1 teaching

- [ ] Private session creation
- [ ] Duration-based sessions
- [ ] Teacher assignment
- [ ] Attendance implicit handling

**UI Expectations:**
- [ ] Private sessions management page (`/organizations/[id]/private-sessions`) with:
  - [ ] Private sessions list/calendar view
  - [ ] Filter by teacher, student, date range, status
  - [ ] Create private session form:
    - [ ] Date picker
    - [ ] Student selection (required)
    - [ ] Teacher selection (required)
    - [ ] Venue selection (optional)
    - [ ] Duration input (minutes)
    - [ ] Status selection (scheduled/held/cancelled)
- [ ] Private session detail page:
  - [ ] Session info (date, student, teacher, venue, duration, status)
  - [ ] Status change (mark as held/cancelled)
  - [ ] Implicit attendance indicator (if held = present)
- [ ] Teacher view:
  - [ ] My private sessions list
  - [ ] Quick session creation
  - [ ] Mark session as held
- [ ] Student profile integration:
  - [ ] Private sessions history
  - [ ] Upcoming private sessions
- [ ] Calendar integration:
  - [ ] Private sessions visible alongside group sessions
  - [ ] Different visual styling for private vs group sessions

Deliverable:
- [ ] Solo teachers fully supported

**Phase 6 — Student Payments**

Goal: replace manual tracking

- [ ] Monthly payment records
- [ ] Bank transfer receipt upload
- [ ] Payment status tracking
- [ ] Overdue detection
- [ ] Manual reconciliation flow

**UI Expectations:**
- [ ] Payments management page (`/organizations/[id]/payments`) with:
  - [ ] Payments list/table with filters (student, month, status, date range)
  - [ ] Status indicators (pending/paid/overdue)
  - [ ] Overdue payments highlighted
  - [ ] Create payment record form:
    - [ ] Student selection
    - [ ] Month selection (date picker)
    - [ ] Amount input
    - [ ] Status selection
    - [ ] Receipt upload (file upload)
  - [ ] Edit payment record:
    - [ ] Update amount, status, month
    - [ ] Upload/replace receipt
    - [ ] View receipt
- [ ] Student profile integration:
  - [ ] Payment history table
  - [ ] Payment status summary
  - [ ] Outstanding balance indicator
- [ ] Receipt management:
  - [ ] Receipt upload interface (drag & drop or file picker)
  - [ ] Receipt preview/view
  - [ ] Receipt download
- [ ] Overdue payments dashboard:
  - [ ] List of overdue payments
  - [ ] Overdue indicators on student cards
  - [ ] Payment reminder actions
- [ ] Monthly payment overview:
  - [ ] Calendar/month view showing payment status
  - [ ] Quick payment entry
  - [ ] Bulk payment status updates

Deliverable:
- [ ] Clear payment visibility without payment processing

**Phase 7 — Teacher Payouts**

Goal: make compensation transparent

- [ ] Payout period calculation
- [ ] Support payment models:
  - [ ] fixed monthly
  - [ ] per class
  - [ ] per head
- [ ] Attendance-based aggregation
- [ ] Payout preview
- [ ] Manual approval

**UI Expectations:**
- [ ] Payouts management page (`/organizations/[id]/payouts`) with:
  - [ ] Payouts list/table (teacher, month, amount, status)
  - [ ] Filter by teacher, month, status
  - [ ] Generate payout preview action
  - [ ] Create payout record form:
    - [ ] Teacher selection
    - [ ] Month selection
    - [ ] Auto-calculated amount (based on payment model)
    - [ ] Manual amount override option
    - [ ] Status selection (pending/paid/overdue)
  - [ ] Payout detail page with:
    - [ ] Calculation breakdown:
      - [ ] For fixed monthly: flat rate display
      - [ ] For per class: list of classes with amounts
      - [ ] For per head: attendance records with calculations
    - [ ] Total amount summary
    - [ ] Status management (approve, mark as paid)
    - [ ] Edit/override interface
- [ ] Payout preview interface:
  - [ ] Select month and teacher(s)
  - [ ] Preview calculated amounts before creating records
  - [ ] Breakdown of calculation (sessions, attendance, rates)
  - [ ] Approve and create payout records
- [ ] Teacher view (if teacher has access):
  - [ ] My payouts list
  - [ ] Payout detail with calculation breakdown
  - [ ] Payment history
- [ ] Payout calculation dashboard:
  - [ ] Overview of pending calculations
  - [ ] Bulk payout generation
  - [ ] Calculation summary by payment model

Deliverable:
- [ ] Teachers trust the numbers

**Phase 8 — Scheduling Automation**

Goal: reduce repetitive work

- [ ] Group schedules (weekly patterns)
- [ ] Automatic session generation
- [ ] Holiday / cancellation handling
- [ ] Schedule edits without history loss

**UI Expectations:**
- [ ] Group schedule management (`/organizations/[id]/groups/[id]/schedule`):
  - [ ] Weekly schedule pattern editor:
    - [ ] Day of week selection
    - [ ] Time selection (start/end)
    - [ ] Teacher assignment
    - [ ] Venue assignment
    - [ ] Save pattern
  - [ ] Schedule pattern visualization (weekly calendar view)
  - [ ] Edit schedule pattern (updates future sessions only)
- [ ] Session generation interface:
  - [ ] Generate sessions form:
    - [ ] Date range selection
    - [ ] Group selection (or all groups)
    - [ ] Preview sessions to be generated
    - [ ] Generate action
  - [ ] Generated sessions list with status
- [ ] Holiday/cancellation management:
  - [ ] Holiday calendar (`/organizations/[id]/holidays`):
    - [ ] Add holiday dates
    - [ ] Holiday list
    - [ ] Edit/delete holidays
  - [ ] Bulk cancellation interface:
    - [ ] Select date range
    - [ ] Select groups
    - [ ] Cancel all sessions in range
    - [ ] Confirmation with count
- [ ] Schedule history view:
  - [ ] View past schedule patterns
  - [ ] See when schedule changed
  - [ ] Compare schedule versions
- [ ] Dashboard integration:
  - [ ] Upcoming sessions preview
  - [ ] Missing schedule indicators
  - [ ] Schedule generation reminders

Deliverable:
- [ ] Fewer manual operations

**Phase 9 — Notifications**

Goal: reduce chasing people

- [ ] Payment reminders
- [ ] Attendance reminders
- [ ] Missing data alerts
- [ ] Teacher notifications
- [ ] Parent notifications (read-only)

**UI Expectations:**
- [ ] Notifications center (`/organizations/[id]/notifications`):
  - [ ] Notifications list (in-app)
  - [ ] Filter by type, status (read/unread)
  - [ ] Mark as read/unread
  - [ ] Clear all notifications
  - [ ] Notification types:
    - [ ] Payment reminders (overdue, upcoming)
    - [ ] Attendance reminders (missing attendance)
    - [ ] Missing data alerts (sessions without attendance, etc.)
    - [ ] Teacher notifications (new assignments, schedule changes)
- [ ] Notification settings page (`/organizations/[id]/settings/notifications`):
  - [ ] Enable/disable notification types
  - [ ] Email notification preferences
  - [ ] Frequency settings
  - [ ] Recipient selection (admin, teachers, staff)
- [ ] Payment reminder interface:
  - [ ] List of students with overdue/upcoming payments
  - [ ] Send reminder action (email/in-app)
  - [ ] Reminder history
  - [ ] Customize reminder messages
- [ ] Attendance reminder interface:
  - [ ] List of sessions with missing attendance
  - [ ] Send reminder to teachers
  - [ ] Reminder templates
- [ ] Missing data alerts dashboard:
  - [ ] Overview of missing data (attendance, payments, etc.)
  - [ ] Action items list
  - [ ] Quick actions to resolve
- [ ] Teacher notification preferences:
  - [ ] Teacher-specific notification settings
  - [ ] Opt-in/opt-out for different types
- [ ] Parent portal (read-only):
  - [ ] Student attendance view
  - [ ] Payment status view
  - [ ] Upcoming sessions
  - [ ] Notifications about their child

Deliverable:
- [ ] System nudges replace human chasing

**Phase 10 — Reporting**

Goal: basic operational visibility

- [ ] Attendance reports
- [ ] Revenue summaries
- [ ] Teacher load reports
- [ ] Group health indicators
- [ ] Export (CSV)

**UI Expectations:**
- [ ] Reports dashboard (`/organizations/[id]/reports`):
  - [ ] Report type selection
  - [ ] Date range picker
  - [ ] Filter options (group, teacher, student, etc.)
  - [ ] Generate report action
  - [ ] Export to CSV button
- [ ] Attendance reports page:
  - [ ] Attendance summary (total sessions, attendance rate, trends)
  - [ ] Attendance by student (table/list)
  - [ ] Attendance by group
  - [ ] Attendance by teacher
  - [ ] Attendance calendar view
  - [ ] Charts/graphs (attendance trends over time)
  - [ ] Export attendance data
- [ ] Revenue reports page:
  - [ ] Revenue summary (total, by month, trends)
  - [ ] Payment status breakdown (paid/pending/overdue)
  - [ ] Revenue by student
  - [ ] Revenue by group
  - [ ] Revenue charts (monthly trends, comparisons)
  - [ ] Export revenue data
- [ ] Teacher load reports page:
  - [ ] Teacher workload summary (sessions, hours, students)
  - [ ] Teacher utilization metrics
  - [ ] Teacher comparison view
  - [ ] Teacher load charts
  - [ ] Export teacher data
- [ ] Group health indicators page:
  - [ ] Group status overview
  - [ ] Enrollment trends
  - [ ] Attendance rates per group
  - [ ] Group comparison
  - [ ] Health score indicators
  - [ ] Export group data
- [ ] Report customization:
  - [ ] Select columns to include
  - [ ] Apply filters
  - [ ] Save report templates
  - [ ] Schedule recurring reports
- [ ] Report visualization:
  - [ ] Charts and graphs (bar, line, pie)
  - [ ] Summary cards with key metrics
  - [ ] Drill-down capabilities
  - [ ] Print-friendly views

Deliverable:
- [ ] Admins understand what's happening

**Phase 11 — Intelligence (v1)**

Goal: insight, not just data

- [ ] Attendance trends
- [ ] Dropout risk indicators
- [ ] Late-payment prediction
- [ ] Teacher utilization metrics
- [ ] AI-generated summaries

**UI Expectations:**
- [ ] Intelligence dashboard (`/organizations/[id]/insights`):
  - [ ] Key insights cards at the top
  - [ ] Insight categories/tabs
  - [ ] Date range selection
  - [ ] Refresh insights action
- [ ] Attendance trends view:
  - [ ] Trend charts (attendance over time)
  - [ ] Anomaly detection highlights
  - [ ] Pattern recognition (day of week, time patterns)
  - [ ] Predictive attendance forecasts
  - [ ] Interactive charts with drill-down
- [ ] Dropout risk indicators:
  - [ ] Students at risk list with risk scores
  - [ ] Risk factors displayed (attendance decline, payment issues, etc.)
  - [ ] Risk level indicators (low/medium/high)
  - [ ] Intervention suggestions
  - [ ] Student detail view with risk analysis
- [ ] Late-payment prediction:
  - [ ] Students likely to pay late (prediction scores)
  - [ ] Payment behavior patterns
  - [ ] Risk factors (past late payments, payment trends)
  - [ ] Proactive reminder suggestions
- [ ] Teacher utilization metrics:
  - [ ] Utilization charts and graphs
  - [ ] Underutilized/overutilized indicators
  - [ ] Capacity analysis
  - [ ] Optimization suggestions
- [ ] AI-generated summaries:
  - [ ] Monthly/weekly summary cards
  - [ ] Key highlights section
  - [ ] Action items generated from data
  - [ ] Natural language insights
  - [ ] Summary export/share
- [ ] Insight detail pages:
  - [ ] Detailed analysis for each insight type
  - [ ] Supporting data and charts
  - [ ] Recommendations
  - [ ] Historical comparison
- [ ] Alert system:
  - [ ] Proactive alerts for high-risk situations
  - [ ] Insight-based notifications
  - [ ] Actionable recommendations

Deliverable:
- [ ] Cadence becomes proactive

**Phase 12 — AI Copilot**

Goal: natural language operations

- [ ] "Who hasn't paid this month?"
- [ ] "Which students are at risk?"
- [ ] "How much should I pay teachers?"
- [ ] Actionable suggestions

**UI Expectations:**
- [ ] AI Copilot interface (`/organizations/[id]/copilot`):
  - [ ] Chat interface (text input + message history)
  - [ ] Voice input option (optional)
  - [ ] Suggested queries/prompts
  - [ ] Conversation history
  - [ ] Clear conversation action
- [ ] Copilot integration in key pages:
  - [ ] Floating copilot button (available on all pages)
  - [ ] Context-aware suggestions based on current page
  - [ ] Quick actions from copilot responses
- [ ] Query examples and suggestions:
  - [ ] "Who hasn't paid this month?" → List with actions
  - [ ] "Which students are at risk?" → Risk list with details
  - [ ] "How much should I pay teachers?" → Payout calculations
  - [ ] "Show me attendance for Group A" → Attendance data
  - [ ] "Create a session for tomorrow" → Session creation form
- [ ] Response visualization:
  - [ ] Text responses with data
  - [ ] Interactive data tables/lists
  - [ ] Charts and graphs when relevant
  - [ ] Action buttons (create, update, view details)
  - [ ] Links to relevant pages
- [ ] Actionable suggestions:
  - [ ] Suggested actions based on queries
  - [ ] One-click execution of common tasks
  - [ ] Confirmation dialogs for destructive actions
  - [ ] Action history/undo capability
- [ ] Copilot settings:
  - [ ] Enable/disable copilot
  - [ ] Conversation history management
  - [ ] Privacy settings
  - [ ] Model preferences (if multiple models available)
- [ ] Multi-turn conversations:
  - [ ] Follow-up questions
  - [ ] Context retention
  - [ ] Refinement of queries
  - [ ] Clarification requests

Deliverable:
- [ ] The system feels alive

**Phase 13 — Platform & Scale**

Goal: long-term sustainability

- [ ] Public APIs & webhooks
- [ ] Third-party integrations
- [ ] Advanced permissions
- [ ] Multi-country support
- [ ] White-labeling (optional)

**UI Expectations:**
- [ ] API management page (`/organizations/[id]/settings/api`):
  - [ ] API keys list with creation date, last used
  - [ ] Generate new API key
  - [ ] Revoke API key
  - [ ] API key permissions/scopes
  - [ ] API usage statistics
  - [ ] API documentation link
- [ ] Webhooks management page (`/organizations/[id]/settings/webhooks`):
  - [ ] Webhooks list
  - [ ] Create webhook (URL, events, secret)
  - [ ] Edit webhook
  - [ ] Delete webhook
  - [ ] Webhook delivery history (success/failure logs)
  - [ ] Test webhook action
- [ ] Integrations page (`/organizations/[id]/integrations`):
  - [ ] Available integrations list
  - [ ] Connect/disconnect integrations
  - [ ] Integration status indicators
  - [ ] Integration configuration
  - [ ] Integration activity logs
- [ ] Advanced permissions page (`/organizations/[id]/settings/permissions`):
  - [ ] Role-based permissions matrix
  - [ ] Custom role creation
  - [ ] Permission groups
  - [ ] Permission inheritance visualization
  - [ ] User permission override interface
- [ ] Multi-country support:
  - [ ] Country/region selection in organization settings
  - [ ] Localization settings (currency, date format, timezone)
  - [ ] Country-specific features toggle
  - [ ] Compliance settings by country
- [ ] White-labeling settings (if enabled):
  - [ ] Branding customization (`/organizations/[id]/settings/branding`):
    - [ ] Logo upload
    - [ ] Color scheme customization
    - [ ] Custom domain configuration
    - [ ] Email template customization
    - [ ] Footer/header customization
  - [ ] Preview of branded interface
- [ ] Developer portal (if public APIs):
  - [ ] API documentation
  - [ ] Authentication guide
  - [ ] Code examples
  - [ ] SDK downloads
  - [ ] Support/community links
- [ ] Platform analytics dashboard:
  - [ ] Usage statistics
  - [ ] API usage metrics
  - [ ] Integration health
  - [ ] System performance indicators

Deliverable:
- [ ] Cadence as infrastructure

📁 Project Structure

ritmo/
├─ app/
│  ├─ [locale]/          # Locale-based routing (es, en)
│  │  ├─ layout.tsx      # Locale-aware layout with NextIntlClientProvider
│  │  ├─ page.tsx        # Home page
│  │  ├─ dashboard/      # Dashboard page
│  │  ├─ signin/         # Sign in page
│  │  ├─ signup/         # Sign up page
│  │  └─ organizations/  # Organization management
│  │     ├─ create/      # Create organization page
│  │     └─ [id]/members/ # Organization members management page
│  ├─ api/               # API routes (no locale routing)
│  │  ├─ auth/           # BetterAuth routes
│  │  └─ organizations/  # Organization API
│  │     ├─ metadata/    # Organization type metadata
│  │     └─ [id]/        # Organization-specific routes
│  │        ├─ members/  # Member management API
│  │        └─ invitations/ # Invitation management API
│  └─ layout.tsx         # Root layout
├─ messages/             # Translation files
│  ├─ es.json            # Spanish translations (default)
│  └─ en.json            # English translations
├─ i18n/
│  ├─ request.ts         # next-intl request configuration
│  └─ navigation.ts      # Locale-aware navigation helpers
├─ middleware.ts         # Locale detection, routing, and tenant subdomain resolution
├─ db/
│  ├─ schema.ts          # Database schema (Drizzle) - includes BetterAuth tables and domain entities
│  └─ index.ts           # Database connection
├─ auth/
│  └─ better-auth.ts     # BetterAuth configuration
├─ lib/
│  ├─ auth-client.ts     # BetterAuth client
│  ├─ auth-helpers.ts    # Role and permission helpers
│  ├─ api-helpers.ts     # API route helpers (tenant isolation, authentication)
│  ├─ tenant-context.ts  # Tenant context resolution
│  ├─ tenant-errors.ts  # Tenant-specific error handling
│  ├─ tenant-resolver.ts # Tenant subdomain resolution
│  ├─ db-helpers.ts      # Database query helpers
│  ├─ env.ts             # Environment variable validation
│  └─ utils.ts          # Utility functions
├─ components/           # React components
│  ├─ ui/                # UI components (shadcn)
│  └─ tenant-switcher.tsx # Organization switcher component
├─ scripts/              # Utility scripts
│  ├─ setup-better-auth-tables.ts # BetterAuth table setup
│  └─ check-db.ts        # Database connection check
└─ README.md

🚀 Long-Term Goal

Cadence aims to become the operating system for dance education:

From first class

To last recital

With intelligence built in

✨ Name

Cadence
Because rhythm, timing, consistency — and movement — matter.