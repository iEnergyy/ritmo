import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getEnrollmentsByGroup,
	createEnrollment,
} from "@/db/queries/student-groups";
import { getGroupById } from "@/db/queries/groups";
import { getStudentById } from "@/db/queries/students";

/**
 * GET /api/organizations/[id]/groups/[groupId]/enrollments
 * List all enrollments for a group with student info
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; groupId: string }> },
) {
	try {
		const { id: organizationId, groupId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Verify group exists and belongs to organization
		const group = await getGroupById(organizationId, groupId);
		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		// Fetch enrollments
		const enrollments = await getEnrollmentsByGroup(groupId, organizationId);

		return NextResponse.json({ enrollments });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching enrollments:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/organizations/[id]/groups/[groupId]/enrollments
 * Create new enrollment (add student to group)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; groupId: string }> },
) {
	try {
		const { id: organizationId, groupId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		const body = await request.json();
		const { studentId, startDate, endDate } = body;

		if (!studentId) {
			return NextResponse.json(
				{ error: "Student ID is required" },
				{ status: 400 },
			);
		}

		if (!startDate) {
			return NextResponse.json(
				{ error: "Start date is required" },
				{ status: 400 },
			);
		}

		// Verify group exists and belongs to organization
		const group = await getGroupById(organizationId, groupId);
		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		// Verify student exists and belongs to organization
		const student = await getStudentById(organizationId, studentId);
		if (!student) {
			return NextResponse.json({ error: "Student not found" }, { status: 404 });
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

