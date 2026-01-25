import { db } from "@/db";
import { classSessions, groups, teachers, venues } from "@/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type ClassSession = InferSelectModel<typeof classSessions>;

export type ClassSessionWithRelations = ClassSession & {
	group: InferSelectModel<typeof groups> | null;
	teacher: InferSelectModel<typeof teachers>;
	venue: InferSelectModel<typeof venues> | null;
};

type SessionStatus = "scheduled" | "held" | "cancelled";

export interface SessionFilters {
	groupId?: string;
	teacherId?: string;
	venueId?: string;
	dateFrom?: Date;
	dateTo?: Date;
	status?: SessionStatus;
}

/**
 * Get all sessions for an organization with optional filters
 * Returns sessions with related entities (group, teacher, venue)
 */
export async function getSessionsByOrganization(
	organizationId: string,
	filters?: SessionFilters,
): Promise<ClassSessionWithRelations[]> {
	const conditions = [eq(classSessions.organizationId, organizationId)];

	if (filters?.groupId) {
		conditions.push(eq(classSessions.groupId, filters.groupId));
	}

	if (filters?.teacherId) {
		conditions.push(eq(classSessions.teacherId, filters.teacherId));
	}

	if (filters?.venueId) {
		conditions.push(eq(classSessions.venueId, filters.venueId));
	}

	if (filters?.dateFrom) {
		conditions.push(gte(classSessions.date, filters.dateFrom));
	}

	if (filters?.dateTo) {
		conditions.push(lte(classSessions.date, filters.dateTo));
	}

	if (filters?.status) {
		conditions.push(eq(classSessions.status, filters.status));
	}

	const whereClause =
		conditions.length > 1 ? and(...conditions) : conditions[0];

	const results = await db
		.select({
			id: classSessions.id,
			organizationId: classSessions.organizationId,
			groupId: classSessions.groupId,
			venueId: classSessions.venueId,
			teacherId: classSessions.teacherId,
			date: classSessions.date,
			startTime: classSessions.startTime,
			endTime: classSessions.endTime,
			status: classSessions.status,
			createdAt: classSessions.createdAt,
			group: groups,
			teacher: teachers,
			venue: venues,
		})
		.from(classSessions)
		.leftJoin(groups, eq(classSessions.groupId, groups.id))
		.innerJoin(teachers, eq(classSessions.teacherId, teachers.id))
		.leftJoin(venues, eq(classSessions.venueId, venues.id))
		.where(whereClause)
		.orderBy(asc(classSessions.date), asc(classSessions.startTime));

	return results.map((r) => ({
		id: r.id,
		organizationId: r.organizationId,
		groupId: r.groupId,
		venueId: r.venueId,
		teacherId: r.teacherId,
		date: r.date,
		startTime: r.startTime,
		endTime: r.endTime,
		status: r.status,
		createdAt: r.createdAt,
		group: r.group,
		teacher: r.teacher,
		venue: r.venue,
	}));
}

/**
 * Get a single session by ID within an organization with related entities
 */
export async function getSessionById(
	organizationId: string,
	sessionId: string,
): Promise<ClassSessionWithRelations | null> {
	const [result] = await db
		.select({
			id: classSessions.id,
			organizationId: classSessions.organizationId,
			groupId: classSessions.groupId,
			venueId: classSessions.venueId,
			teacherId: classSessions.teacherId,
			date: classSessions.date,
			startTime: classSessions.startTime,
			endTime: classSessions.endTime,
			status: classSessions.status,
			createdAt: classSessions.createdAt,
			group: groups,
			teacher: teachers,
			venue: venues,
		})
		.from(classSessions)
		.leftJoin(groups, eq(classSessions.groupId, groups.id))
		.innerJoin(teachers, eq(classSessions.teacherId, teachers.id))
		.leftJoin(venues, eq(classSessions.venueId, venues.id))
		.where(
			and(
				eq(classSessions.id, sessionId),
				eq(classSessions.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!result) {
		return null;
	}

	return {
		id: result.id,
		organizationId: result.organizationId,
		groupId: result.groupId,
		venueId: result.venueId,
		teacherId: result.teacherId,
		date: result.date,
		startTime: result.startTime,
		endTime: result.endTime,
		status: result.status,
		createdAt: result.createdAt,
		group: result.group,
		teacher: result.teacher,
		venue: result.venue,
	};
}

/**
 * Get all sessions for a specific group
 */
export async function getSessionsByGroup(
	groupId: string,
	organizationId: string,
	filters?: Omit<SessionFilters, "groupId">,
): Promise<ClassSessionWithRelations[]> {
	return getSessionsByOrganization(organizationId, {
		...filters,
		groupId,
	});
}

/**
 * Get all sessions for a specific teacher
 */
export async function getSessionsByTeacher(
	teacherId: string,
	organizationId: string,
	filters?: Omit<SessionFilters, "teacherId">,
): Promise<ClassSessionWithRelations[]> {
	return getSessionsByOrganization(organizationId, {
		...filters,
		teacherId,
	});
}

/** Normalize to YYYY-MM-DD for Postgres date column */
function toDateString(d: Date | string): string {
	if (typeof d === "string") return d;
	return d.toISOString().slice(0, 10);
}

/**
 * Create a new session
 */
export async function createSession(data: {
	organizationId: string;
	groupId?: string | null;
	venueId?: string | null;
	teacherId: string;
	date: Date | string;
	startTime?: string | null;
	endTime?: string | null;
	status: "scheduled" | "held" | "cancelled";
}): Promise<ClassSession> {
	const [newSession] = await db
		.insert(classSessions)
		.values({
			organizationId: data.organizationId,
			groupId: data.groupId || null,
			venueId: data.venueId || null,
			teacherId: data.teacherId,
			date: toDateString(data.date),
			startTime: data.startTime || null,
			endTime: data.endTime || null,
			status: data.status,
		})
		.returning();

	return newSession;
}

/**
 * Update a session
 */
export async function updateSession(
	sessionId: string,
	existingSession: ClassSession,
	data: {
		groupId?: string | null;
		venueId?: string | null;
		teacherId?: string;
		date?: Date | string;
		startTime?: string | null;
		endTime?: string | null;
	},
): Promise<ClassSession> {
	const [updatedSession] = await db
		.update(classSessions)
		.set({
			groupId:
				data.groupId === undefined
					? existingSession.groupId
					: data.groupId || null,
			venueId:
				data.venueId === undefined
					? existingSession.venueId
					: data.venueId || null,
			teacherId: data.teacherId ?? existingSession.teacherId,
			date:
				data.date === undefined
					? existingSession.date
					: toDateString(data.date),
			startTime:
				data.startTime === undefined
					? existingSession.startTime
					: data.startTime || null,
			endTime:
				data.endTime === undefined
					? existingSession.endTime
					: data.endTime || null,
		})
		.where(eq(classSessions.id, sessionId))
		.returning();

	return updatedSession;
}

/**
 * Update session status
 */
export async function updateSessionStatus(
	sessionId: string,
	status: "scheduled" | "held" | "cancelled",
): Promise<ClassSession> {
	const [updatedSession] = await db
		.update(classSessions)
		.set({
			status,
		})
		.where(eq(classSessions.id, sessionId))
		.returning();

	return updatedSession;
}

/**
 * Delete a session
 * Note: Should check for linked attendance records before calling this
 */
export async function deleteSession(sessionId: string): Promise<void> {
	await db.delete(classSessions).where(eq(classSessions.id, sessionId));
}
