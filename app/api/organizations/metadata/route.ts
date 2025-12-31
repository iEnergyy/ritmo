import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	TenantAccessDeniedError,
	handleTenantError,
} from "@/lib/tenant-errors";
import {
	getOrganizationMetadata,
	upsertOrganizationMetadata,
} from "@/db/queries/organizations";

export async function GET(request: NextRequest) {
	try {
		// Get authenticated session
		const session = await getAuthenticatedSession(request);

		const searchParams = request.nextUrl.searchParams;
		const ids = searchParams.get("ids");

		if (!ids) {
			return NextResponse.json(
				{ error: "ids parameter is required" },
				{ status: 400 },
			);
		}

		const orgIds = ids.split(",").filter(Boolean);

		if (orgIds.length === 0) {
			return NextResponse.json({ types: {} });
		}

		// Verify user is a member of all requested organizations
		// This enforces tenant isolation - users can only see metadata for their organizations
		try {
			for (const orgId of orgIds) {
				await enforceTenantIsolation(orgId, session.user.id);
			}
		} catch (error) {
			if (
				error instanceof TenantAccessDeniedError ||
				error instanceof Error
			) {
				return handleTenantError(error);
			}
			throw error;
		}

		// Fetch organization types only for organizations the user has access to
		const types = await getOrganizationMetadata(orgIds);

		return NextResponse.json({ types });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching organization metadata:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		// Get authenticated session
		const session = await getAuthenticatedSession(request);

		const body = await request.json();
		const { organizationId, type } = body;

		if (!organizationId || !type) {
			return NextResponse.json(
				{ error: "organizationId and type are required" },
				{ status: 400 },
			);
		}

		if (type !== "school" && type !== "independent_teacher") {
			return NextResponse.json(
				{ error: 'type must be either "school" or "independent_teacher"' },
				{ status: 400 },
			);
		}

		// Enforce tenant isolation - verify user has access to this organization
		try {
			await enforceTenantIsolation(organizationId, session.user.id);
		} catch (error) {
			if (
				error instanceof TenantAccessDeniedError ||
				error instanceof Error
			) {
				return handleTenantError(error);
			}
			throw error;
		}

		// Create or update metadata
		await upsertOrganizationMetadata(organizationId, type);

		return NextResponse.json({ success: true });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error setting organization metadata:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
