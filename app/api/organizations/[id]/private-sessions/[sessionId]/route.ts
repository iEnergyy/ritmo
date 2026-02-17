import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getPrivateSessionById,
	updatePrivateSession,
	deletePrivateSession,
} from "@/db/queries/private-sessions";

/**
 * GET /api/organizations/[id]/private-sessions/[sessionId]
 * Get a single private session with teacher, venue, and students
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; sessionId: string }> },
) {
	try {
		const { id: organizationId, sessionId } = await params;
		const session = await getAuthenticatedSession(request);

		await enforceTenantIsolation(organizationId, session.user.id);

		const privateSession = await getPrivateSessionById(
			organizationId,
			sessionId,
		);

		if (!privateSession) {
			return NextResponse.json(
				{ error: "Private session not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ session: privateSession });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching private session:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/organizations/[id]/private-sessions/[sessionId]
 * Update a private session (date, duration, venue, status, students)
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; sessionId: string }> },
) {
	try {
		const { id: organizationId, sessionId } = await params;
		const session = await getAuthenticatedSession(request);

		await enforceTenantIsolation(organizationId, session.user.id);

		const existing = await getPrivateSessionById(organizationId, sessionId);
		if (!existing) {
			return NextResponse.json(
				{ error: "Private session not found" },
				{ status: 404 },
			);
		}

		const body = await request.json();
		const { date, durationMinutes, venueId, status, studentIds } = body;

		if (
			studentIds !== undefined &&
			(!Array.isArray(studentIds) || studentIds.length === 0)
		) {
			return NextResponse.json(
				{ error: "At least one student is required" },
				{ status: 400 },
			);
		}

		if (
			durationMinutes !== undefined &&
			(typeof durationMinutes !== "number" || durationMinutes < 1)
		) {
			return NextResponse.json(
				{ error: "Duration (minutes) must be a positive number" },
				{ status: 400 },
			);
		}

		if (
			status !== undefined &&
			!["scheduled", "held", "cancelled"].includes(status)
		) {
			return NextResponse.json(
				{ error: "Status must be scheduled, held, or cancelled" },
				{ status: 400 },
			);
		}

		const updated = await updatePrivateSession(organizationId, sessionId, {
			date,
			durationMinutes,
			venueId,
			status,
			studentIds,
		});

		return NextResponse.json({ session: updated });
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
		console.error("Error updating private session:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/organizations/[id]/private-sessions/[sessionId]
 * Delete a private session (junction rows cascade)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; sessionId: string }> },
) {
	try {
		const { id: organizationId, sessionId } = await params;
		const session = await getAuthenticatedSession(request);

		await enforceTenantIsolation(organizationId, session.user.id);

		const deleted = await deletePrivateSession(organizationId, sessionId);

		if (!deleted) {
			return NextResponse.json(
				{ error: "Private session not found" },
				{ status: 404 },
			);
		}

		return new NextResponse(null, { status: 204 });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error deleting private session:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
