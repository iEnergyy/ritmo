import { faker } from "@faker-js/faker";

export interface StudentFactory {
	id: string;
	organizationId: string;
	fullName: string;
	email?: string | null;
	phone?: string | null;
	createdAt: Date;
}

export function createStudent(
	overrides?: Partial<StudentFactory>,
): StudentFactory {
	return {
		id: faker.string.uuid(),
		organizationId: faker.string.uuid(),
		fullName: faker.person.fullName(),
		email: faker.internet.email(),
		phone: faker.phone.number(),
		createdAt: faker.date.past(),
		...overrides,
	};
}

export function createStudents(
	count: number,
	organizationId?: string,
): StudentFactory[] {
	return Array.from({ length: count }, () =>
		createStudent(organizationId ? { organizationId } : {}),
	);
}
