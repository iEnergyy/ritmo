import { db } from "@/db";
import {
	students,
	teachers,
	venues,
	groups,
	classSessions,
	attendanceRecords,
	studentPayments,
	teacherPayouts,
	studentGroups,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

/**
 * Base query builder that automatically filters by organizationId
 * This ensures all queries are scoped to a specific tenant
 * @param table - The table to query
 * @param organizationId - The organization ID to filter by
 * @returns A query builder with organizationId filter applied
 */
export function scopedQuery<T extends PgTable<any>>(
	table: T,
	organizationId: string,
) {
	if (!organizationId) {
		throw new Error("Organization ID is required for scoped queries");
	}
	return db
		.select()
		.from(table as any)
		.where(eq((table as any).organizationId, organizationId));
}

/**
 * Get all students for a specific organization
 * @param organizationId - The organization ID
 * @returns Array of students
 */
export async function getStudentsByOrganization(organizationId: string) {
	return scopedQuery(students, organizationId);
}

/**
 * Get a specific student by ID within an organization
 * @param studentId - The student ID
 * @param organizationId - The organization ID
 * @returns The student or null if not found
 */
export async function getStudentById(
	studentId: string,
	organizationId: string,
) {
	const result = await db
		.select()
		.from(students)
		.where(
			and(
				eq(students.id, studentId),
				eq(students.organizationId, organizationId),
			),
		)
		.limit(1);

	return result[0] || null;
}

/**
 * Get all teachers for a specific organization
 * @param organizationId - The organization ID
 * @returns Array of teachers
 */
export async function getTeachersByOrganization(organizationId: string) {
	return scopedQuery(teachers, organizationId);
}

/**
 * Get a specific teacher by ID within an organization
 * @param teacherId - The teacher ID
 * @param organizationId - The organization ID
 * @returns The teacher or null if not found
 */
export async function getTeacherById(
	teacherId: string,
	organizationId: string,
) {
	const result = await db
		.select()
		.from(teachers)
		.where(
			and(
				eq(teachers.id, teacherId),
				eq(teachers.organizationId, organizationId),
			),
		)
		.limit(1);

	return result[0] || null;
}

/**
 * Get all venues for a specific organization
 * @param organizationId - The organization ID
 * @returns Array of venues
 */
export async function getVenuesByOrganization(organizationId: string) {
	return scopedQuery(venues, organizationId);
}

/**
 * Get a specific venue by ID within an organization
 * @param venueId - The venue ID
 * @param organizationId - The organization ID
 * @returns The venue or null if not found
 */
export async function getVenueById(venueId: string, organizationId: string) {
	const result = await db
		.select()
		.from(venues)
		.where(
			and(eq(venues.id, venueId), eq(venues.organizationId, organizationId)),
		)
		.limit(1);

	return result[0] || null;
}

/**
 * Get all groups for a specific organization
 * @param organizationId - The organization ID
 * @returns Array of groups
 */
export async function getGroupsByOrganization(organizationId: string) {
	return scopedQuery(groups, organizationId);
}

/**
 * Get a specific group by ID within an organization
 * @param groupId - The group ID
 * @param organizationId - The organization ID
 * @returns The group or null if not found
 */
export async function getGroupById(groupId: string, organizationId: string) {
	const result = await db
		.select()
		.from(groups)
		.where(
			and(eq(groups.id, groupId), eq(groups.organizationId, organizationId)),
		)
		.limit(1);

	return result[0] || null;
}

/**
 * Get all class sessions for a specific organization
 * @param organizationId - The organization ID
 * @returns Array of class sessions
 */
export async function getClassSessionsByOrganization(organizationId: string) {
	return scopedQuery(classSessions, organizationId);
}

/**
 * Get a specific class session by ID within an organization
 * @param sessionId - The class session ID
 * @param organizationId - The organization ID
 * @returns The class session or null if not found
 */
export async function getClassSessionById(
	sessionId: string,
	organizationId: string,
) {
	const result = await db
		.select()
		.from(classSessions)
		.where(
			and(
				eq(classSessions.id, sessionId),
				eq(classSessions.organizationId, organizationId),
			),
		)
		.limit(1);

	return result[0] || null;
}

/**
 * Get all attendance records for a specific organization
 * Note: This requires joining with classSessions to filter by organizationId
 * @param organizationId - The organization ID
 * @returns Array of attendance records
 */
export async function getAttendanceRecordsByOrganization(
	organizationId: string,
) {
	return db
		.select()
		.from(attendanceRecords)
		.innerJoin(
			classSessions,
			eq(attendanceRecords.classSessionId, classSessions.id),
		)
		.where(eq(classSessions.organizationId, organizationId));
}

/**
 * Get all student payments for a specific organization
 * @param organizationId - The organization ID
 * @returns Array of student payments
 */
export async function getStudentPaymentsByOrganization(organizationId: string) {
	return scopedQuery(studentPayments, organizationId);
}

/**
 * Get all teacher payouts for a specific organization
 * @param organizationId - The organization ID
 * @returns Array of teacher payouts
 */
export async function getTeacherPayoutsByOrganization(organizationId: string) {
	return scopedQuery(teacherPayouts, organizationId);
}

/**
 * Get all student-group relationships for a specific organization
 * Note: This requires joining with students or groups to filter by organizationId
 * @param organizationId - The organization ID
 * @returns Array of student-group relationships
 */
export async function getStudentGroupsByOrganization(organizationId: string) {
	return db
		.select()
		.from(studentGroups)
		.innerJoin(students, eq(studentGroups.studentId, students.id))
		.where(eq(students.organizationId, organizationId));
}
