import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth/better-auth";
import { db } from "@/db";
import { invitation, organizationMembers, member, user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { requireRole } from "@/lib/auth-helpers";
// Generate a unique ID for invitations
function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * GET /api/organizations/[id]/invitations
 * List all invitations for an organization
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

		// Only admins can list invitations
		await requireRole(organizationId, session.user.id, "admin");

		// Fetch invitations
		const invitations = await db
			.select()
			.from(invitation)
			.where(eq(invitation.organizationId, organizationId))
			.orderBy(invitation.createdAt);

		return NextResponse.json({ invitations });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching invitations:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/organizations/[id]/invitations
 * Create a new invitation
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: organizationId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Only admins can invite users
		await requireRole(organizationId, session.user.id, "admin");

		const body = await request.json();
		const { email, role } = body;

		if (!email) {
			return NextResponse.json(
				{ error: "Email is required" },
				{ status: 400 },
			);
		}

		// Validate role if provided
		const validRoles = ["admin", "teacher", "staff"];
		const userRole = role && validRoles.includes(role) ? role : "staff";

		// Check if user with this email is already a member
		// We'll check this by looking for users with this email who are members
		const existingMember = await db
			.select()
			.from(member)
			.innerJoin(user, eq(member.userId, user.id))
			.where(
				and(
					eq(member.organizationId, organizationId),
					eq(user.email, email),
				),
			)
			.limit(1);

		if (existingMember.length > 0) {
			return NextResponse.json(
				{ error: "User is already a member of this organization" },
				{ status: 400 },
			);
		}

		// Check if invitation already exists
		const existingInvitation = await db
			.select()
			.from(invitation)
			.where(
				and(
					eq(invitation.organizationId, organizationId),
					eq(invitation.email, email),
					eq(invitation.status, "pending"),
				),
			)
			.limit(1);

		if (existingInvitation.length > 0) {
			return NextResponse.json(
				{ error: "Invitation already exists for this email" },
				{ status: 400 },
			);
		}

		// Create invitation (expires in 7 days)
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		const newInvitation = await db
			.insert(invitation)
			.values({
				id: generateId(),
				organizationId,
				email,
				role: userRole,
				status: "pending",
				expiresAt,
				inviterId: session.user.id,
			})
			.returning();

		// TODO: Send invitation email here

		return NextResponse.json({
			invitation: newInvitation[0],
			message: "Invitation created successfully",
		});
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error creating invitation:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

