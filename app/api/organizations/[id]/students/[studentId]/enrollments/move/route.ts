import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { moveStudentBetweenGroups } from "@/db/queries/student-groups";
import { getStudentById } from "@/db/queries/students";
import { getGroupById } from "@/db/queries/groups";

/**
 * POST /api/organizations/[id]/students/[studentId]/enrollments/move
 * Move student between groups (end current, start new)
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
		const { fromGroupId, toGroupId, startDate, endDate } = body;

		if (!fromGroupId || !toGroupId) {
			return NextResponse.json(
				{ error: "From group ID and to group ID are required" },
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

		// Verify both groups exist and belong to organization
		const fromGroup = await getGroupById(organizationId, fromGroupId);
		if (!fromGroup) {
			return NextResponse.json(
				{ error: "Source group not found" },
				{ status: 404 },
			);
		}

		const toGroup = await getGroupById(organizationId, toGroupId);
		if (!toGroup) {
			return NextResponse.json(
				{ error: "Target group not found" },
				{ status: 404 },
			);
		}

		// Validate dates
		if (endDate && endDate > startDate) {
			return NextResponse.json(
				{ error: "End date must be before or equal to start date" },
				{ status: 400 },
			);
		}

		// Move student between groups
		const result = await moveStudentBetweenGroups(
			studentId,
			fromGroupId,
			toGroupId,
			startDate,
			endDate || null,
		);

		return NextResponse.json({
			ended: result.ended,
			created: result.created,
			message: "Student moved successfully",
		});
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error moving student:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 },
		);
	}
}
