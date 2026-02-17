import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getPrivateSessionsByOrganization,
	createPrivateSession,
} from "@/db/queries/private-sessions";

/**
 * GET /api/organizations/[id]/private-sessions
 * List all private sessions for an organization with optional filters
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: organizationId } = await params;
		const session = await getAuthenticatedSession(request);

		await enforceTenantIsolation(organizationId, session.user.id);

		const searchParams = request.nextUrl.searchParams;
		const teacherId = searchParams.get("teacherId") || undefined;
		const studentId = searchParams.get("studentId") || undefined;
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

		const sessions = await getPrivateSessionsByOrganization(organizationId, {
			teacherId,
			studentId,
			dateFrom,
			dateTo,
			status: status || undefined,
		});

		return NextResponse.json({ sessions });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching private sessions:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/organizations/[id]/private-sessions
 * Create a new private session
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: organizationId } = await params;
		const session = await getAuthenticatedSession(request);

		await enforceTenantIsolation(organizationId, session.user.id);

		const body = await request.json();
		const { teacherId, venueId, date, durationMinutes, status, studentIds } =
			body;

		if (!teacherId) {
			return NextResponse.json(
				{ error: "Teacher is required" },
				{ status: 400 },
			);
		}

		if (!date) {
			return NextResponse.json({ error: "Date is required" }, { status: 400 });
		}

		if (!Array.isArray(studentIds) || studentIds.length === 0) {
			return NextResponse.json(
				{ error: "At least one student is required" },
				{ status: 400 },
			);
		}

		if (typeof durationMinutes !== "number" || durationMinutes < 1) {
			return NextResponse.json(
				{ error: "Duration (minutes) must be a positive number" },
				{ status: 400 },
			);
		}

		if (!status || !["scheduled", "held", "cancelled"].includes(status)) {
			return NextResponse.json(
				{ error: "Status must be scheduled, held, or cancelled" },
				{ status: 400 },
			);
		}

		const newSession = await createPrivateSession(organizationId, {
			teacherId,
			venueId: venueId || null,
			date,
			durationMinutes,
			status,
			studentIds,
		});

		return NextResponse.json({ session: newSession }, { status: 201 });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		if (error instanceof Error) {
			if (
				error.message.includes("not found") ||
				error.message.includes("does not belong")
			) {
				return NextResponse.json({ error: error.message }, { status: 404 });
			}
		}
		console.error("Error creating private session:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
