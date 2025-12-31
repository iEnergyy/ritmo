import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getVenueById,
	updateVenue,
	deleteVenue,
} from "@/db/queries/venues";

/**
 * GET /api/organizations/[id]/venues/[venueId]
 * Get a specific venue
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; venueId: string }> },
) {
	try {
		const { id: organizationId, venueId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Fetch venue
		const venue = await getVenueById(organizationId, venueId);

		if (!venue) {
			return NextResponse.json(
				{ error: "Venue not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ venue });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching venue:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/organizations/[id]/venues/[venueId]
 * Update a venue
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; venueId: string }> },
) {
	try {
		const { id: organizationId, venueId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		const body = await request.json();
		const { name, address } = body;

		// Verify venue exists and belongs to organization
		const existingVenue = await getVenueById(organizationId, venueId);

		if (!existingVenue) {
			return NextResponse.json(
				{ error: "Venue not found" },
				{ status: 404 },
			);
		}

		// Update venue
		const updatedVenue = await updateVenue(venueId, existingVenue, {
			name,
			address,
		});

		return NextResponse.json({ venue: updatedVenue });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error updating venue:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/organizations/[id]/venues/[venueId]
 * Delete a venue
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; venueId: string }> },
) {
	try {
		const { id: organizationId, venueId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Verify venue exists and belongs to organization
		const existingVenue = await getVenueById(organizationId, venueId);

		if (!existingVenue) {
			return NextResponse.json(
				{ error: "Venue not found" },
				{ status: 404 },
			);
		}

		// Delete venue
		await deleteVenue(venueId);

		return NextResponse.json({ message: "Venue deleted successfully" });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error deleting venue:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

