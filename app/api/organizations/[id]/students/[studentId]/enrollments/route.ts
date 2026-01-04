import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getEnrollmentsByStudent,
	createEnrollment,
} from "@/db/queries/student-groups";
import { getStudentById } from "@/db/queries/students";
import { getGroupById } from "@/db/queries/groups";

/**
 * GET /api/organizations/[id]/students/[studentId]/enrollments
 * Get all groups a student belongs to (current and historical)
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

		// Verify student exists and belongs to organization
		const student = await getStudentById(organizationId, studentId);
		if (!student) {
			return NextResponse.json({ error: "Student not found" }, { status: 404 });
		}

		// Fetch enrollments
		const enrollments = await getEnrollmentsByStudent(
			studentId,
			organizationId,
		);

		return NextResponse.json({ enrollments });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching student enrollments:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/organizations/[id]/students/[studentId]/enrollments
 * Create enrollment (alternative entry point)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; studentId: string }> },
) {
	try {
		const { id: organizationId, studentId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		const body = await request.json();
		const { groupId, startDate, endDate } = body;

		if (!groupId) {
			return NextResponse.json(
				{ error: "Group ID is required" },
				{ status: 400 },
			);
		}

		if (!startDate) {
			return NextResponse.json(
				{ error: "Start date is required" },
				{ status: 400 },
			);
		}

		// Verify student exists and belongs to organization
		const student = await getStudentById(organizationId, studentId);
		if (!student) {
			return NextResponse.json({ error: "Student not found" }, { status: 404 });
		}

		// Verify group exists and belongs to organization
		const group = await getGroupById(organizationId, groupId);
		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		// Validate dates
		if (endDate && endDate < startDate) {
			return NextResponse.json(
				{ error: "End date must be after start date" },
				{ status: 400 },
			);
		}

		// Create enrollment
		const newEnrollment = await createEnrollment({
			studentId,
			groupId,
			startDate,
			endDate: endDate || null,
		});

		return NextResponse.json({ enrollment: newEnrollment }, { status: 201 });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error creating enrollment:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

