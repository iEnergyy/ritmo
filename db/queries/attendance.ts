import { db } from "@/db";
import {
	attendanceRecords,
	classSessions,
	students,
	groups,
} from "@/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { getSessionById } from "./class-sessions";
import { getEnrollmentsByGroupOnDate } from "./student-groups";

export type AttendanceRecord = InferSelectModel<typeof attendanceRecords>;

export type AttendanceStatus = "present" | "absent" | "excused" | "late";

export type AttendanceWithStudent = AttendanceRecord & {
	student: InferSelectModel<typeof students>;
};

export type AttendanceWithSessionAndStudent = AttendanceRecord & {
	session: InferSelectModel<typeof classSessions> & {
		group: InferSelectModel<typeof groups> | null;
	};
	student: InferSelectModel<typeof students>;
};

export interface AttendanceFilters {
	sessionId?: string;
	studentId?: string;
	dateFrom?: Date;
	dateTo?: Date;
	status?: AttendanceStatus;
}

export interface SessionAttendanceExpected {
	studentId: string;
	student: InferSelectModel<typeof students>;
	enrollmentId: string;
}

export interface SessionAttendanceRow {
	studentId: string;
	student: InferSelectModel<typeof students>;
	status: AttendanceStatus | null;
	recordId: string | null;
	markedAt: string | null;
}

/**
 * Get all attendance records for a session with student info.
 * Validates session belongs to organization (tenant isolation).
 */
export async function getAttendanceBySession(
	organizationId: string,
	sessionId: string,
): Promise<AttendanceWithStudent[]> {
	const session = await getSessionById(organizationId, sessionId);
	if (!session) return [];

	const results = await db
		.select({
			id: attendanceRecords.id,
			classSessionId: attendanceRecords.classSessionId,
			studentId: attendanceRecords.studentId,
			status: attendanceRecords.status,
			markedAt: attendanceRecords.markedAt,
			student: students,
		})
		.from(attendanceRecords)
		.innerJoin(students, eq(attendanceRecords.studentId, students.id))
		.where(
			and(
				eq(attendanceRecords.classSessionId, sessionId),
				eq(students.organizationId, organizationId),
			),
		);

	return results.map((r) => ({
		id: r.id,
		classSessionId: r.classSessionId,
		studentId: r.studentId,
		status: r.status,
		markedAt: r.markedAt,
		student: r.student,
	}));
}

/**
 * Return expected students (from enrollments on session date) plus existing
 * attendance for that session. Front-end can merge to show status or "not marked".
 */
export async function getAttendanceForSessionWithExpected(
	organizationId: string,
	sessionId: string,
): Promise<{
	expected: SessionAttendanceExpected[];
	rows: SessionAttendanceRow[];
}> {
	const session = await getSessionById(organizationId, sessionId);
	if (!session) {
		return { expected: [], rows: [] };
	}

	const sessionDate = new Date(session.date);

	if (!session.groupId) {
		const records = await getAttendanceBySession(organizationId, sessionId);
		const expected: SessionAttendanceExpected[] = [];
		const rows: SessionAttendanceRow[] = records.map((r) => ({
			studentId: r.studentId,
			student: r.student,
			status: r.status,
			recordId: r.id,
			markedAt: r.markedAt.toISOString(),
		}));
		return { expected, rows };
	}

	const expectedEnrollments = await getEnrollmentsByGroupOnDate(
		session.groupId,
		organizationId,
		sessionDate,
	);
	const expected: SessionAttendanceExpected[] = expectedEnrollments.map(
		(e) => ({
			studentId: e.studentId,
			student: e.student,
			enrollmentId: e.id,
		}),
	);

	const records = await getAttendanceBySession(organizationId, sessionId);
	const recordByStudent = new Map(records.map((r) => [r.studentId, r]));

	const rows: SessionAttendanceRow[] = expectedEnrollments.map((e) => {
		const rec = recordByStudent.get(e.studentId);
		return {
			studentId: e.studentId,
			student: e.student,
			status: rec?.status ?? null,
			recordId: rec?.id ?? null,
			markedAt: rec?.markedAt ? rec.markedAt.toISOString() : null,
		};
	});

	return { expected, rows };
}

/**
 * Insert or update one attendance record (one record per student per session).
 * Enforces tenant isolation via session.
 */
export async function upsertAttendanceRecord(
	organizationId: string,
	data: {
		classSessionId: string;
		studentId: string;
		status: AttendanceStatus;
	},
): Promise<AttendanceRecord> {
	const session = await getSessionById(organizationId, data.classSessionId);
	if (!session) {
		throw new Error("Session not found or access denied");
	}

	const [existing] = await db
		.select()
		.from(attendanceRecords)
		.where(
			and(
				eq(attendanceRecords.classSessionId, data.classSessionId),
				eq(attendanceRecords.studentId, data.studentId),
			),
		)
		.limit(1);

	if (existing) {
		const [updated] = await db
			.update(attendanceRecords)
			.set({
				status: data.status,
				markedAt: new Date(),
			})
			.where(eq(attendanceRecords.id, existing.id))
			.returning();
		return updated;
	}

	const [inserted] = await db
		.insert(attendanceRecords)
		.values({
			classSessionId: data.classSessionId,
			studentId: data.studentId,
			status: data.status,
		})
		.returning();
	return inserted;
}

/**
 * Set attendance for multiple students in one transaction.
 */
export async function bulkUpsertAttendanceForSession(
	organizationId: string,
	sessionId: string,
	entries: { studentId: string; status: AttendanceStatus }[],
): Promise<void> {
	const session = await getSessionById(organizationId, sessionId);
	if (!session) {
		throw new Error("Session not found or access denied");
	}

	await db.transaction(async (tx) => {
		for (const entry of entries) {
			const [existing] = await tx
				.select()
				.from(attendanceRecords)
				.where(
					and(
						eq(attendanceRecords.classSessionId, sessionId),
						eq(attendanceRecords.studentId, entry.studentId),
					),
				)
				.limit(1);

			if (existing) {
				await tx
					.update(attendanceRecords)
					.set({
						status: entry.status,
						markedAt: new Date(),
					})
					.where(eq(attendanceRecords.id, existing.id));
			} else {
				await tx.insert(attendanceRecords).values({
					classSessionId: sessionId,
					studentId: entry.studentId,
					status: entry.status,
				});
			}
		}
	});
}

/**
 * List attendance for an organization with optional filters.
 * Always filters via session.organizationId (tenant isolation).
 */
export async function getAttendanceByOrganization(
	organizationId: string,
	filters?: AttendanceFilters,
): Promise<AttendanceWithSessionAndStudent[]> {
	const conditions = [eq(classSessions.organizationId, organizationId)];

	if (filters?.sessionId) {
		conditions.push(eq(attendanceRecords.classSessionId, filters.sessionId));
	}
	if (filters?.studentId) {
		conditions.push(eq(attendanceRecords.studentId, filters.studentId));
	}
	if (filters?.dateFrom) {
		conditions.push(
			gte(classSessions.date, filters.dateFrom.toISOString().slice(0, 10)),
		);
	}
	if (filters?.dateTo) {
		conditions.push(
			lte(classSessions.date, filters.dateTo.toISOString().slice(0, 10)),
		);
	}
	if (filters?.status) {
		conditions.push(eq(attendanceRecords.status, filters.status));
	}

	const results = await db
		.select({
			id: attendanceRecords.id,
			classSessionId: attendanceRecords.classSessionId,
			studentId: attendanceRecords.studentId,
			status: attendanceRecords.status,
			markedAt: attendanceRecords.markedAt,
			session: classSessions,
			student: students,
			group: groups,
		})
		.from(attendanceRecords)
		.innerJoin(
			classSessions,
			eq(attendanceRecords.classSessionId, classSessions.id),
		)
		.innerJoin(students, eq(attendanceRecords.studentId, students.id))
		.leftJoin(groups, eq(classSessions.groupId, groups.id))
		.where(and(...conditions))
		.orderBy(desc(classSessions.date), desc(attendanceRecords.markedAt));

	return results.map((r) => ({
		id: r.id,
		classSessionId: r.classSessionId,
		studentId: r.studentId,
		status: r.status,
		markedAt: r.markedAt,
		session: {
			...r.session,
			group: r.group ?? null,
		},
		student: r.student,
	}));
}

/**
 * Get attendance history for a student (for student profile).
 */
export async function getAttendanceByStudent(
	studentId: string,
	organizationId: string,
	filters?: { dateFrom?: Date; dateTo?: Date },
): Promise<AttendanceWithSessionAndStudent[]> {
	const conditions = [
		eq(attendanceRecords.studentId, studentId),
		eq(classSessions.organizationId, organizationId),
	];

	if (filters?.dateFrom) {
		conditions.push(
			gte(classSessions.date, filters.dateFrom.toISOString().slice(0, 10)),
		);
	}
	if (filters?.dateTo) {
		conditions.push(
			lte(classSessions.date, filters.dateTo.toISOString().slice(0, 10)),
		);
	}

	const results = await db
		.select({
			id: attendanceRecords.id,
			classSessionId: attendanceRecords.classSessionId,
			studentId: attendanceRecords.studentId,
			status: attendanceRecords.status,
			markedAt: attendanceRecords.markedAt,
			session: classSessions,
			student: students,
			group: groups,
		})
		.from(attendanceRecords)
		.innerJoin(
			classSessions,
			eq(attendanceRecords.classSessionId, classSessions.id),
		)
		.innerJoin(students, eq(attendanceRecords.studentId, students.id))
		.leftJoin(groups, eq(classSessions.groupId, groups.id))
		.where(and(...conditions))
		.orderBy(desc(classSessions.date), desc(attendanceRecords.markedAt));

	return results.map((r) => ({
		id: r.id,
		classSessionId: r.classSessionId,
		studentId: r.studentId,
		status: r.status,
		markedAt: r.markedAt,
		session: {
			...r.session,
			group: r.group ?? null,
		},
		student: r.student,
	}));
}

/**
 * Get sessions that have expected students but at least one expected student
 * has no attendance record. Typically filtered to status "held" and date range.
 */
export async function getSessionsWithMissingAttendance(
	organizationId: string,
	dateFrom?: Date,
	dateTo?: Date,
): Promise<Awaited<ReturnType<typeof getSessionById>>[]> {
	const conditions = [
		eq(classSessions.organizationId, organizationId),
		eq(classSessions.status, "held"),
		sql`${classSessions.groupId} IS NOT NULL`,
	];

	if (dateFrom) {
		conditions.push(
			gte(classSessions.date, dateFrom.toISOString().slice(0, 10)),
		);
	}
	if (dateTo) {
		conditions.push(lte(classSessions.date, dateTo.toISOString().slice(0, 10)));
	}

	const sessions = await db
		.select()
		.from(classSessions)
		.where(and(...conditions))
		.orderBy(desc(classSessions.date));

	const out: Awaited<ReturnType<typeof getSessionById>>[] = [];
	for (const sess of sessions) {
		if (!sess.groupId) continue;
		const sessionDate = new Date(sess.date);
		const expected = await getEnrollmentsByGroupOnDate(
			sess.groupId,
			organizationId,
			sessionDate,
		);
		if (expected.length === 0) continue;
		const records = await getAttendanceBySession(organizationId, sess.id);
		const recordedStudentIds = new Set(records.map((r) => r.studentId));
		const hasMissing = expected.some(
			(e) => !recordedStudentIds.has(e.studentId),
		);
		if (hasMissing) {
			const full = await getSessionById(organizationId, sess.id);
			if (full) out.push(full);
		}
	}
	return out;
}

/**
 * Check if a session has any attendance records (for DELETE guard).
 */
export async function hasAttendanceRecords(
	sessionId: string,
): Promise<boolean> {
	const [row] = await db
		.select({ id: attendanceRecords.id })
		.from(attendanceRecords)
		.where(eq(attendanceRecords.classSessionId, sessionId))
		.limit(1);
	return !!row;
}
