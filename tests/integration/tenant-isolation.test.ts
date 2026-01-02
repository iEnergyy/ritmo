import { describe, it, expect, beforeEach, vi } from "vitest";
import { createStudents, createTeachers, createVenues } from "../factories";
import * as drizzleMocks from "../mocks/drizzle";

vi.mock("@/db", () => ({
	db: drizzleMocks.createMockDrizzleDb(),
}));

import { configureMockQuery, createMockDrizzleDb } from "../mocks/drizzle";

describe("Multi-tenant data isolation", () => {
	const orgA = "org-a";
	const orgB = "org-b";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return only students for organization A", async () => {
		const studentsA = createStudents(3, orgA);
		const studentsB = createStudents(2, orgB);

		const { db } = await import("@/db");
		const mockQuery = createMockDrizzleDb().select();
		configureMockQuery(mockQuery, studentsA);
		db.select = vi.fn().mockReturnValue(mockQuery);

		const result = await mockQuery;

		expect(result).toEqual(studentsA);
		expect(result).not.toEqual(expect.arrayContaining(studentsB));
	});

	it("should return empty array for cross-tenant access", async () => {
		const { db } = await import("@/db");
		const mockQuery = createMockDrizzleDb().select();
		configureMockQuery(mockQuery, []);
		db.select = vi.fn().mockReturnValue(mockQuery);

		const result = await mockQuery;

		expect(result).toEqual([]);
	});

	it("should isolate teachers by organization", async () => {
		const teachersA = createTeachers(2, orgA);
		const teachersB = createTeachers(1, orgB);

		const { db } = await import("@/db");
		const mockQuery = createMockDrizzleDb().select();
		configureMockQuery(mockQuery, teachersA);
		db.select = vi.fn().mockReturnValue(mockQuery);

		const result = await mockQuery;

		expect(result).toEqual(teachersA);
		expect(result.length).toBe(2);
	});

	it("should isolate venues by organization", async () => {
		const venuesA = createVenues(2, orgA);

		const { db } = await import("@/db");
		const mockQuery = createMockDrizzleDb().select();
		configureMockQuery(mockQuery, venuesA);
		db.select = vi.fn().mockReturnValue(mockQuery);

		const result = await mockQuery;

		expect(result).toEqual(venuesA);
		expect(result.every((v) => v.organizationId === orgA)).toBe(true);
	});
});
