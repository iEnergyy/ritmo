import { db } from "@/db";
import {
	privateSessions,
	privateSessionStudents,
	teachers,
	venues,
	students,
} from "@/db/schema";
import { eq, and, gte, lte, asc, inArray, sql } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { getTeacherByIdSimple } from "./teachers";
import { getVenueById } from "./venues";
import { getStudentById } from "./students";

export type PrivateSession = InferSelectModel<typeof privateSessions>;

export type PrivateSessionStudentInfo = {
	id: string;
	fullName: string;
};

export type PrivateSessionWithRelations = PrivateSession & {
	teacher: InferSelectModel<typeof teachers>;
	venue: InferSelectModel<typeof venues> | null;
	students: PrivateSessionStudentInfo[];
};

type PrivateSessionStatus = "scheduled" | "held" | "cancelled";

export interface PrivateSessionFilters {
	teacherId?: string;
	studentId?: string;
	dateFrom?: Date;
	dateTo?: Date;
	status?: PrivateSessionStatus;
}

function toDateString(d: Date | string): string {
	if (typeof d === "string") return d;
	return d.toISOString().slice(0, 10);
}

/**
 * Get all private sessions for an organization with optional filters.
 * Returns sessions with teacher, venue, and students (via junction).
 */
export async function getPrivateSessionsByOrganization(
	organizationId: string,
	filters?: PrivateSessionFilters,
): Promise<PrivateSessionWithRelations[]> {
	// Cast to text so comparison works whether DB column is text or uuid (Better Auth org IDs are text).
	// Use sql.raw so Drizzle emits the cast; otherwise it strips ::text and Postgres tries to cast param to UUID.
	const conditions = [
		sql`${sql.raw('"private_sessions"."organization_id"::text')} = ${organizationId}`,
	];

	if (filters?.teacherId) {
		conditions.push(eq(privateSessions.teacherId, filters.teacherId));
	}

	if (filters?.dateFrom) {
		conditions.push(gte(privateSessions.date, toDateString(filters.dateFrom)));
	}

	if (filters?.dateTo) {
		conditions.push(lte(privateSessions.date, toDateString(filters.dateTo)));
	}

	if (filters?.status) {
		conditions.push(eq(privateSessions.status, filters.status));
	}

	// If filtering by student: only sessions that include this student
	if (filters?.studentId) {
		const sessionIdsWithStudent = await db
			.select({ privateSessionId: privateSessionStudents.privateSessionId })
			.from(privateSessionStudents)
			.where(eq(privateSessionStudents.studentId, filters.studentId));
		const ids = sessionIdsWithStudent.map((r) => r.privateSessionId);
		if (ids.length === 0) {
			return [];
		}
		conditions.push(inArray(privateSessions.id, ids));
	}

	const whereClause =
		conditions.length > 1 ? and(...conditions) : conditions[0];

	const sessionRows = await db
		.select({
			id: privateSessions.id,
			organizationId: privateSessions.organizationId,
			teacherId: privateSessions.teacherId,
			venueId: privateSessions.venueId,
			date: privateSessions.date,
			durationMinutes: privateSessions.durationMinutes,
			status: privateSessions.status,
			createdAt: privateSessions.createdAt,
			teacher: teachers,
			venue: venues,
		})
		.from(privateSessions)
		.innerJoin(teachers, eq(privateSessions.teacherId, teachers.id))
		.leftJoin(venues, eq(privateSessions.venueId, venues.id))
		.where(whereClause)
		.orderBy(asc(privateSessions.date), asc(privateSessions.createdAt));

	if (sessionRows.length === 0) {
		return [];
	}

	const sessionIds = sessionRows.map((r) => r.id);
	const studentLinks = await db
		.select({
			privateSessionId: privateSessionStudents.privateSessionId,
			studentId: students.id,
			studentFullName: students.fullName,
		})
		.from(privateSessionStudents)
		.innerJoin(students, eq(privateSessionStudents.studentId, students.id))
		.where(inArray(privateSessionStudents.privateSessionId, sessionIds));

	const studentsBySession = new Map<string, PrivateSessionStudentInfo[]>();
	for (const row of studentLinks) {
		const list = studentsBySession.get(row.privateSessionId) ?? [];
		list.push({ id: row.studentId, fullName: row.studentFullName });
		studentsBySession.set(row.privateSessionId, list);
	}

	return sessionRows.map((r) => ({
		id: r.id,
		organizationId: r.organizationId,
		teacherId: r.teacherId,
		venueId: r.venueId,
		date: r.date,
		durationMinutes: r.durationMinutes,
		status: r.status,
		createdAt: r.createdAt,
		teacher: r.teacher,
		venue: r.venue,
		students: studentsBySession.get(r.id) ?? [],
	}));
}

/**
 * Get a single private session by ID within an organization with teacher, venue, and students.
 */
export async function getPrivateSessionById(
	organizationId: string,
	sessionId: string,
): Promise<PrivateSessionWithRelations | null> {
	const [row] = await db
		.select({
			id: privateSessions.id,
			organizationId: privateSessions.organizationId,
			teacherId: privateSessions.teacherId,
			venueId: privateSessions.venueId,
			date: privateSessions.date,
			durationMinutes: privateSessions.durationMinutes,
			status: privateSessions.status,
			createdAt: privateSessions.createdAt,
			teacher: teachers,
			venue: venues,
		})
		.from(privateSessions)
		.innerJoin(teachers, eq(privateSessions.teacherId, teachers.id))
		.leftJoin(venues, eq(privateSessions.venueId, venues.id))
		.where(
			and(
				eq(privateSessions.id, sessionId),
				sql`${sql.raw('"private_sessions"."organization_id"::text')} = ${organizationId}`,
			),
		)
		.limit(1);

	if (!row) {
		return null;
	}

	const studentRows = await db
		.select({
			id: students.id,
			fullName: students.fullName,
		})
		.from(privateSessionStudents)
		.innerJoin(students, eq(privateSessionStudents.studentId, students.id))
		.where(eq(privateSessionStudents.privateSessionId, sessionId));

	return {
		id: row.id,
		organizationId: row.organizationId,
		teacherId: row.teacherId,
		venueId: row.venueId,
		date: row.date,
		durationMinutes: row.durationMinutes,
		status: row.status,
		createdAt: row.createdAt,
		teacher: row.teacher,
		venue: row.venue,
		students: studentRows,
	};
}

export interface CreatePrivateSessionData {
	teacherId: string;
	venueId?: string | null;
	date: Date | string;
	durationMinutes: number;
	status: PrivateSessionStatus;
	studentIds: string[];
}

/**
 * Create a new private session and link students via junction table.
 * Validates teacher, venue, and all students belong to the organization.
 */
export async function createPrivateSession(
	organizationId: string,
	data: CreatePrivateSessionData,
): Promise<PrivateSessionWithRelations> {
	if (!data.studentIds.length) {
		throw new Error("At least one student is required");
	}

	const teacher = await getTeacherByIdSimple(organizationId, data.teacherId);
	if (!teacher) {
		throw new Error("Teacher not found or does not belong to organization");
	}

	if (data.venueId) {
		const venue = await getVenueById(organizationId, data.venueId);
		if (!venue) {
			throw new Error("Venue not found or does not belong to organization");
		}
	}

	for (const studentId of data.studentIds) {
		const student = await getStudentById(organizationId, studentId);
		if (!student) {
			throw new Error(
				`Student ${studentId} not found or does not belong to organization`,
			);
		}
	}

	const [session] = await db
		.insert(privateSessions)
		.values({
			organizationId,
			teacherId: data.teacherId,
			venueId: data.venueId ?? null,
			date: toDateString(data.date),
			durationMinutes: data.durationMinutes,
			status: data.status,
		})
		.returning();

	await db.insert(privateSessionStudents).values(
		data.studentIds.map((studentId) => ({
			privateSessionId: session.id,
			studentId,
		})),
	);

	const result = await getPrivateSessionById(organizationId, session.id);
	if (!result) {
		throw new Error("Failed to load created session");
	}
	return result;
}

export interface UpdatePrivateSessionData {
	date?: Date | string;
	durationMinutes?: number;
	venueId?: string | null;
	status?: PrivateSessionStatus;
	studentIds?: string[];
}

/**
 * Update a private session. If studentIds is provided, replaces junction rows.
 */
export async function updatePrivateSession(
	organizationId: string,
	sessionId: string,
	data: UpdatePrivateSessionData,
): Promise<PrivateSessionWithRelations | null> {
	const existing = await getPrivateSessionById(organizationId, sessionId);
	if (!existing) {
		return null;
	}

	if (data.studentIds !== undefined) {
		if (!data.studentIds.length) {
			throw new Error("At least one student is required");
		}
		for (const studentId of data.studentIds) {
			const student = await getStudentById(organizationId, studentId);
			if (!student) {
				throw new Error(
					`Student ${studentId} not found or does not belong to organization`,
				);
			}
		}
		await db
			.delete(privateSessionStudents)
			.where(eq(privateSessionStudents.privateSessionId, sessionId));
		await db.insert(privateSessionStudents).values(
			data.studentIds.map((studentId) => ({
				privateSessionId: sessionId,
				studentId,
			})),
		);
	}

	const updatePayload: Partial<{
		date: string;
		durationMinutes: number;
		venueId: string | null;
		status: PrivateSessionStatus;
	}> = {};
	if (data.date !== undefined) updatePayload.date = toDateString(data.date);
	if (data.durationMinutes !== undefined)
		updatePayload.durationMinutes = data.durationMinutes;
	if (data.venueId !== undefined) updatePayload.venueId = data.venueId ?? null;
	if (data.status !== undefined) updatePayload.status = data.status;

	if (Object.keys(updatePayload).length > 0) {
		await db
			.update(privateSessions)
			.set(updatePayload)
			.where(
				and(
					eq(privateSessions.id, sessionId),
					sql`${sql.raw('"private_sessions"."organization_id"::text')} = ${organizationId}`,
				),
			);
	}

	return getPrivateSessionById(organizationId, sessionId);
}

/**
 * Delete a private session. Junction rows are deleted via FK cascade.
 */
export async function deletePrivateSession(
	organizationId: string,
	sessionId: string,
): Promise<boolean> {
	const [session] = await db
		.select({ id: privateSessions.id })
		.from(privateSessions)
		.where(
			and(
				eq(privateSessions.id, sessionId),
				sql`${sql.raw('"private_sessions"."organization_id"::text')} = ${organizationId}`,
			),
		)
		.limit(1);

	if (!session) {
		return false;
	}

	await db
		.delete(privateSessionStudents)
		.where(eq(privateSessionStudents.privateSessionId, sessionId));
	await db.delete(privateSessions).where(eq(privateSessions.id, sessionId));
	return true;
}

/**
 * Get private sessions for a specific teacher (convenience wrapper).
 */
export async function getPrivateSessionsByTeacher(
	organizationId: string,
	teacherId: string,
	filters?: Omit<PrivateSessionFilters, "teacherId">,
): Promise<PrivateSessionWithRelations[]> {
	return getPrivateSessionsByOrganization(organizationId, {
		...filters,
		teacherId,
	});
}

/**
 * Get private sessions for a specific student (convenience wrapper).
 */
export async function getPrivateSessionsByStudent(
	organizationId: string,
	studentId: string,
	filters?: Omit<PrivateSessionFilters, "studentId">,
): Promise<PrivateSessionWithRelations[]> {
	return getPrivateSessionsByOrganization(organizationId, {
		...filters,
		studentId,
	});
}
