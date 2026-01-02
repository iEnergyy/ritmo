import { faker } from "@faker-js/faker";

export type UserRole = "admin" | "teacher" | "staff";

export interface MemberFactory {
	id: string;
	organizationId: string;
	userId: string;
	role: string;
	createdAt: Date;
}

export interface OrganizationMemberFactory {
	id: string;
	memberId: string;
	role: UserRole;
	createdAt: Date;
}

export function createMember(
	overrides?: Partial<MemberFactory>,
): MemberFactory {
	return {
		id: faker.string.uuid(),
		organizationId: faker.string.uuid(),
		userId: faker.string.uuid(),
		role: "member",
		createdAt: faker.date.past(),
		...overrides,
	};
}

export function createOrganizationMember(
	overrides?: Partial<OrganizationMemberFactory>,
): OrganizationMemberFactory {
	return {
		id: faker.string.uuid(),
		memberId: faker.string.uuid(),
		role: faker.helpers.arrayElement(["admin", "teacher", "staff"]),
		createdAt: faker.date.past(),
		...overrides,
	};
}

export function createMembers(
	count: number,
	organizationId?: string,
): MemberFactory[] {
	return Array.from({ length: count }, () =>
		createMember(organizationId ? { organizationId } : {}),
	);
}
