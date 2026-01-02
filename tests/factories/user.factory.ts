import { faker } from "@faker-js/faker";

export interface UserFactory {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export function createUser(overrides?: Partial<UserFactory>): UserFactory {
	return {
		id: faker.string.uuid(),
		name: faker.person.fullName(),
		email: faker.internet.email(),
		emailVerified: faker.datatype.boolean(),
		image: faker.image.avatar(),
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent(),
		...overrides,
	};
}

export function createUsers(count: number): UserFactory[] {
	return Array.from({ length: count }, () => createUser());
}
