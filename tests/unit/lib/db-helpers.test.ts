import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	scopedQuery,
	getStudentsByOrganization,
	getStudentById,
	getTeachersByOrganization,
	getTeacherById,
	getVenuesByOrganization,
	getVenueById,
} from "@/lib/db-helpers";
import { createMockDrizzleDb, configureMockQuery } from "../../mocks/drizzle";
import { createStudents, createTeachers, createVenues } from "../../factories";

// Mock the database module
vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../mocks/drizzle");
	return {
		db: createMockDrizzleDb(),
	};
});

// Mock schema tables
vi.mock("@/db/schema", () => ({
	students: { id: {}, organizationId: {} },
	teachers: { id: {}, organizationId: {} },
	venues: { id: {}, organizationId: {} },
	groups: { id: {}, organizationId: {} },
	classSessions: { id: {}, organizationId: {} },
	attendanceRecords: { classSessionId: {} },
	studentPayments: { id: {}, organizationId: {} },
	teacherPayouts: { id: {}, organizationId: {} },
	studentGroups: { studentId: {} },
}));

describe("lib/db-helpers", () => {
	let mockDb: ReturnType<typeof createMockDrizzleDb>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
	});

	describe("scopedQuery", () => {
		it("should throw error if organizationId is missing", () => {
			const mockTable = { organizationId: {} };
			expect(() => scopedQuery(mockTable as any, "")).toThrow(
				"Organization ID is required for scoped queries",
			);
		});

		it("should create a scoped query with organizationId filter", async () => {
			const mockTable = { organizationId: {} };
			const orgId = "org-123";
			const mockData = [{ id: "1", organizationId: orgId }];

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockData);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = scopedQuery(mockTable as any, orgId);

			expect(mockDb.select).toHaveBeenCalled();
		});
	});

	describe("getStudentsByOrganization", () => {
		it("should return students for organization", async () => {
			const orgId = "org-123";
			const mockStudents = createStudents(3, orgId);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockStudents);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getStudentsByOrganization(orgId);

			expect(mockDb.select).toHaveBeenCalled();
			expect(result).toEqual(mockStudents);
		});

		it("should return empty array for organization with no students", async () => {
			const orgId = "org-123";
			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getStudentsByOrganization(orgId);

			expect(result).toEqual([]);
		});
	});

	describe("getStudentById", () => {
		it("should return student when found", async () => {
			const orgId = "org-123";
			const studentId = "student-123";
			const mockStudent = createStudents(1, orgId)[0];
			mockStudent.id = studentId;

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, [mockStudent]);
			mockDb.select = vi.fn().mockReturnValue(mockQuery);

			const result = await getStudentById(studentId, orgId);

			expect(mockDb.select).toHaveBeenCalled();
			expect(result).toEqual(mockStudent);
		});

		it("should return null when student not found", async () => {
			const orgId = "org-123";
			const studentId = "student-123";

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getStudentById(studentId, orgId);

			expect(result).toBeNull();
		});
	});

	describe("getTeachersByOrganization", () => {
		it("should return teachers for organization", async () => {
			const orgId = "org-123";
			const mockTeachers = createTeachers(3, orgId);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockTeachers);
			mockDb.select = vi.fn().mockReturnValue(mockQuery);

			const result = await getTeachersByOrganization(orgId);

			expect(mockDb.select).toHaveBeenCalled();
			expect(result).toEqual(mockTeachers);
		});
	});

	describe("getTeacherById", () => {
		it("should return teacher when found", async () => {
			const orgId = "org-123";
			const teacherId = "teacher-123";
			const mockTeacher = createTeachers(1, orgId)[0];
			mockTeacher.id = teacherId;

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, [mockTeacher]);
			mockDb.select = vi.fn().mockReturnValue(mockQuery);

			const result = await getTeacherById(teacherId, orgId);

			expect(result).toEqual(mockTeacher);
		});

		it("should return null when teacher not found", async () => {
			const orgId = "org-123";
			const teacherId = "teacher-123";

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getTeacherById(teacherId, orgId);

			expect(result).toBeNull();
		});
	});

	describe("getVenuesByOrganization", () => {
		it("should return venues for organization", async () => {
			const orgId = "org-123";
			const mockVenues = createVenues(3, orgId);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockVenues);
			mockDb.select = vi.fn().mockReturnValue(mockQuery);

			const result = await getVenuesByOrganization(orgId);

			expect(result).toEqual(mockVenues);
		});
	});

	describe("getVenueById", () => {
		it("should return venue when found", async () => {
			const orgId = "org-123";
			const venueId = "venue-123";
			const mockVenue = createVenues(1, orgId)[0];
			mockVenue.id = venueId;

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, [mockVenue]);
			mockDb.select = vi.fn().mockReturnValue(mockQuery);

			const result = await getVenueById(venueId, orgId);

			expect(result).toEqual(mockVenue);
		});

		it("should return null when venue not found", async () => {
			const orgId = "org-123";
			const venueId = "venue-123";

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getVenueById(venueId, orgId);

			expect(result).toBeNull();
		});
	});
});
