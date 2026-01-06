import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { getGroupById, updateGroup } from "@/db/queries/groups";
import { getActiveEnrollmentsByGroup } from "@/db/queries/student-groups";

/**
 * PATCH /api/organizations/[id]/groups/[groupId]/status
 * Update group status with validation
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; groupId: string }> },
) {
	try {
		const { id: organizationId, groupId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		const body = await request.json();
		const { status } = body;

		if (!status || !["active", "paused", "closed"].includes(status)) {
			return NextResponse.json(
				{ error: "Status must be active, paused, or closed" },
				{ status: 400 },
			);
		}

		// Verify group exists and belongs to organization
		const existingGroup = await getGroupById(organizationId, groupId);

		if (!existingGroup) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		// Get active enrollments count for impact preview
		const activeEnrollments = await getActiveEnrollmentsByGroup(
			groupId,
			organizationId,
		);

		// Update status
		const updatedGroup = await updateGroup(groupId, existingGroup, { status });

		return NextResponse.json({
			group: updatedGroup,
			impact: {
				activeEnrollmentsCount: activeEnrollments.length,
			},
		});
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error updating group status:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
