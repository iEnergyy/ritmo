import { faker } from "@faker-js/faker";

export interface OrganizationFactory {
	id: string;
	name: string;
	slug: string;
	logo?: string | null;
	createdAt: Date;
	metadata?: string | null;
}

export function createOrganization(
	overrides?: Partial<OrganizationFactory>,
): OrganizationFactory {
	return {
		id: faker.string.uuid(),
		name: faker.company.name(),
		slug: faker.string.alphanumeric(10).toLowerCase(),
		logo: null,
		createdAt: faker.date.past(),
		metadata: null,
		...overrides,
	};
}

export function createOrganizations(count: number): OrganizationFactory[] {
	return Array.from({ length: count }, () => createOrganization());
}
