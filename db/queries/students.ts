import { db } from "@/db";
import { students } from "@/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type Student = InferSelectModel<typeof students>;

/**
 * Get all students for an organization with optional search
 */
export async function getStudentsByOrganization(
	organizationId: string,
	search?: string,
): Promise<Student[]> {
	let whereClause = eq(students.organizationId, organizationId);

	if (search) {
		const searchPattern = `%${search}%`;
		whereClause = and(
			eq(students.organizationId, organizationId),
			or(
				ilike(students.fullName, searchPattern),
				ilike(students.email, searchPattern),
				ilike(students.phone, searchPattern),
			),
		) as any;
	}

	return await db.select().from(students).where(whereClause);
}

/**
 * Get a student by ID within an organization
 */
export async function getStudentById(
	organizationId: string,
	studentId: string,
): Promise<Student | null> {
	const [student] = await db
		.select()
		.from(students)
		.where(
			and(
				eq(students.id, studentId),
				eq(students.organizationId, organizationId),
			),
		)
		.limit(1);

	return student || null;
}

/**
 * Create a new student
 */
export async function createStudent(data: {
	organizationId: string;
	fullName: string;
	email?: string | null;
	phone?: string | null;
}): Promise<Student> {
	const [newStudent] = await db
		.insert(students)
		.values({
			organizationId: data.organizationId,
			fullName: data.fullName,
			email: data.email || null,
			phone: data.phone || null,
		})
		.returning();

	return newStudent;
}

/**
 * Update a student
 */
export async function updateStudent(
	studentId: string,
	existingStudent: Student,
	data: {
		fullName?: string;
		email?: string | null;
		phone?: string | null;
	},
): Promise<Student> {
	const [updatedStudent] = await db
		.update(students)
		.set({
			fullName: data.fullName ?? existingStudent.fullName,
			email: data.email !== undefined ? data.email || null : existingStudent.email,
			phone: data.phone !== undefined ? data.phone || null : existingStudent.phone,
		})
		.where(eq(students.id, studentId))
		.returning();

	return updatedStudent;
}

/**
 * Delete a student
 */
export async function deleteStudent(studentId: string): Promise<void> {
	await db.delete(students).where(eq(students.id, studentId));
}

