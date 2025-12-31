import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth/better-auth";
import {
	getTenantContext,
	requireActiveOrganization,
	verifyOrganizationMembership,
} from "./tenant-context";
import {
	TenantNotFoundError,
	TenantAccessDeniedError,
	NoActiveTenantError,
	TenantMembershipError,
	handleTenantError,
} from "./tenant-errors";

/**
 * Get authenticated session with error handling
 * @param request - Next.js request object
 * @returns Session object with user, or throws error response
 */
export async function getAuthenticatedSession(request: NextRequest) {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session?.user) {
		throw new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}

	return session;
}

/**
 * Get tenant context with authentication and membership verification
 * @param request - Next.js request object
 * @returns Tenant context with organizationId and userId, or throws error response
 */
export async function getTenantContextWithAuth(request: NextRequest) {
	const session = await getAuthenticatedSession(request);
	const tenantContext = await getTenantContext(request);

	if (!tenantContext) {
		// Check if user has an active organization but is not a member
		const activeOrgId = session.organization?.id;
		if (activeOrgId) {
			const isMember = await verifyOrganizationMembership(
				session.user.id,
				activeOrgId,
			);
			if (!isMember) {
				throw new TenantMembershipError();
			}
		}
		throw new NoActiveTenantError();
	}

	return tenantContext;
}

/**
 * Enforce tenant isolation by verifying user can access the organization
 * @param organizationId - The organization ID to verify access for
 * @param userId - The user ID to verify
 * @throws TenantAccessDeniedError if user cannot access organization
 */
export async function enforceTenantIsolation(
	organizationId: string,
	userId: string,
): Promise<void> {
	if (!organizationId || !userId) {
		throw new Error("Organization ID and User ID are required");
	}

	const isMember = await verifyOrganizationMembership(userId, organizationId);

	if (!isMember) {
		throw new TenantAccessDeniedError(
			"User is not a member of this organization",
		);
	}
}

/**
 * Helper to wrap API route handlers with tenant isolation
 * Ensures the user is authenticated and has access to the active organization
 * @param handler - The API route handler function
 * @returns Wrapped handler with tenant isolation
 */
export function withTenantIsolation<T>(
	handler: (
		request: NextRequest,
		context: { organizationId: string; userId: string },
	) => Promise<NextResponse<T>>,
) {
	return async (request: NextRequest): Promise<NextResponse<T>> => {
		try {
			const tenantContext = await getTenantContextWithAuth(request);
			return handler(request, tenantContext);
		} catch (error) {
			if (error instanceof NextResponse) {
				return error;
			}
			// Handle tenant-specific errors
			if (
				error instanceof TenantNotFoundError ||
				error instanceof TenantAccessDeniedError ||
				error instanceof NoActiveTenantError ||
				error instanceof TenantMembershipError
			) {
				return handleTenantError(error);
			}
			console.error("Error in tenant-isolated handler:", error);
			return NextResponse.json(
				{ error: "Internal server error" },
				{ status: 500 },
			);
		}
	};
}
