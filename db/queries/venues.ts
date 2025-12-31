import { db } from "@/db";
import { venues } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type Venue = InferSelectModel<typeof venues>;

/**
 * Get all venues for an organization
 */
export async function getVenuesByOrganization(
	organizationId: string,
): Promise<Venue[]> {
	return await db
		.select()
		.from(venues)
		.where(eq(venues.organizationId, organizationId));
}

/**
 * Get a venue by ID within an organization
 */
export async function getVenueById(
	organizationId: string,
	venueId: string,
): Promise<Venue | null> {
	const [venue] = await db
		.select()
		.from(venues)
		.where(
			and(
				eq(venues.id, venueId),
				eq(venues.organizationId, organizationId),
			),
		)
		.limit(1);

	return venue || null;
}

/**
 * Create a new venue
 */
export async function createVenue(data: {
	organizationId: string;
	name: string;
	address?: string | null;
}): Promise<Venue> {
	const [newVenue] = await db
		.insert(venues)
		.values({
			organizationId: data.organizationId,
			name: data.name,
			address: data.address || null,
		})
		.returning();

	return newVenue;
}

/**
 * Update a venue
 */
export async function updateVenue(
	venueId: string,
	existingVenue: Venue,
	data: {
		name?: string;
		address?: string | null;
	},
): Promise<Venue> {
	const [updatedVenue] = await db
		.update(venues)
		.set({
			name: data.name ?? existingVenue.name,
			address: data.address !== undefined ? data.address || null : existingVenue.address,
		})
		.where(eq(venues.id, venueId))
		.returning();

	return updatedVenue;
}

/**
 * Delete a venue
 */
export async function deleteVenue(venueId: string): Promise<void> {
	await db.delete(venues).where(eq(venues.id, venueId));
}

