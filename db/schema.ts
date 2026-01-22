// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - drizzle-orm/pg-core is a valid export, this is a TypeScript language server cache issue
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
	index,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ----------------------------------
 ENUMS
---------------------------------- */

export const organizationTypeEnum = pgEnum("organization_type", [
	"school",
	"independent_teacher",
]);

export const userRoleEnum = pgEnum("user_role", ["admin", "teacher", "staff"]);

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
 BETTER AUTH CORE TABLES
---------------------------------- */

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		activeOrganizationId: text("active_organization_id"),
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(table: any) => [index("session_userId_idx").on(table.userId)] as const,
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(table: any) => [index("account_userId_idx").on(table.userId)] as const,
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(table: any) =>
		[index("verification_identifier_idx").on(table.identifier)] as const,
);

export const organization = pgTable(
	"organization",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		slug: text("slug").notNull().unique(),
		logo: text("logo"),
		createdAt: timestamp("created_at").notNull(),
		metadata: text("metadata"),
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(table: any) =>
		[uniqueIndex("organization_slug_uidx").on(table.slug)] as const,
);

export const member = pgTable(
	"member",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").default("member").notNull(),
		createdAt: timestamp("created_at").notNull(),
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(table: any) =>
		[
			index("member_organizationId_idx").on(table.organizationId),
			index("member_userId_idx").on(table.userId),
		] as const,
);

export const invitation = pgTable(
	"invitation",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		role: text("role"),
		status: text("status").default("pending").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		inviterId: text("inviter_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(table: any) =>
		[
			index("invitation_organizationId_idx").on(table.organizationId),
			index("invitation_email_idx").on(table.email),
		] as const,
);

/* ----------------------------------
 ORGANIZATION METADATA (Extends Better Auth organization)
---------------------------------- */

export const organizationMetadata = pgTable("organization_metadata", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" })
		.unique(),
	type: organizationTypeEnum("type").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 ORGANIZATION MEMBERS (Custom roles - extends Better Auth member)
---------------------------------- */

export const organizationMembers = pgTable("organization_members", {
	id: uuid("id").primaryKey().defaultRandom(),
	memberId: text("member_id")
		.notNull()
		.references(() => member.id, { onDelete: "cascade" })
		.unique(),
	role: userRoleEnum("role").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 STUDENTS (CAN EXIST WITHOUT USER)
---------------------------------- */

export const students = pgTable("students", {
	id: uuid("id").primaryKey().defaultRandom(),

	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id),

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

	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id),

	userId: text("user_id").references(() => user.id),

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

	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id),

	name: text("name").notNull(),
	address: text("address"),

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 GROUPS (CLASSES)
---------------------------------- */

export const groups = pgTable("groups", {
	id: uuid("id").primaryKey().defaultRandom(),

	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id),

	venueId: uuid("venue_id").references(() => venues.id),

	name: text("name").notNull(),
	status: groupStatusEnum("status").notNull(),

	startedAt: timestamp("started_at"),
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

	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id),

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

	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id),

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

	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id),

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

	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id),

	month: date("month").notNull(),

	totalAmount: numeric("total_amount").notNull(),

	status: paymentStatusEnum("status").notNull(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------
 BETTER AUTH RELATIONS
---------------------------------- */

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	members: many(member),
	invitations: many(invitation),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	invitations: many(invitation),
}));

export const memberRelations = relations(member, ({ one }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id],
	}),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [invitation.inviterId],
		references: [user.id],
	}),
}));
