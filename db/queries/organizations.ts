import { db } from "@/db";
import { organizationMetadata } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type OrganizationMetadata = InferSelectModel<typeof organizationMetadata>;

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

