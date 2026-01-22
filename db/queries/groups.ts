import { db } from "@/db";
import { groups, venues, teachers } from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type Group = InferSelectModel<typeof groups>;

export type GroupWithVenue = Group & {
	venue: InferSelectModel<typeof venues> | null;
};

export type GroupWithRelations = Group & {
	venue: InferSelectModel<typeof venues> | null;
	teacher: InferSelectModel<typeof teachers>;
};

type GroupStatus = "active" | "paused" | "closed";

/**
 * Get all groups for an organization with optional filters
 * Returns groups with venue information
 */
export async function getGroupsByOrganization(
	organizationId: string,
	search?: string,
	status?: GroupStatus,
): Promise<GroupWithRelations[]> {
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
			teacherId: groups.teacherId,
			name: groups.name,
			status: groups.status,
			startedAt: groups.startedAt,
			createdAt: groups.createdAt,
			venue: venues,
			teacher: teachers,
		})
		.from(groups)
		.leftJoin(venues, eq(groups.venueId, venues.id))
		.innerJoin(teachers, eq(groups.teacherId, teachers.id))
		.where(whereClause);

	return results.map((r) => ({
		id: r.id,
		organizationId: r.organizationId,
		venueId: r.venueId,
		teacherId: r.teacherId,
		name: r.name,
		status: r.status,
		startedAt: r.startedAt,
		createdAt: r.createdAt,
		venue: r.venue,
		teacher: r.teacher,
	}));
}

/**
 * Get a single group by ID within an organization with venue info
 */
export async function getGroupById(
	organizationId: string,
	groupId: string,
): Promise<GroupWithRelations | null> {
	const [result] = await db
		.select({
			id: groups.id,
			organizationId: groups.organizationId,
			venueId: groups.venueId,
			teacherId: groups.teacherId,
			name: groups.name,
			status: groups.status,
			startedAt: groups.startedAt,
			createdAt: groups.createdAt,
			venue: venues,
			teacher: teachers,
		})
		.from(groups)
		.leftJoin(venues, eq(groups.venueId, venues.id))
		.innerJoin(teachers, eq(groups.teacherId, teachers.id))
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
		teacherId: result.teacherId,
		name: result.name,
		status: result.status,
		startedAt: result.startedAt,
		createdAt: result.createdAt,
		venue: result.venue,
		teacher: result.teacher,
	};
}

/**
 * Create a new group
 */
export async function createGroup(data: {
	organizationId: string;
	name: string;
	teacherId: string;
	venueId?: string | null;
	status: GroupStatus;
	startedAt?: Date | null;
}): Promise<Group> {
	const [newGroup] = await db
		.insert(groups)
		.values({
			organizationId: data.organizationId,
			name: data.name,
			teacherId: data.teacherId,
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
		teacherId?: string;
		venueId?: string | null;
		status?: GroupStatus;
		startedAt?: Date | null;
	},
): Promise<Group> {
	const [updatedGroup] = await db
		.update(groups)
		.set({
			name: data.name ?? existingGroup.name,
			teacherId: data.teacherId ?? existingGroup.teacherId,
			venueId:
				data.venueId === undefined
					? existingGroup.venueId
					: data.venueId || null,
			status: data.status ?? existingGroup.status,
			startedAt:
				data.startedAt === undefined
					? existingGroup.startedAt
					: data.startedAt || null,
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
