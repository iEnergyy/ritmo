import { NextRequest } from "next/server";
import { auth } from "@/auth/better-auth";
import { db } from "@/db";
import { member } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Get the active organization ID from the session
 * @param request - Next.js request object
 * @returns The active organization ID or null if not set
 */
export async function getActiveOrganization(
	request: NextRequest,
): Promise<string | null> {
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		return session?.organization?.id || null;
	} catch (error) {
		console.error("Error getting active organization:", error);
		return null;
	}
}

/**
 * Require an active organization, throwing an error if not present
 * @param request - Next.js request object
 * @returns The active organization ID
 * @throws Error if no active organization is set
 */
export async function requireActiveOrganization(
	request: NextRequest,
): Promise<string> {
	const organizationId = await getActiveOrganization(request);
	if (!organizationId) {
		throw new Error("No active organization set");
	}
	return organizationId;
}

/**
 * Verify that a user is a member of the specified organization
 * @param userId - The user ID to check
 * @param organizationId - The organization ID to verify membership for
 * @returns True if user is a member, false otherwise
 */
export async function verifyOrganizationMembership(
	userId: string,
	organizationId: string,
): Promise<boolean> {
	try {
		const membership = await db
			.select()
			.from(member)
			.where(
				and(
					eq(member.userId, userId),
					eq(member.organizationId, organizationId),
				),
			)
			.limit(1);

		return membership.length > 0;
	} catch (error) {
		console.error("Error verifying organization membership:", error);
		return false;
	}
}

/**
 * Get the active organization with membership verification
 * @param request - Next.js request object
 * @returns Object with organizationId and userId, or null if invalid
 */
export async function getTenantContext(
	request: NextRequest,
): Promise<{ organizationId: string; userId: string } | null> {
	try {
		const session = await auth.api.getSession({ headers: request.headers });

		if (!session?.user?.id) {
			return null;
		}

		const organizationId = session?.organization?.id;
		if (!organizationId) {
			return null;
		}

		// Verify membership
		const isMember = await verifyOrganizationMembership(
			session.user.id,
			organizationId,
		);

		if (!isMember) {
			return null;
		}

		return {
			organizationId,
			userId: session.user.id,
		};
	} catch (error) {
		console.error("Error getting tenant context:", error);
		return null;
	}
}

/**
 * Wrapper function to ensure queries are scoped to a specific organization
 * This is a type-safe helper for enforcing tenant isolation
 * @param queryFn - Function that performs the query
 * @param organizationId - The organization ID to scope the query to
 * @returns The result of the query function
 */
export async function withTenantIsolation<T>(
	queryFn: (organizationId: string) => Promise<T>,
	organizationId: string,
): Promise<T> {
	if (!organizationId) {
		throw new Error("Organization ID is required for tenant isolation");
	}
	return queryFn(organizationId);
}
