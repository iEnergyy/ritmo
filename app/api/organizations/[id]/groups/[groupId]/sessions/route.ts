import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { getSessionsByGroup, createSession } from "@/db/queries/class-sessions";
import { getGroupById } from "@/db/queries/groups";
import { getTeacherByIdSimple } from "@/db/queries/teachers";
import { getVenueById } from "@/db/queries/venues";

/**
 * GET /api/organizations/[id]/groups/[groupId]/sessions
 * List all sessions for a specific group
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; groupId: string }> },
) {
	try {
		const { id: organizationId, groupId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Verify group exists and belongs to organization
		const group = await getGroupById(organizationId, groupId);

		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		// Get query parameters for additional filters
		const searchParams = request.nextUrl.searchParams;
		const teacherId = searchParams.get("teacherId") || undefined;
		const venueId = searchParams.get("venueId") || undefined;
		const dateFrom = searchParams.get("dateFrom")
			? new Date(searchParams.get("dateFrom")!)
			: undefined;
		const dateTo = searchParams.get("dateTo")
			? new Date(searchParams.get("dateTo")!)
			: undefined;
		const status = searchParams.get("status") as
			| "scheduled"
			| "held"
			| "cancelled"
			| null;

		// Fetch sessions for this group
		const sessionsList = await getSessionsByGroup(groupId, organizationId, {
			teacherId,
			venueId,
			dateFrom,
			dateTo,
			status: status || undefined,
		});

		return NextResponse.json({ sessions: sessionsList });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching group sessions:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/organizations/[id]/groups/[groupId]/sessions
 * Create a session for a specific group (convenience endpoint)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; groupId: string }> },
) {
	try {
		const { id: organizationId, groupId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Verify group exists and belongs to organization
		const group = await getGroupById(organizationId, groupId);

		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		const body = await request.json();
		const { venueId, teacherId, date, startTime, endTime, status } = body;

		// Validate required fields
		if (!teacherId) {
			return NextResponse.json(
				{ error: "Teacher is required" },
				{ status: 400 },
			);
		}

		if (!date) {
			return NextResponse.json({ error: "Date is required" }, { status: 400 });
		}

		if (!status || !["scheduled", "held", "cancelled"].includes(status)) {
			return NextResponse.json(
				{ error: "Status must be scheduled, held, or cancelled" },
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

		// Validate venue belongs to organization (if provided)
		if (venueId) {
			const venue = await getVenueById(organizationId, venueId);
			if (!venue) {
				return NextResponse.json(
					{ error: "Venue not found or does not belong to organization" },
					{ status: 404 },
				);
			}
		}

		// Validate time range if both provided
		if (startTime && endTime && startTime >= endTime) {
			return NextResponse.json(
				{ error: "Start time must be before end time" },
				{ status: 400 },
			);
		}

		// Create session with group pre-filled
		const newSession = await createSession({
			organizationId,
			groupId,
			venueId: venueId || null,
			teacherId,
			date: new Date(date),
			startTime: startTime || null,
			endTime: endTime || null,
			status,
		});

		return NextResponse.json({ session: newSession }, { status: 201 });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error creating group session:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
