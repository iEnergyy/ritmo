import { db } from "@/db";
import { studentGroups, groups, students } from "@/db/schema";
import { eq, and, or, isNull, gte, lte } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type StudentGroup = InferSelectModel<typeof studentGroups>;

export type EnrollmentWithStudent = StudentGroup & {
	student: InferSelectModel<typeof students>;
};

export type EnrollmentWithGroup = StudentGroup & {
	group: InferSelectModel<typeof groups>;
};

/**
 * Get all enrollments for a group with student info
 */
export async function getEnrollmentsByGroup(
	groupId: string,
	organizationId: string,
): Promise<EnrollmentWithStudent[]> {
	const results = await db
		.select({
			id: studentGroups.id,
			studentId: studentGroups.studentId,
			groupId: studentGroups.groupId,
			startDate: studentGroups.startDate,
			endDate: studentGroups.endDate,
			createdAt: studentGroups.createdAt,
			student: students,
		})
		.from(studentGroups)
		.innerJoin(students, eq(studentGroups.studentId, students.id))
		.innerJoin(groups, eq(studentGroups.groupId, groups.id))
		.where(
			and(
				eq(studentGroups.groupId, groupId),
				eq(groups.organizationId, organizationId),
				eq(students.organizationId, organizationId),
			),
		);

	return results.map((r) => ({
		id: r.id,
		studentId: r.studentId,
		groupId: r.groupId,
		startDate: r.startDate,
		endDate: r.endDate,
		createdAt: r.createdAt,
		student: r.student,
	}));
}

/**
 * Get all groups a student belongs to (current and historical)
 */
export async function getEnrollmentsByStudent(
	studentId: string,
	organizationId: string,
): Promise<EnrollmentWithGroup[]> {
	const results = await db
		.select({
			id: studentGroups.id,
			studentId: studentGroups.studentId,
			groupId: studentGroups.groupId,
			startDate: studentGroups.startDate,
			endDate: studentGroups.endDate,
			createdAt: studentGroups.createdAt,
			group: groups,
		})
		.from(studentGroups)
		.innerJoin(groups, eq(studentGroups.groupId, groups.id))
		.innerJoin(students, eq(studentGroups.studentId, students.id))
		.where(
			and(
				eq(studentGroups.studentId, studentId),
				eq(groups.organizationId, organizationId),
				eq(students.organizationId, organizationId),
			),
		);

	return results.map((r) => ({
		id: r.id,
		studentId: r.studentId,
		groupId: r.groupId,
		startDate: r.startDate,
		endDate: r.endDate,
		createdAt: r.createdAt,
		group: r.group,
	}));
}

/**
 * Get active enrollments for a group (endDate is null or in the future)
 */
export async function getActiveEnrollmentsByGroup(
	groupId: string,
	organizationId: string,
	date?: Date,
): Promise<EnrollmentWithStudent[]> {
	const checkDate = date || new Date();
	const dateString = checkDate.toISOString().split("T")[0];

	const results = await db
		.select({
			id: studentGroups.id,
			studentId: studentGroups.studentId,
			groupId: studentGroups.groupId,
			startDate: studentGroups.startDate,
			endDate: studentGroups.endDate,
			createdAt: studentGroups.createdAt,
			student: students,
		})
		.from(studentGroups)
		.innerJoin(students, eq(studentGroups.studentId, students.id))
		.innerJoin(groups, eq(studentGroups.groupId, groups.id))
		.where(
			and(
				eq(studentGroups.groupId, groupId),
				eq(groups.organizationId, organizationId),
				eq(students.organizationId, organizationId),
				or(
					isNull(studentGroups.endDate),
					gte(studentGroups.endDate, dateString),
				) as any,
			),
		);

	return results.map((r) => ({
		id: r.id,
		studentId: r.studentId,
		groupId: r.groupId,
		startDate: r.startDate,
		endDate: r.endDate,
		createdAt: r.createdAt,
		student: r.student,
	}));
}

/**
 * Get enrollments for a group that were active on a specific date.
 * Returns enrollments where startDate <= date and (endDate is null or endDate >= date).
 * Use this to derive "expected students" for a class session.
 */
export async function getEnrollmentsByGroupOnDate(
	groupId: string,
	organizationId: string,
	date: Date,
): Promise<EnrollmentWithStudent[]> {
	const dateString = date.toISOString().split("T")[0];

	const results = await db
		.select({
			id: studentGroups.id,
			studentId: studentGroups.studentId,
			groupId: studentGroups.groupId,
			startDate: studentGroups.startDate,
			endDate: studentGroups.endDate,
			createdAt: studentGroups.createdAt,
			student: students,
		})
		.from(studentGroups)
		.innerJoin(students, eq(studentGroups.studentId, students.id))
		.innerJoin(groups, eq(studentGroups.groupId, groups.id))
		.where(
			and(
				eq(studentGroups.groupId, groupId),
				eq(groups.organizationId, organizationId),
				eq(students.organizationId, organizationId),
				lte(studentGroups.startDate, dateString),
				or(
					isNull(studentGroups.endDate),
					gte(studentGroups.endDate, dateString),
				) as any,
			),
		);

	return results.map((r) => ({
		id: r.id,
		studentId: r.studentId,
		groupId: r.groupId,
		startDate: r.startDate,
		endDate: r.endDate,
		createdAt: r.createdAt,
		student: r.student,
	}));
}

/**
 * Create a student-group enrollment
 */
export async function createEnrollment(data: {
	studentId: string;
	groupId: string;
	startDate: string; // ISO date string
	endDate?: string | null; // ISO date string
}): Promise<StudentGroup> {
	const [newEnrollment] = await db
		.insert(studentGroups)
		.values({
			studentId: data.studentId,
			groupId: data.groupId,
			startDate: data.startDate,
			endDate: data.endDate || null,
		})
		.returning();

	return newEnrollment;
}

/**
 * Update enrollment dates
 */
export async function updateEnrollment(
	enrollmentId: string,
	existingEnrollment: StudentGroup,
	data: {
		startDate?: string; // ISO date string
		endDate?: string | null; // ISO date string
	},
): Promise<StudentGroup> {
	const [updatedEnrollment] = await db
		.update(studentGroups)
		.set({
			startDate: data.startDate ?? existingEnrollment.startDate,
			endDate:
				data.endDate !== undefined
					? data.endDate || null
					: existingEnrollment.endDate,
		})
		.where(eq(studentGroups.id, enrollmentId))
		.returning();

	return updatedEnrollment;
}

/**
 * End enrollment by setting end date (soft remove)
 */
export async function endEnrollment(
	enrollmentId: string,
	endDate: string, // ISO date string
): Promise<StudentGroup> {
	const [updatedEnrollment] = await db
		.update(studentGroups)
		.set({
			endDate,
		})
		.where(eq(studentGroups.id, enrollmentId))
		.returning();

	return updatedEnrollment;
}

/**
 * Move student between groups (end current enrollment and create new one)
 */
export async function moveStudentBetweenGroups(
	studentId: string,
	fromGroupId: string,
	toGroupId: string,
	startDate: string, // ISO date string
	endDate?: string | null, // ISO date string for ending the old enrollment
): Promise<{ ended: StudentGroup; created: StudentGroup }> {
	const endDateValue = endDate || startDate;

	// End the current enrollment
	const [endedEnrollment] = await db
		.update(studentGroups)
		.set({
			endDate: endDateValue,
		})
		.where(
			and(
				eq(studentGroups.studentId, studentId),
				eq(studentGroups.groupId, fromGroupId),
				or(
					isNull(studentGroups.endDate),
					gte(studentGroups.endDate, endDateValue),
				) as any,
			),
		)
		.returning();

	if (!endedEnrollment) {
		throw new Error("No active enrollment found to end");
	}

	// Create new enrollment
	const [newEnrollment] = await db
		.insert(studentGroups)
		.values({
			studentId,
			groupId: toGroupId,
			startDate,
			endDate: null,
		})
		.returning();

	return {
		ended: endedEnrollment,
		created: newEnrollment,
	};
}
