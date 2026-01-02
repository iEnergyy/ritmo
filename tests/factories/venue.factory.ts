import { faker } from "@faker-js/faker";

export interface VenueFactory {
	id: string;
	organizationId: string;
	name: string;
	address?: string | null;
	createdAt: Date;
}

export function createVenue(overrides?: Partial<VenueFactory>): VenueFactory {
	return {
		id: faker.string.uuid(),
		organizationId: faker.string.uuid(),
		name: faker.company.name() + " Studio",
		address: faker.location.streetAddress(),
		createdAt: faker.date.past(),
		...overrides,
	};
}

export function createVenues(
	count: number,
	organizationId?: string,
): VenueFactory[] {
	return Array.from({ length: count }, () =>
		createVenue(organizationId ? { organizationId } : {}),
	);
}
