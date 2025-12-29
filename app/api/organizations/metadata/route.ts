import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationMetadata, member } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import {
	getAuthenticatedSession,
	getTenantContextWithAuth,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	TenantAccessDeniedError,
	handleTenantError,
} from "@/lib/tenant-errors";

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
		const metadata = await db
			.select()
			.from(organizationMetadata)
			.where(inArray(organizationMetadata.organizationId, orgIds));

		const types: Record<string, string> = {};
		metadata.forEach((meta) => {
			types[meta.organizationId] = meta.type;
		});

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

		// Check if metadata already exists
		const existing = await db
			.select()
			.from(organizationMetadata)
			.where(eq(organizationMetadata.organizationId, organizationId))
			.limit(1);

		if (existing.length > 0) {
			// Update existing metadata
			await db
				.update(organizationMetadata)
				.set({ type })
				.where(eq(organizationMetadata.organizationId, organizationId));
		} else {
			// Insert new metadata
			await db.insert(organizationMetadata).values({
				organizationId,
				type,
			});
		}

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
