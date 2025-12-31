import { db } from "@/db";
import { member, organizationMembers } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { verifyOrganizationMembership } from "./tenant-context";

/**
 * Require that a user has access to an organization
 * @param organizationId - The organization ID to check access for
 * @param userId - The user ID to verify
 * @throws Error if user is not a member of the organization
 */
export async function requireOrganizationAccess(
	organizationId: string,
	userId: string,
): Promise<void> {
	if (!organizationId || !userId) {
		throw new Error("Organization ID and User ID are required");
	}

	const hasAccess = await verifyOrganizationMembership(userId, organizationId);

	if (!hasAccess) {
		throw new Error(
			`User ${userId} does not have access to organization ${organizationId}`,
		);
	}
}

/**
 * Require that a user has a specific role in an organization
 * @param organizationId - The organization ID
 * @param userId - The user ID
 * @param requiredRole - The required role (admin, teacher, staff)
 * @throws Error if user doesn't have the required role
 */
export async function requireRole(
	organizationId: string,
	userId: string,
	requiredRole: "admin" | "teacher" | "staff",
): Promise<void> {
	if (!organizationId || !userId) {
		throw new Error("Organization ID and User ID are required");
	}

	// First verify membership
	await requireOrganizationAccess(organizationId, userId);

	// Then check the role
	const memberRecord = await db
		.select()
		.from(member)
		.where(
			and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
		)
		.limit(1);

	if (memberRecord.length === 0) {
		throw new Error("User is not a member of this organization");
	}

	// Get the custom role from organizationMembers table
	const orgMember = await db
		.select()
		.from(organizationMembers)
		.where(eq(organizationMembers.memberId, memberRecord[0].id))
		.limit(1);

	let userRole: "admin" | "teacher" | "staff";

	if (orgMember.length === 0) {
		// If no custom role is set in organizationMembers, the user doesn't have a role yet
		// This can happen when a member is created but no role has been assigned
		// Check if this is the first member (organization owner) - they should be admin
		const allMembers = await db
			.select()
			.from(member)
			.where(eq(member.organizationId, organizationId))
			.orderBy(asc(member.createdAt));

		// If this is the first member (oldest), auto-assign admin role
		if (allMembers.length > 0 && allMembers[0].id === memberRecord[0].id) {
			// Create admin role for the organization owner
			await db.insert(organizationMembers).values({
				memberId: memberRecord[0].id,
				role: "admin",
			});
			userRole = "admin";
		} else {
			// For other members without roles, deny access
			throw new Error(
				"User does not have an assigned role. Please assign a role (admin, teacher, or staff) to this member.",
			);
		}
	} else {
		userRole = orgMember[0].role;
	}

	if (userRole !== requiredRole) {
		throw new Error(
			`User does not have required role: ${requiredRole}. Current role: ${userRole}`,
		);
	}
}

/**
 * Check if a user can access a specific resource
 * This is a generic function that verifies the resource belongs to an organization
 * the user has access to
 * @param resource - The resource object with organizationId
 * @param userId - The user ID
 * @returns True if user can access the resource, false otherwise
 */
export async function canAccessResource(
	resource: { organizationId: string },
	userId: string,
): Promise<boolean> {
	if (!resource?.organizationId || !userId) {
		return false;
	}

	try {
		await requireOrganizationAccess(resource.organizationId, userId);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if a user has a specific role in an organization (non-throwing version)
 * @param organizationId - The organization ID
 * @param userId - The user ID
 * @param role - The role to check for
 * @returns True if user has the role, false otherwise
 */
export async function hasRole(
	organizationId: string,
	userId: string,
	role: "admin" | "teacher" | "staff",
): Promise<boolean> {
	try {
		await requireRole(organizationId, userId, role);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if a user is an admin of an organization
 * @param organizationId - The organization ID
 * @param userId - The user ID
 * @returns True if user is an admin, false otherwise
 */
export async function isAdmin(
	organizationId: string,
	userId: string,
): Promise<boolean> {
	return hasRole(organizationId, userId, "admin");
}

/**
 * Check if a user is a teacher in an organization
 * @param organizationId - The organization ID
 * @param userId - The user ID
 * @returns True if user is a teacher, false otherwise
 */
export async function isTeacher(
	organizationId: string,
	userId: string,
): Promise<boolean> {
	return hasRole(organizationId, userId, "teacher");
}
