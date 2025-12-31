import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getTeacherByIdSimple,
	updateTeacherUserLink,
	isUserMemberOfOrganization,
} from "@/db/queries/teachers";

/**
 * PATCH /api/organizations/[id]/teachers/[teacherId]/link-user
 * Link or unlink a user account to/from a teacher
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; teacherId: string }> },
) {
	try {
		const { id: organizationId, teacherId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		const body = await request.json();
		const { userId } = body;

		// Verify teacher exists and belongs to organization
		const existingTeacher = await getTeacherByIdSimple(
			organizationId,
			teacherId,
		);

		if (!existingTeacher) {
			return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
		}

		// If userId is provided, verify the user is a member of the organization
		if (userId) {
			const isMember = await isUserMemberOfOrganization(userId, organizationId);

			if (!isMember) {
				return NextResponse.json(
					{ error: "User must be a member of the organization" },
					{ status: 400 },
				);
			}
		}

		// Update teacher's userId
		const updatedTeacher = await updateTeacherUserLink(teacherId, userId);

		return NextResponse.json({
			teacher: updatedTeacher,
			message: userId
				? "User linked successfully"
				: "User unlinked successfully",
		});
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error linking/unlinking user:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
