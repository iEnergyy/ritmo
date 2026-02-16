import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getAttendanceForSessionWithExpected,
	bulkUpsertAttendanceForSession,
} from "@/db/queries/attendance";
import { getSessionById } from "@/db/queries/class-sessions";

/**
 * GET /api/organizations/[id]/sessions/[sessionId]/attendance
 * Return expected students (from enrollments on session date) and current attendance for the session.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; sessionId: string }> },
) {
	try {
		const { id: organizationId, sessionId } = await params;
		const session = await getAuthenticatedSession(request);

		await enforceTenantIsolation(organizationId, session.user.id);

		const existingSession = await getSessionById(organizationId, sessionId);
		if (!existingSession) {
			return NextResponse.json({ error: "Session not found" }, { status: 404 });
		}

		const { expected, rows } = await getAttendanceForSessionWithExpected(
			organizationId,
			sessionId,
		);

		return NextResponse.json({ expected, rows });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching session attendance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/organizations/[id]/sessions/[sessionId]/attendance
 * Bulk set attendance for the session. Body: { entries: { studentId, status }[] }
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; sessionId: string }> },
) {
	try {
		const { id: organizationId, sessionId } = await params;
		const session = await getAuthenticatedSession(request);

		await enforceTenantIsolation(organizationId, session.user.id);

		const existingSession = await getSessionById(organizationId, sessionId);
		if (!existingSession) {
			return NextResponse.json({ error: "Session not found" }, { status: 404 });
		}

		const body = await request.json();
		const { entries } = body;

		if (!Array.isArray(entries)) {
			return NextResponse.json(
				{ error: "entries must be an array of { studentId, status }" },
				{ status: 400 },
			);
		}

		const validStatuses = ["present", "absent", "excused", "late"] as const;
		for (const entry of entries) {
			if (
				!entry.studentId ||
				!validStatuses.includes(entry.status as (typeof validStatuses)[number])
			) {
				return NextResponse.json(
					{
						error:
							"Each entry must have studentId and status (present, absent, excused, late)",
					},
					{ status: 400 },
				);
			}
		}

		await bulkUpsertAttendanceForSession(
			organizationId,
			sessionId,
			entries.map((e: { studentId: string; status: string }) => ({
				studentId: e.studentId,
				status: e.status as "present" | "absent" | "excused" | "late",
			})),
		);

		return NextResponse.json({ message: "Attendance updated" });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error updating session attendance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
