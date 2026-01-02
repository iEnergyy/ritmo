import { faker } from "@faker-js/faker";

export type TeacherPaymentType = "fixed_monthly" | "per_head" | "per_class";

export interface TeacherFactory {
	id: string;
	organizationId: string;
	userId?: string | null;
	fullName: string;
	paymentType: TeacherPaymentType;
	monthlyRate?: string | null;
	ratePerHead?: string | null;
	ratePerClass?: string | null;
	createdAt: Date;
}

export function createTeacher(
	overrides?: Partial<TeacherFactory>,
): TeacherFactory {
	const paymentType = faker.helpers.arrayElement([
		"fixed_monthly",
		"per_head",
		"per_class",
	] as const);

	return {
		id: faker.string.uuid(),
		organizationId: faker.string.uuid(),
		userId: faker.string.uuid(),
		fullName: faker.person.fullName(),
		paymentType,
		monthlyRate: paymentType === "fixed_monthly" ? "1000.00" : null,
		ratePerHead: paymentType === "per_head" ? "10.00" : null,
		ratePerClass: paymentType === "per_class" ? "50.00" : null,
		createdAt: faker.date.past(),
		...overrides,
	};
}

export function createTeachers(
	count: number,
	organizationId?: string,
): TeacherFactory[] {
	return Array.from({ length: count }, () =>
		createTeacher(organizationId ? { organizationId } : {}),
	);
}
