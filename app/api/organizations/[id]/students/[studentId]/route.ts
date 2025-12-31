import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getStudentById,
	updateStudent,
	deleteStudent,
} from "@/db/queries/students";

/**
 * GET /api/organizations/[id]/students/[studentId]
 * Get a specific student
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; studentId: string }> },
) {
	try {
		const { id: organizationId, studentId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Fetch student
		const student = await getStudentById(organizationId, studentId);

		if (!student) {
			return NextResponse.json(
				{ error: "Student not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ student });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching student:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/organizations/[id]/students/[studentId]
 * Update a student
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; studentId: string }> },
) {
	try {
		const { id: organizationId, studentId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		const body = await request.json();
		const { fullName, email, phone } = body;

		// Verify student exists and belongs to organization
		const existingStudent = await getStudentById(organizationId, studentId);

		if (!existingStudent) {
			return NextResponse.json(
				{ error: "Student not found" },
				{ status: 404 },
			);
		}

		// Update student
		const updatedStudent = await updateStudent(studentId, existingStudent, {
			fullName,
			email,
			phone,
		});

		return NextResponse.json({ student: updatedStudent });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error updating student:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/organizations/[id]/students/[studentId]
 * Delete a student
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; studentId: string }> },
) {
	try {
		const { id: organizationId, studentId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Verify student exists and belongs to organization
		const existingStudent = await getStudentById(organizationId, studentId);

		if (!existingStudent) {
			return NextResponse.json(
				{ error: "Student not found" },
				{ status: 404 },
			);
		}

		// Delete student
		await deleteStudent(studentId);

		return NextResponse.json({ message: "Student deleted successfully" });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error deleting student:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

