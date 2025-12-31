import { db } from "@/db";
import { invitation, member, user } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export type Invitation = InferSelectModel<typeof invitation>;
export type InvitationInsert = InferInsertModel<typeof invitation>;

/**
 * Get all invitations for an organization
 */
export async function getInvitationsByOrganization(
  organizationId: string,
): Promise<Invitation[]> {
  return await db
    .select()
    .from(invitation)
    .where(eq(invitation.organizationId, organizationId))
    .orderBy(desc(invitation.createdAt));
}

/**
 * Check if a user with email is already a member of an organization
 */
export async function isEmailMemberOfOrganization(
  email: string,
  organizationId: string,
): Promise<boolean> {
  const [existingMember] = await db
    .select()
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(user.email, email),
      ),
    )
    .limit(1);

  return !!existingMember;
}

/**
 * Check if a pending invitation exists for an email
 */
export async function hasPendingInvitation(
  email: string,
  organizationId: string,
): Promise<boolean> {
  const [existingInvitation] = await db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, organizationId),
        eq(invitation.email, email),
        eq(invitation.status, "pending"),
      ),
    )
    .limit(1);

  return !!existingInvitation;
}

/**
 * Create a new invitation
 */
export async function createInvitation(
  data: InvitationInsert,
): Promise<Invitation> {
  const [newInvitation] = await db
    .insert(invitation)
    .values(data)
    .returning();

  return newInvitation;
}

