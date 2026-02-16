import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { getAttendanceByOrganization } from "@/db/queries/attendance";

/**
 * GET /api/organizations/[id]/attendance
 * List attendance for the organization with optional filters.
 * Query params: sessionId, studentId, dateFrom, dateTo, status
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: organizationId } = await params;
		const session = await getAuthenticatedSession(request);

		await enforceTenantIsolation(organizationId, session.user.id);

		const { searchParams } = new URL(request.url);
		const sessionId = searchParams.get("sessionId") ?? undefined;
		const studentId = searchParams.get("studentId") ?? undefined;
		const dateFromStr = searchParams.get("dateFrom") ?? undefined;
		const dateToStr = searchParams.get("dateTo") ?? undefined;
		const status = searchParams.get("status") as
			| "present"
			| "absent"
			| "excused"
			| "late"
			| undefined;

		const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
		const dateTo = dateToStr ? new Date(dateToStr) : undefined;

		if (status && !["present", "absent", "excused", "late"].includes(status)) {
			return NextResponse.json(
				{ error: "Invalid status filter" },
				{ status: 400 },
			);
		}

		const records = await getAttendanceByOrganization(organizationId, {
			sessionId,
			studentId,
			dateFrom,
			dateTo,
			status,
		});

		return NextResponse.json({ records });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching attendance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
