import { db } from "@/db";
import { member, user } from "@/db/schema";
import { eq } from "drizzle-orm";

// Type for user data returned from organization members query
export type OrganizationUser = {
	id: string;
	email: string;
	name: string;
};

/**
 * Get all users (members) in an organization
 */
export async function getUsersByOrganization(
	organizationId: string,
): Promise<OrganizationUser[]> {
	return await db
		.select({
			id: user.id,
			email: user.email,
			name: user.name,
		})
		.from(member)
		.innerJoin(user, eq(member.userId, user.id))
		.where(eq(member.organizationId, organizationId));
}

