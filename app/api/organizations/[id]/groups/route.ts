import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { getGroupsByOrganization, createGroup } from "@/db/queries/groups";
import { getTeacherByIdSimple } from "@/db/queries/teachers";

/**
 * GET /api/organizations/[id]/groups
 * List all groups for an organization with optional filters
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

		// Get query parameters
		const searchParams = request.nextUrl.searchParams;
		const search = searchParams.get("search") || undefined;
		const status = searchParams.get("status") as
			| "active"
			| "paused"
			| "closed"
			| null;

		// Fetch groups
		const groupsList = await getGroupsByOrganization(
			organizationId,
			search,
			status || undefined,
		);

		return NextResponse.json({ groups: groupsList });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching groups:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/organizations/[id]/groups
 * Create a new group
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

		const body = await request.json();
		const { name, teacherId, venueId, status, startedAt } = body;

		if (!name) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 });
		}

		if (!teacherId) {
			return NextResponse.json(
				{ error: "Teacher is required" },
				{ status: 400 },
			);
		}

		if (!status || !["active", "paused", "closed"].includes(status)) {
			return NextResponse.json(
				{ error: "Status must be active, paused, or closed" },
				{ status: 400 },
			);
		}

		// Validate teacher belongs to organization
		const teacher = await getTeacherByIdSimple(organizationId, teacherId);
		if (!teacher) {
			return NextResponse.json(
				{ error: "Teacher not found or does not belong to organization" },
				{ status: 404 },
			);
		}

		// Create group
		const newGroup = await createGroup({
			organizationId,
			name,
			teacherId,
			venueId: venueId || null,
			status,
			startedAt: startedAt ? new Date(startedAt) : null,
		});

		return NextResponse.json({ group: newGroup }, { status: 201 });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error creating group:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
