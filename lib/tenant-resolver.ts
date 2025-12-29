import { db } from "@/db";
import { organization } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth/better-auth";

/**
 * Extract tenant slug from subdomain
 * Examples:
 * - "acme.localhost" -> "acme"
 * - "acme.localhost:3000" -> "acme"
 * - "acme.yourdomain.com" -> "acme"
 * - "localhost" -> null
 * @param hostname - The hostname from the request
 * @returns The tenant slug or null if no subdomain
 */
export function resolveTenantFromSubdomain(hostname: string): string | null {
	if (!hostname) {
		return null;
	}

	// Remove port if present
	const hostWithoutPort = hostname.split(":")[0];

	// Split by dots
	const parts = hostWithoutPort.split(".");

	// If we have at least 2 parts and the last part is not "localhost" or a TLD,
	// we might have a subdomain. But for localhost, we want to extract the subdomain.
	if (parts.length >= 2) {
		// For localhost: "tenant.localhost" -> ["tenant", "localhost"]
		if (parts[parts.length - 1] === "localhost") {
			return parts[0] || null;
		}

		// For production domains: "tenant.yourdomain.com" -> ["tenant", "yourdomain", "com"]
		// We assume the first part is the subdomain if there are 3+ parts
		if (parts.length >= 3) {
			return parts[0] || null;
		}
	}

	// No subdomain found
	return null;
}

/**
 * Get organization by slug from database
 * @param slug - The organization slug
 * @returns The organization or null if not found
 */
export async function getOrganizationBySlug(
	slug: string,
): Promise<typeof organization.$inferSelect | null> {
	if (!slug) {
		return null;
	}

	try {
		const result = await db
			.select()
			.from(organization)
			.where(eq(organization.slug, slug))
			.limit(1);

		return result[0] || null;
	} catch (error) {
		console.error("Error getting organization by slug:", error);
		return null;
	}
}

/**
 * Set active organization in session
 * Note: This should be called via BetterAuth API, not directly
 * @param sessionId - The session ID
 * @param organizationId - The organization ID to set as active
 * @returns True if successful, false otherwise
 */
export async function setActiveOrganization(
	sessionId: string,
	organizationId: string,
): Promise<boolean> {
	if (!sessionId || !organizationId) {
		return false;
	}

	try {
		// BetterAuth handles session updates through its API
		// This is a placeholder - actual implementation should use BetterAuth's API
		// For now, we'll return true as the actual update happens via authClient.organization.setActive()
		return true;
	} catch (error) {
		console.error("Error setting active organization:", error);
		return false;
	}
}

/**
 * Resolve tenant from subdomain and verify user membership
 * @param hostname - The hostname from the request
 * @param userId - The user ID to verify membership
 * @returns Object with organization info or null if not found/not a member
 */
export async function resolveTenantWithMembership(
	hostname: string,
	userId: string,
): Promise<{ organizationId: string; slug: string } | null> {
	const slug = resolveTenantFromSubdomain(hostname);

	if (!slug) {
		return null;
	}

	const org = await getOrganizationBySlug(slug);

	if (!org) {
		return null;
	}

	// Verify user is a member (import from tenant-context to avoid circular dependency)
	const { verifyOrganizationMembership } = await import("./tenant-context");
	const isMember = await verifyOrganizationMembership(userId, org.id);

	if (!isMember) {
		return null;
	}

	return {
		organizationId: org.id,
		slug: org.slug,
	};
}


