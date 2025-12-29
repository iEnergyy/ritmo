import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { member, organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { requireRole } from "@/lib/auth-helpers";

/**
 * PATCH /api/organizations/[id]/members/[memberId]/role
 * Update a member's role
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; memberId: string }> },
) {
	try {
		const { id: organizationId, memberId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Only admins can change roles
		await requireRole(organizationId, session.user.id, "admin");

		const body = await request.json();
		const { role } = body;

		if (!role) {
			return NextResponse.json({ error: "Role is required" }, { status: 400 });
		}

		const validRoles = ["admin", "teacher", "staff"];
		if (!validRoles.includes(role)) {
			return NextResponse.json(
				{ error: `Role must be one of: ${validRoles.join(", ")}` },
				{ status: 400 },
			);
		}

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

		// Update or create organizationMembers record
		const existingOrgMember = await db
			.select()
			.from(organizationMembers)
			.where(eq(organizationMembers.memberId, memberId))
			.limit(1);

		if (existingOrgMember.length > 0) {
			// Update existing role
			await db
				.update(organizationMembers)
				.set({ role })
				.where(eq(organizationMembers.memberId, memberId));
		} else {
			// Create new role record
			await db.insert(organizationMembers).values({
				memberId,
				role,
			});
		}

		return NextResponse.json({ message: "Role updated successfully" });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error updating role:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}


