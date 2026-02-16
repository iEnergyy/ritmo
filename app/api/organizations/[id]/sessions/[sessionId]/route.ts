import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getSessionById,
	updateSession,
	deleteSession,
} from "@/db/queries/class-sessions";
import { hasAttendanceRecords } from "@/db/queries/attendance";
import { getTeacherByIdSimple } from "@/db/queries/teachers";
import { getGroupById } from "@/db/queries/groups";
import { getVenueById } from "@/db/queries/venues";

/**
 * GET /api/organizations/[id]/sessions/[sessionId]
 * Get a single session with related entities
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; sessionId: string }> },
) {
	try {
		const { id: organizationId, sessionId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Fetch session
		const classSession = await getSessionById(organizationId, sessionId);

		if (!classSession) {
			return NextResponse.json({ error: "Session not found" }, { status: 404 });
		}

		return NextResponse.json({ session: classSession });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching session:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/organizations/[id]/sessions/[sessionId]
 * Update a session (date, time, group, teacher, venue)
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; sessionId: string }> },
) {
	try {
		const { id: organizationId, sessionId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		const body = await request.json();
		const { groupId, venueId, teacherId, date, startTime, endTime } = body;

		// Verify session exists and belongs to organization
		const existingSession = await getSessionById(organizationId, sessionId);

		if (!existingSession) {
			return NextResponse.json({ error: "Session not found" }, { status: 404 });
		}

		// Validate teacher belongs to organization (if provided)
		if (teacherId) {
			const teacher = await getTeacherByIdSimple(organizationId, teacherId);
			if (!teacher) {
				return NextResponse.json(
					{ error: "Teacher not found or does not belong to organization" },
					{ status: 404 },
				);
			}
		}

		// Validate group belongs to organization (if provided)
		if (groupId !== undefined) {
			if (groupId) {
				const group = await getGroupById(organizationId, groupId);
				if (!group) {
					return NextResponse.json(
						{ error: "Group not found or does not belong to organization" },
						{ status: 404 },
					);
				}
			}
		}

		// Validate venue belongs to organization (if provided)
		if (venueId !== undefined) {
			if (venueId) {
				const venue = await getVenueById(organizationId, venueId);
				if (!venue) {
					return NextResponse.json(
						{ error: "Venue not found or does not belong to organization" },
						{ status: 404 },
					);
				}
			}
		}

		// Validate time range if both provided
		if (startTime && endTime && startTime >= endTime) {
			return NextResponse.json(
				{ error: "Start time must be before end time" },
				{ status: 400 },
			);
		}

		// Update session
		const updatedSession = await updateSession(sessionId, existingSession, {
			groupId: groupId !== undefined ? groupId || null : undefined,
			venueId: venueId !== undefined ? venueId || null : undefined,
			teacherId,
			date: date ? new Date(date) : undefined,
			startTime: startTime !== undefined ? startTime || null : undefined,
			endTime: endTime !== undefined ? endTime || null : undefined,
		});

		return NextResponse.json({ session: updatedSession });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error updating session:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/organizations/[id]/sessions/[sessionId]
 * Delete a session (should be rare - sessions are immutable)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; sessionId: string }> },
) {
	try {
		const { id: organizationId, sessionId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Verify session exists and belongs to organization
		const existingSession = await getSessionById(organizationId, sessionId);

		if (!existingSession) {
			return NextResponse.json({ error: "Session not found" }, { status: 404 });
		}

		// Block delete when session has attendance records
		const hasAttendance = await hasAttendanceRecords(sessionId);
		if (hasAttendance) {
			return NextResponse.json(
				{
					error:
						"Session has attendance records; remove or migrate them before deleting the session",
				},
				{ status: 409 },
			);
		}

		// Delete session
		await deleteSession(sessionId);

		return NextResponse.json({ message: "Session deleted successfully" });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error deleting session:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
