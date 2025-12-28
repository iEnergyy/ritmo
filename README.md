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

Drizzle ORM

PostgreSQL

BetterAuth (Organization Plugin)

Event-driven domain design

AI-ready data modeling

📐 Initial Schema

The initial database schema represents the core domain model:

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

**Current Status:** Phase 0 is ~90% complete. Core infrastructure (auth, database, organization management) is in place. Schema definitions for all domain entities are complete. UI/API implementations for domain entities are pending.

**Phase 0 — Groundwork**

Goal: make the system safe to build on

- [x] Project scaffolding (repo, linting, env)
- [x] PostgreSQL + Drizzle setup
- [x] BetterAuth integration
- [x] Organization (tenant) creation - UI and API implemented
- [x] Organization types:
  - [x] school
  - [x] independent_teacher
- [x] Basic role system (admin / teacher / staff) - Schema defined with `organizationMembers` table, UI pending
- [ ] Tenant isolation enforcement - Not yet implemented

Deliverable:
- [x] Secure, multi-tenant foundation (Core infrastructure complete: auth, org creation, schema defined. Tenant isolation enforcement pending)

**Phase 1 — Core Actors**

Goal: represent real people and places

- [x] Student entity (no-login support) - Schema defined in `db/schema.ts`
- [x] Teacher entity (user-linked or standalone) - Schema defined in `db/schema.ts`
- [x] Venue management - Schema defined in `db/schema.ts`
- [x] Organization member management - Schema defined, Better Auth `member` table + custom `organizationMembers` table
- [ ] Public student registration form (minimal) - Not yet implemented

Deliverable:
- [x] Real-world entities represented correctly (Schema complete, UI/API implementation pending)

**Phase 2 — Groups & Membership**

Goal: model ongoing classes accurately

- [ ] Group lifecycle (active / paused / closed)
- [ ] Student ↔ group membership with date ranges
- [ ] Move students between groups
- [ ] Multi-group enrollment
- [ ] Group-level views

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

Deliverable:
- [ ] Everything important happens in time

**Phase 4 — Attendance**

Goal: capture what actually happened

- [ ] Attendance per student per session
- [ ] Attendance states (present / absent / excused / late)
- [ ] Teacher attendance marking UI
- [ ] Admin override & audit
- [ ] Missing-attendance detection

Deliverable:
- [ ] Reliable operational truth

**Phase 5 — Private Classes**

Goal: support 1-on-1 teaching

- [ ] Private session creation
- [ ] Duration-based sessions
- [ ] Teacher assignment
- [ ] Attendance implicit handling

Deliverable:
- [ ] Solo teachers fully supported

**Phase 6 — Student Payments**

Goal: replace manual tracking

- [ ] Monthly payment records
- [ ] Bank transfer receipt upload
- [ ] Payment status tracking
- [ ] Overdue detection
- [ ] Manual reconciliation flow

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

Deliverable:
- [ ] Teachers trust the numbers

**Phase 8 — Scheduling Automation**

Goal: reduce repetitive work

- [ ] Group schedules (weekly patterns)
- [ ] Automatic session generation
- [ ] Holiday / cancellation handling
- [ ] Schedule edits without history loss

Deliverable:
- [ ] Fewer manual operations

**Phase 9 — Notifications**

Goal: reduce chasing people

- [ ] Payment reminders
- [ ] Attendance reminders
- [ ] Missing data alerts
- [ ] Teacher notifications
- [ ] Parent notifications (read-only)

Deliverable:
- [ ] System nudges replace human chasing

**Phase 10 — Reporting**

Goal: basic operational visibility

- [ ] Attendance reports
- [ ] Revenue summaries
- [ ] Teacher load reports
- [ ] Group health indicators
- [ ] Export (CSV)

Deliverable:
- [ ] Admins understand what's happening

**Phase 11 — Intelligence (v1)**

Goal: insight, not just data

- [ ] Attendance trends
- [ ] Dropout risk indicators
- [ ] Late-payment prediction
- [ ] Teacher utilization metrics
- [ ] AI-generated summaries

Deliverable:
- [ ] Cadence becomes proactive

**Phase 12 — AI Copilot**

Goal: natural language operations

- [ ] "Who hasn't paid this month?"
- [ ] "Which students are at risk?"
- [ ] "How much should I pay teachers?"
- [ ] Actionable suggestions

Deliverable:
- [ ] The system feels alive

**Phase 13 — Platform & Scale**

Goal: long-term sustainability

- [ ] Public APIs & webhooks
- [ ] Third-party integrations
- [ ] Advanced permissions
- [ ] Multi-country support
- [ ] White-labeling (optional)

Deliverable:
- [ ] Cadence as infrastructure

📁 Project Structure (early)

cadence/
├─ db/
│ └─ schema.ts
├─ auth/
│ └─ better-auth.ts
├─ services/
│ ├─ attendance/
│ ├─ payments/
│ └─ payouts/
├─ ai/
│ └─ insights/
└─ README.md

🚀 Long-Term Goal

Cadence aims to become the operating system for dance education:

From first class

To last recital

With intelligence built in

✨ Name

Cadence
Because rhythm, timing, consistency — and movement — matter.