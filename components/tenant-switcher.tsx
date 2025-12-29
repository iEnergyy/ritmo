"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";

/**
 * Extract tenant slug from subdomain (client-side version)
 * Examples:
 * - "acme.localhost" -> "acme"
 * - "acme.localhost:3000" -> "acme"
 * - "acme.yourdomain.com" -> "acme"
 * - "localhost" -> null
 */
function getTenantSlugFromHostname(hostname: string): string | null {
	if (!hostname) {
		return null;
	}

	// Remove port if present
	const hostWithoutPort = hostname.split(":")[0];

	// Split by dots
	const parts = hostWithoutPort.split(".");

	// If we have at least 2 parts and the last part is "localhost",
	// we want to extract the subdomain
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
 * Client component that automatically switches the active organization
 * when accessing via subdomain (e.g., org.localhost)
 * This runs on the client side to handle organization switching
 */
export function TenantSwitcher() {
	const { data: session, isPending } = useSession();

	useEffect(() => {
		// Only run if we have a session
		if (isPending || !session?.user?.id) {
			return;
		}

		// Get the current hostname
		const hostname = window.location.hostname;
		const tenantSlug = getTenantSlugFromHostname(hostname);

		// If no subdomain, nothing to do
		if (!tenantSlug) {
			return;
		}

		// Get current active organization
		const currentOrgId = session.organization?.id;

		// Find organization with matching slug
		// We need to check if user has access to this organization
		// and switch if the current org doesn't match
		const switchOrganization = async () => {
			try {
				// Get user's organizations
				const orgsResult = await authClient.organization.list();

				if (!orgsResult.data) {
					return;
				}

				// Find organization with matching slug
				const targetOrg = orgsResult.data.find(
					(org: any) => org.slug === tenantSlug,
				);

				if (!targetOrg) {
					// Organization not found or user doesn't have access
					console.warn(
						`Organization with slug "${tenantSlug}" not found or user doesn't have access`,
					);
					return;
				}

				// If the active organization doesn't match, switch it
				if (currentOrgId !== targetOrg.id) {
					console.log(
						`Switching organization from ${currentOrgId} to ${targetOrg.id} (${tenantSlug})`,
					);
					await authClient.organization.setActive({
						organizationId: targetOrg.id,
					});

					// Reload to get updated session
					window.location.reload();
				}
			} catch (error) {
				console.error("Error switching organization:", error);
			}
		};

		switchOrganization();
	}, [session, isPending]);

	// This component doesn't render anything
	return null;
}

