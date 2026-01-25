import { faker } from "@faker-js/faker";

export type ClassSessionStatus = "scheduled" | "held" | "cancelled";

export interface ClassSessionFactory {
	id: string;
	organizationId: string;
	groupId: string | null;
	venueId: string | null;
	teacherId: string;
	date: string;
	startTime: string | null;
	endTime: string | null;
	status: ClassSessionStatus;
	createdAt: Date;
}

export function createClassSession(
	overrides?: Partial<ClassSessionFactory>,
): ClassSessionFactory {
	const start = "10:00";
	const end = "11:00";
	return {
		id: faker.string.uuid(),
		organizationId: faker.string.uuid(),
		groupId: null,
		venueId: null,
		teacherId: faker.string.uuid(),
		date: faker.date.soon({ days: 30 }).toISOString().slice(0, 10),
		startTime: start,
		endTime: end,
		status: "scheduled",
		createdAt: faker.date.past(),
		...overrides,
	};
}

export function createClassSessions(
	count: number,
	organizationId?: string,
	overrides?: Partial<ClassSessionFactory>,
): ClassSessionFactory[] {
	return Array.from({ length: count }, () =>
		createClassSession(
			organizationId ? { organizationId, ...overrides } : overrides,
		),
	);
}
