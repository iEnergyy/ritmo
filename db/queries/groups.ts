import { db } from "@/db";
import { groups, venues } from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type Group = InferSelectModel<typeof groups>;

export type GroupWithVenue = Group & {
	venue: InferSelectModel<typeof venues> | null;
};

/**
 * Get all groups for an organization with optional filters
 * Returns groups with venue information
 */
export async function getGroupsByOrganization(
	organizationId: string,
	search?: string,
	status?: "active" | "paused" | "closed",
): Promise<GroupWithVenue[]> {
	let whereClause = eq(groups.organizationId, organizationId);

	if (search || status) {
		const conditions = [eq(groups.organizationId, organizationId)];

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(ilike(groups.name, searchPattern) as any);
		}

		if (status) {
			conditions.push(eq(groups.status, status) as any);
		}

		whereClause = and(...conditions) as any;
	}

	const results = await db
		.select({
			id: groups.id,
			organizationId: groups.organizationId,
			venueId: groups.venueId,
			name: groups.name,
			status: groups.status,
			startedAt: groups.startedAt,
			createdAt: groups.createdAt,
			venue: venues,
		})
		.from(groups)
		.leftJoin(venues, eq(groups.venueId, venues.id))
		.where(whereClause);

	return results.map((r) => ({
		id: r.id,
		organizationId: r.organizationId,
		venueId: r.venueId,
		name: r.name,
		status: r.status,
		startedAt: r.startedAt,
		createdAt: r.createdAt,
		venue: r.venue,
	}));
}

/**
 * Get a single group by ID within an organization with venue info
 */
export async function getGroupById(
	organizationId: string,
	groupId: string,
): Promise<GroupWithVenue | null> {
	const [result] = await db
		.select({
			id: groups.id,
			organizationId: groups.organizationId,
			venueId: groups.venueId,
			name: groups.name,
			status: groups.status,
			startedAt: groups.startedAt,
			createdAt: groups.createdAt,
			venue: venues,
		})
		.from(groups)
		.leftJoin(venues, eq(groups.venueId, venues.id))
		.where(
			and(eq(groups.id, groupId), eq(groups.organizationId, organizationId)),
		)
		.limit(1);

	if (!result) {
		return null;
	}

	return {
		id: result.id,
		organizationId: result.organizationId,
		venueId: result.venueId,
		name: result.name,
		status: result.status,
		startedAt: result.startedAt,
		createdAt: result.createdAt,
		venue: result.venue,
	};
}

/**
 * Create a new group
 */
export async function createGroup(data: {
	organizationId: string;
	name: string;
	venueId?: string | null;
	status: "active" | "paused" | "closed";
	startedAt?: Date | null;
}): Promise<Group> {
	const [newGroup] = await db
		.insert(groups)
		.values({
			organizationId: data.organizationId,
			name: data.name,
			venueId: data.venueId || null,
			status: data.status,
			startedAt: data.startedAt || null,
		})
		.returning();

	return newGroup;
}

/**
 * Update a group
 */
export async function updateGroup(
	groupId: string,
	existingGroup: Group,
	data: {
		name?: string;
		venueId?: string | null;
		status?: "active" | "paused" | "closed";
		startedAt?: Date | null;
	},
): Promise<Group> {
	const [updatedGroup] = await db
		.update(groups)
		.set({
			name: data.name ?? existingGroup.name,
			venueId:
				data.venueId !== undefined
					? data.venueId || null
					: existingGroup.venueId,
			status: data.status ?? existingGroup.status,
			startedAt:
				data.startedAt !== undefined
					? data.startedAt || null
					: existingGroup.startedAt,
		})
		.where(eq(groups.id, groupId))
		.returning();

	return updatedGroup;
}

/**
 * Delete a group
 * Note: Should check for existing enrollments before calling this
 */
export async function deleteGroup(groupId: string): Promise<void> {
	await db.delete(groups).where(eq(groups.id, groupId));
}
