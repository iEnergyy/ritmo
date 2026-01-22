import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { getSessionById, updateSessionStatus } from "@/db/queries/class-sessions";

/**
 * PATCH /api/organizations/[id]/sessions/[sessionId]/status
 * Update session status (scheduled/held/cancelled)
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
		const { status } = body;

		// Validate status
		if (!status || !["scheduled", "held", "cancelled"].includes(status)) {
			return NextResponse.json(
				{ error: "Status must be scheduled, held, or cancelled" },
				{ status: 400 },
			);
		}

		// Verify session exists and belongs to organization
		const existingSession = await getSessionById(organizationId, sessionId);

		if (!existingSession) {
			return NextResponse.json(
				{ error: "Session not found" },
				{ status: 404 },
			);
		}

		// Update status
		const updatedSession = await updateSessionStatus(sessionId, status);

		return NextResponse.json({ session: updatedSession });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error updating session status:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
