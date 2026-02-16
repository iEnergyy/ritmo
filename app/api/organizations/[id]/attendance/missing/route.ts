import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { getSessionsWithMissingAttendance } from "@/db/queries/attendance";

/**
 * GET /api/organizations/[id]/attendance/missing
 * Return sessions that have expected students but at least one has no attendance record.
 * Query params: dateFrom, dateTo (optional)
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
		const dateFromStr = searchParams.get("dateFrom") ?? undefined;
		const dateToStr = searchParams.get("dateTo") ?? undefined;

		const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
		const dateTo = dateToStr ? new Date(dateToStr) : undefined;

		const sessions = await getSessionsWithMissingAttendance(
			organizationId,
			dateFrom,
			dateTo,
		);

		return NextResponse.json({ sessions });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching sessions with missing attendance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
