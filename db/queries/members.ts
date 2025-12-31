import { db } from "@/db";
import { member, organizationMembers, user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type Member = InferSelectModel<typeof member>;
export type OrganizationMember = InferSelectModel<typeof organizationMembers>;

// Type for member with joined user and role data
export type MemberWithUser = {
	memberId: string;
	userId: string;
	userEmail: string;
	userName: string;
	role: "admin" | "teacher" | "staff" | null;
	createdAt: Date;
};

/**
 * Get all members of an organization with their user info and custom roles
 */
export async function getMembersByOrganization(
	organizationId: string,
): Promise<MemberWithUser[]> {
	return await db
		.select({
			memberId: member.id,
			userId: member.userId,
			userEmail: user.email,
			userName: user.name,
			role: organizationMembers.role,
			createdAt: member.createdAt,
		})
		.from(member)
		.innerJoin(user, eq(member.userId, user.id))
		.leftJoin(organizationMembers, eq(member.id, organizationMembers.memberId))
		.where(eq(member.organizationId, organizationId));
}

/**
 * Get a member by ID within an organization
 */
export async function getMemberById(
	organizationId: string,
	memberId: string,
): Promise<Member | null> {
	const [memberRecord] = await db
		.select()
		.from(member)
		.where(
			and(eq(member.id, memberId), eq(member.organizationId, organizationId)),
		)
		.limit(1);

	return memberRecord || null;
}

/**
 * Delete a member
 */
export async function deleteMember(memberId: string): Promise<void> {
	await db.delete(member).where(eq(member.id, memberId));
}

/**
 * Get or create organization member role record
 */
export async function getOrganizationMemberRole(
	memberId: string,
): Promise<OrganizationMember | null> {
	const [orgMember] = await db
		.select()
		.from(organizationMembers)
		.where(eq(organizationMembers.memberId, memberId))
		.limit(1);

	return orgMember || null;
}

/**
 * Update organization member role
 */
export async function updateOrganizationMemberRole(
	memberId: string,
	role: "admin" | "teacher" | "staff",
): Promise<void> {
	const existing = await getOrganizationMemberRole(memberId);

	if (existing) {
		await db
			.update(organizationMembers)
			.set({ role })
			.where(eq(organizationMembers.memberId, memberId));
	} else {
		await db.insert(organizationMembers).values({
			memberId,
			role,
		});
	}
}
