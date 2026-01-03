import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { getGroupById, updateGroup, deleteGroup } from "@/db/queries/groups";
import { getActiveEnrollmentsByGroup } from "@/db/queries/student-groups";

/**
 * GET /api/organizations/[id]/groups/[groupId]
 * Get a specific group with venue info
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

		// Fetch group
		const group = await getGroupById(organizationId, groupId);

		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		return NextResponse.json({ group });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching group:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/organizations/[id]/groups/[groupId]
 * Update a group
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
		const { name, venueId, status } = body;

		// Verify group exists and belongs to organization
		const existingGroup = await getGroupById(organizationId, groupId);

		if (!existingGroup) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		// Validate status if provided
		if (status && !["active", "paused", "closed"].includes(status)) {
			return NextResponse.json(
				{ error: "Status must be active, paused, or closed" },
				{ status: 400 },
			);
		}

		// Update group
		const updatedGroup = await updateGroup(groupId, existingGroup, {
			name,
			venueId,
			status,
		});

		return NextResponse.json({ group: updatedGroup });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error updating group:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/organizations/[id]/groups/[groupId]
 * Delete a group (only if no enrollments exist)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; groupId: string }> },
) {
	try {
		const { id: organizationId, groupId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Verify group exists and belongs to organization
		const existingGroup = await getGroupById(organizationId, groupId);

		if (!existingGroup) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		// Check for active enrollments
		const activeEnrollments = await getActiveEnrollmentsByGroup(
			groupId,
			organizationId,
		);

		if (activeEnrollments.length > 0) {
			return NextResponse.json(
				{
					error: "Cannot delete group with active enrollments",
					activeEnrollmentsCount: activeEnrollments.length,
				},
				{ status: 400 },
			);
		}

		// Delete group
		await deleteGroup(groupId);

		return NextResponse.json({ message: "Group deleted successfully" });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error deleting group:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
