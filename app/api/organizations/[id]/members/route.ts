import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { member, organizationMembers, user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { requireRole } from "@/lib/auth-helpers";

/**
 * GET /api/organizations/[id]/members
 * List all members of an organization
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: organizationId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Fetch members with their user info and custom roles
		const members = await db
			.select({
				memberId: member.id,
				userId: member.userId,
				userEmail: user.email,
				userName: user.name,
				role: organizationMembers.role,
				createdAt: member.createdAt,
			})
			.from(member)
			.innerJoin(user, eq(member.userId, user.id))
			.leftJoin(
				organizationMembers,
				eq(member.id, organizationMembers.memberId),
			)
			.where(eq(member.organizationId, organizationId));

		return NextResponse.json({ members });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching members:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

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
		const memberRecord = await db
			.select()
			.from(member)
			.where(
				and(
					eq(member.id, memberId),
					eq(member.organizationId, organizationId),
				),
			)
			.limit(1);

		if (memberRecord.length === 0) {
			return NextResponse.json(
				{ error: "Member not found" },
				{ status: 404 },
			);
		}

		// Prevent removing yourself
		if (memberRecord[0].userId === session.user.id) {
			return NextResponse.json(
				{ error: "Cannot remove yourself from the organization" },
				{ status: 400 },
			);
		}

		// Delete the member (cascade will handle organizationMembers)
		await db.delete(member).where(eq(member.id, memberId));

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


