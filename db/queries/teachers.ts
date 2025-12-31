import { db } from "@/db";
import { teachers, user, member } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type Teacher = InferSelectModel<typeof teachers>;

// Type for teacher with joined user data
export type TeacherWithUser = {
	id: string;
	organizationId: string;
	userId: string | null;
	fullName: string;
	paymentType: "fixed_monthly" | "per_head" | "per_class";
	monthlyRate: string | null;
	ratePerHead: string | null;
	ratePerClass: string | null;
	createdAt: Date;
	userEmail: string | null;
	userName: string | null;
};

const teacherWithUserSelect = {
	id: teachers.id,
	organizationId: teachers.organizationId,
	userId: teachers.userId,
	fullName: teachers.fullName,
	paymentType: teachers.paymentType,
	monthlyRate: teachers.monthlyRate,
	ratePerHead: teachers.ratePerHead,
	ratePerClass: teachers.ratePerClass,
	createdAt: teachers.createdAt,
	userEmail: user.email,
	userName: user.name,
} as const;

/**
 * Get all teachers for an organization with user info if linked
 */
export async function getTeachersByOrganization(
	organizationId: string,
): Promise<TeacherWithUser[]> {
	return await db
		.select(teacherWithUserSelect)
		.from(teachers)
		.leftJoin(user, eq(teachers.userId, user.id))
		.where(eq(teachers.organizationId, organizationId));
}

/**
 * Get a teacher by ID within an organization
 */
export async function getTeacherById(
	organizationId: string,
	teacherId: string,
): Promise<TeacherWithUser | null> {
	const [teacher] = await db
		.select(teacherWithUserSelect)
		.from(teachers)
		.leftJoin(user, eq(teachers.userId, user.id))
		.where(
			and(
				eq(teachers.id, teacherId),
				eq(teachers.organizationId, organizationId),
			),
		)
		.limit(1);

	return teacher || null;
}

/**
 * Get a teacher by ID (without user join, for internal checks)
 */
export async function getTeacherByIdSimple(
	organizationId: string,
	teacherId: string,
): Promise<Teacher | null> {
	const [teacher] = await db
		.select()
		.from(teachers)
		.where(
			and(
				eq(teachers.id, teacherId),
				eq(teachers.organizationId, organizationId),
			),
		)
		.limit(1);

	return teacher || null;
}

/**
 * Check if a user is a member of an organization
 */
export async function isUserMemberOfOrganization(
	userId: string,
	organizationId: string,
): Promise<boolean> {
	const [memberRecord] = await db
		.select()
		.from(member)
		.where(
			and(eq(member.userId, userId), eq(member.organizationId, organizationId)),
		)
		.limit(1);

	return !!memberRecord;
}

/**
 * Create a new teacher
 */
export async function createTeacher(data: {
	organizationId: string;
	fullName: string;
	userId?: string | null;
	paymentType: "fixed_monthly" | "per_head" | "per_class";
	monthlyRate?: string | null;
	ratePerHead?: string | null;
	ratePerClass?: string | null;
}): Promise<Teacher> {
	const [newTeacher] = await db
		.insert(teachers)
		.values({
			organizationId: data.organizationId,
			fullName: data.fullName,
			userId: data.userId || null,
			paymentType: data.paymentType,
			monthlyRate: data.monthlyRate || null,
			ratePerHead: data.ratePerHead || null,
			ratePerClass: data.ratePerClass || null,
		})
		.returning();

	return newTeacher;
}

/**
 * Update a teacher
 */
export async function updateTeacher(
	teacherId: string,
	existingTeacher: Teacher,
	data: {
		fullName?: string;
		userId?: string | null;
		paymentType?: "fixed_monthly" | "per_head" | "per_class";
		monthlyRate?: string | null;
		ratePerHead?: string | null;
		ratePerClass?: string | null;
	},
): Promise<Teacher> {
	const [updatedTeacher] = await db
		.update(teachers)
		.set({
			fullName: data.fullName ?? existingTeacher.fullName,
			userId:
				data.userId !== undefined
					? data.userId || null
					: existingTeacher.userId,
			paymentType: data.paymentType ?? existingTeacher.paymentType,
			monthlyRate:
				data.monthlyRate !== undefined
					? data.monthlyRate || null
					: existingTeacher.monthlyRate,
			ratePerHead:
				data.ratePerHead !== undefined
					? data.ratePerHead || null
					: existingTeacher.ratePerHead,
			ratePerClass:
				data.ratePerClass !== undefined
					? data.ratePerClass || null
					: existingTeacher.ratePerClass,
		})
		.where(eq(teachers.id, teacherId))
		.returning();

	return updatedTeacher;
}

/**
 * Update teacher's user link
 */
export async function updateTeacherUserLink(
	teacherId: string,
	userId: string | null,
): Promise<Teacher> {
	const [updatedTeacher] = await db
		.update(teachers)
		.set({
			userId: userId || null,
		})
		.where(eq(teachers.id, teacherId))
		.returning();

	return updatedTeacher;
}

/**
 * Delete a teacher
 */
export async function deleteTeacher(teacherId: string): Promise<void> {
	await db.delete(teachers).where(eq(teachers.id, teacherId));
}
