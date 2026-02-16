import { describe, it, expect, beforeEach, vi } from "vitest";
import { getEnrollmentsByGroupOnDate } from "@/db/queries/student-groups";
import {
	createMockDrizzleDb,
	configureMockQuery,
} from "../../../mocks/drizzle";
import { createStudent } from "../../../factories";

vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../../mocks/drizzle");
	return { db: createMockDrizzleDb() };
});
vi.mock("@/db/schema", () => ({
	studentGroups: {
		id: {},
		studentId: {},
		groupId: {},
		startDate: {},
		endDate: {},
	},
	students: { id: {}, organizationId: {} },
	groups: { id: {}, organizationId: {} },
}));

describe("db/queries/student-groups getEnrollmentsByGroupOnDate", () => {
	let mockDb: ReturnType<typeof createMockDrizzleDb>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
	});

	it("returns enrollments active on date (startDate <= date, endDate null or >= date)", async () => {
		const groupId = "g-1";
		const orgId = "org-1";
		const date = new Date("2025-06-15");
		const student = createStudent({ organizationId: orgId });
		const mockEnrollments = [
			{
				id: "e-1",
				studentId: student.id,
				groupId,
				startDate: "2025-01-01",
				endDate: null,
				createdAt: new Date(),
				student,
			},
		];

		const mockQuery = createMockDrizzleDb().select();
		configureMockQuery(mockQuery, mockEnrollments);
		vi.mocked(mockDb.select).mockReturnValue(mockQuery);

		const result = await getEnrollmentsByGroupOnDate(groupId, orgId, date);

		expect(result).toHaveLength(1);
		expect(result[0].studentId).toBe(student.id);
		expect(mockDb.select).toHaveBeenCalled();
	});

	it("returns empty when no enrollments match date", async () => {
		const mockQuery = createMockDrizzleDb().select();
		configureMockQuery(mockQuery, []);
		vi.mocked(mockDb.select).mockReturnValue(mockQuery);

		const result = await getEnrollmentsByGroupOnDate(
			"g-1",
			"org-1",
			new Date("2025-06-15"),
		);

		expect(result).toHaveLength(0);
	});
});
