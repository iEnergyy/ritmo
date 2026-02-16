import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { getAttendanceByStudent } from "@/db/queries/attendance";
import { getStudentById } from "@/db/queries/students";

/**
 * GET /api/organizations/[id]/students/[studentId]/attendance
 * Get attendance history for a student.
 * Query params: dateFrom, dateTo (optional)
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; studentId: string }> },
) {
	try {
		const { id: organizationId, studentId } = await params;
		const session = await getAuthenticatedSession(request);

		await enforceTenantIsolation(organizationId, session.user.id);

		const student = await getStudentById(organizationId, studentId);
		if (!student) {
			return NextResponse.json({ error: "Student not found" }, { status: 404 });
		}

		const { searchParams } = new URL(request.url);
		const dateFromStr = searchParams.get("dateFrom") ?? undefined;
		const dateToStr = searchParams.get("dateTo") ?? undefined;

		const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
		const dateTo = dateToStr ? new Date(dateToStr) : undefined;

		const records = await getAttendanceByStudent(studentId, organizationId, {
			dateFrom,
			dateTo,
		});

		return NextResponse.json({ records });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching student attendance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
