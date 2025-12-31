import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { requireRole } from "@/lib/auth-helpers";
import {
	getMemberById,
	deleteMember,
} from "@/db/queries/members";

/**
 * DELETE /api/organizations/[id]/members/[memberId]
 * Remove a member from an organization
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; memberId: string }> },
) {
	try {
		const { id: organizationId, memberId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Only admins can remove members
		await requireRole(organizationId, session.user.id, "admin");

		// Verify the member belongs to this organization
		const memberRecord = await getMemberById(organizationId, memberId);

		if (!memberRecord) {
			return NextResponse.json({ error: "Member not found" }, { status: 404 });
		}

		// Prevent removing yourself
		if (memberRecord.userId === session.user.id) {
			return NextResponse.json(
				{ error: "Cannot remove yourself from the organization" },
				{ status: 400 },
			);
		}

		// Delete the member (cascade will handle organizationMembers)
		await deleteMember(memberId);

		return NextResponse.json({ message: "Member removed successfully" });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error removing member:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}


