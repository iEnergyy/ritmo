import { db } from "@/db";
import { organizationMetadata, organization } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type OrganizationMetadata = InferSelectModel<
	typeof organizationMetadata
>;

/**
 * Get organization metadata by IDs
 */
export async function getOrganizationMetadata(
	organizationIds: string[],
): Promise<Record<string, string>> {
	const metadata = await db
		.select()
		.from(organizationMetadata)
		.where(inArray(organizationMetadata.organizationId, organizationIds));

	const types: Record<string, string> = {};
	metadata.forEach((meta) => {
		types[meta.organizationId] = meta.type;
	});

	return types;
}

/**
 * Get organization metadata by ID
 */
export async function getOrganizationMetadataById(
	organizationId: string,
): Promise<OrganizationMetadata | null> {
	const [metadata] = await db
		.select()
		.from(organizationMetadata)
		.where(eq(organizationMetadata.organizationId, organizationId))
		.limit(1);

	return metadata || null;
}

/**
 * Create or update organization metadata
 */
export async function upsertOrganizationMetadata(
	organizationId: string,
	type: "school" | "independent_teacher",
): Promise<void> {
	const existing = await getOrganizationMetadataById(organizationId);

	if (existing) {
		await db
			.update(organizationMetadata)
			.set({ type })
			.where(eq(organizationMetadata.organizationId, organizationId));
	} else {
		await db.insert(organizationMetadata).values({
			organizationId,
			type,
		});
	}
}

/**
 * Get organization by ID
 * @param organizationId - The organization ID
 * @returns The organization or null if not found
 */
export async function getOrganizationById(
	organizationId: string,
): Promise<{ id: string; name: string; slug: string } | null> {
	if (!organizationId) {
		return null;
	}

	try {
		const [org] = await db
			.select({
				id: organization.id,
				name: organization.name,
				slug: organization.slug,
			})
			.from(organization)
			.where(eq(organization.id, organizationId))
			.limit(1);

		return org || null;
	} catch (error) {
		console.error("Error getting organization by ID:", error);
		return null;
	}
}

/**
 * Get organization by slug from database
 * @param slug - The organization slug
 * @returns The organization or null if not found
 */
export async function getOrganizationBySlug(
	slug: string,
): Promise<typeof organization.$inferSelect | null> {
	if (!slug) {
		return null;
	}

	try {
		const result = await db
			.select()
			.from(organization)
			.where(eq(organization.slug, slug))
			.limit(1);

		return result[0] || null;
	} catch (error) {
		console.error("Error getting organization by slug:", error);
		return null;
	}
}
