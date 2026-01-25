import { faker } from "@faker-js/faker";

export type GroupStatus = "active" | "paused" | "closed";

export interface GroupFactory {
	id: string;
	organizationId: string;
	venueId: string | null;
	teacherId: string;
	name: string;
	status: GroupStatus;
	startedAt: Date | null;
	createdAt: Date;
}

export function createGroup(overrides?: Partial<GroupFactory>): GroupFactory {
	return {
		id: faker.string.uuid(),
		organizationId: faker.string.uuid(),
		venueId: null,
		teacherId: faker.string.uuid(),
		name: faker.helpers.arrayElement(["Beginners", "Intermediate", "Advanced"]),
		status: "active",
		startedAt: faker.date.past(),
		createdAt: faker.date.past(),
		...overrides,
	};
}

export function createGroups(
	count: number,
	organizationId?: string,
): GroupFactory[] {
	return Array.from({ length: count }, () =>
		createGroup(organizationId ? { organizationId } : {}),
	);
}
