import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	getPrivateSessionsByOrganization,
	getPrivateSessionById,
	createPrivateSession,
	updatePrivateSession,
	deletePrivateSession,
	getPrivateSessionsByTeacher,
	getPrivateSessionsByStudent,
} from "@/db/queries/private-sessions";
import {
	createMockDrizzleDb,
	configureMockQuery,
} from "../../../mocks/drizzle";

vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../../mocks/drizzle");
	return { db: createMockDrizzleDb() };
});
vi.mock("@/db/schema", () => ({
	privateSessions: {
		id: {},
		organizationId: {},
		teacherId: {},
		venueId: {},
		date: {},
		durationMinutes: {},
		status: {},
		createdAt: {},
	},
	privateSessionStudents: {
		privateSessionId: {},
		studentId: {},
	},
	teachers: { id: {}, fullName: {} },
	venues: { id: {}, name: {} },
	students: { id: {}, fullName: {} },
}));
vi.mock("@/db/queries/teachers", () => ({
	getTeacherByIdSimple: vi.fn(),
}));
vi.mock("@/db/queries/venues", () => ({
	getVenueById: vi.fn(),
}));
vi.mock("@/db/queries/students", () => ({
	getStudentById: vi.fn(),
}));

describe("db/queries/private-sessions", () => {
	const orgId = "org-1";
	let mockDb: ReturnType<typeof createMockDrizzleDb>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
		const { getTeacherByIdSimple } = await import("@/db/queries/teachers");
		const { getVenueById } = await import("@/db/queries/venues");
		const { getStudentById } = await import("@/db/queries/students");
		vi.mocked(getTeacherByIdSimple).mockResolvedValue({
			id: "teacher-1",
			organizationId: orgId,
			fullName: "Teacher One",
			userId: null,
			paymentType: "per_class",
			monthlyRate: null,
			ratePerHead: null,
			ratePerClass: "50",
			createdAt: new Date(),
		});
		vi.mocked(getVenueById).mockResolvedValue({
			id: "venue-1",
			organizationId: orgId,
			name: "Studio",
			address: null,
			createdAt: new Date(),
		});
		vi.mocked(getStudentById).mockResolvedValue({
			id: "student-1",
			organizationId: orgId,
			fullName: "Student One",
			email: null,
			phone: null,
			createdAt: new Date(),
		});
	});

	describe("getPrivateSessionsByOrganization", () => {
		it("returns empty array when no sessions", async () => {
			const mockSelect = createMockDrizzleDb().select();
			configureMockQuery(mockSelect, []);
			vi.mocked(mockDb.select).mockReturnValue(mockSelect);

			const result = await getPrivateSessionsByOrganization(orgId);

			expect(result).toEqual([]);
			expect(mockDb.select).toHaveBeenCalled();
		});

		it("returns sessions with teacher, venue, and students", async () => {
			const sessionRows = [
				{
					id: "ps-1",
					organizationId: orgId,
					teacherId: "teacher-1",
					venueId: "venue-1",
					date: "2026-02-01",
					durationMinutes: 60,
					status: "scheduled",
					createdAt: new Date(),
					teacher: { id: "teacher-1", fullName: "Teacher One" },
					venue: { id: "venue-1", name: "Studio" },
				},
			];
			const mockSelect1 = createMockDrizzleDb().select();
			configureMockQuery(mockSelect1, sessionRows);
			const mockSelect2 = createMockDrizzleDb().select();
			configureMockQuery(mockSelect2, [
				{
					privateSessionId: "ps-1",
					studentId: "student-1",
					studentFullName: "Student One",
				},
			]);
			vi.mocked(mockDb.select)
				.mockReturnValueOnce(mockSelect1)
				.mockReturnValueOnce(mockSelect2);

			const result = await getPrivateSessionsByOrganization(orgId);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("ps-1");
			expect(result[0].teacher.fullName).toBe("Teacher One");
			expect(result[0].students).toHaveLength(1);
			expect(result[0].students[0].fullName).toBe("Student One");
		});

		it("returns empty when filtering by studentId with no matching sessions", async () => {
			const mockSelectIds = createMockDrizzleDb().select();
			configureMockQuery(mockSelectIds, []);
			vi.mocked(mockDb.select).mockReturnValue(mockSelectIds);

			const result = await getPrivateSessionsByOrganization(orgId, {
				studentId: "student-999",
			});

			expect(result).toEqual([]);
		});
	});

	describe("getPrivateSessionById", () => {
		it("returns null when not found", async () => {
			const mockSelect1 = createMockDrizzleDb().select();
			configureMockQuery(mockSelect1, []);
			vi.mocked(mockDb.select).mockReturnValue(mockSelect1);

			const result = await getPrivateSessionById(orgId, "ps-999");

			expect(result).toBeNull();
		});

		it("returns session with students when found", async () => {
			const sessionRow = {
				id: "ps-1",
				organizationId: orgId,
				teacherId: "teacher-1",
				venueId: "venue-1",
				date: "2026-02-01",
				durationMinutes: 60,
				status: "scheduled",
				createdAt: new Date(),
				teacher: { id: "teacher-1", fullName: "Teacher One" },
				venue: { id: "venue-1", name: "Studio" },
			};
			const mockSelect1 = createMockDrizzleDb().select();
			configureMockQuery(mockSelect1, [sessionRow]);
			const mockSelect2 = createMockDrizzleDb().select();
			configureMockQuery(mockSelect2, [
				{ id: "student-1", fullName: "Student One" },
			]);
			vi.mocked(mockDb.select)
				.mockReturnValueOnce(mockSelect1)
				.mockReturnValueOnce(mockSelect2);

			const result = await getPrivateSessionById(orgId, "ps-1");

			expect(result).not.toBeNull();
			expect(result?.id).toBe("ps-1");
			expect(result?.students).toHaveLength(1);
		});
	});

	describe("createPrivateSession", () => {
		it("throws when studentIds is empty", async () => {
			await expect(
				createPrivateSession(orgId, {
					teacherId: "teacher-1",
					date: "2026-02-01",
					durationMinutes: 60,
					status: "scheduled",
					studentIds: [],
				}),
			).rejects.toThrow("At least one student is required");
		});

		it("throws when teacher not found", async () => {
			const { getTeacherByIdSimple } = await import("@/db/queries/teachers");
			vi.mocked(getTeacherByIdSimple).mockResolvedValue(null);

			await expect(
				createPrivateSession(orgId, {
					teacherId: "teacher-999",
					date: "2026-02-01",
					durationMinutes: 60,
					status: "scheduled",
					studentIds: ["student-1"],
				}),
			).rejects.toThrow("Teacher not found");
		});

		it("creates session and junction rows then returns session with relations", async () => {
			const newSession = {
				id: "ps-new",
				organizationId: orgId,
				teacherId: "teacher-1",
				venueId: null,
				date: "2026-02-01",
				durationMinutes: 60,
				status: "scheduled",
				createdAt: new Date(),
			};
			const mockInsert = createMockDrizzleDb().insert();
			mockInsert.values = vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([newSession]),
			});
			vi.mocked(mockDb.insert).mockReturnValue(mockInsert);

			const mockSelect1 = createMockDrizzleDb().select();
			configureMockQuery(mockSelect1, [
				{
					...newSession,
					teacher: { id: "teacher-1", fullName: "Teacher One" },
					venue: null,
				},
			]);
			const mockSelect2 = createMockDrizzleDb().select();
			configureMockQuery(mockSelect2, [
				{ id: "student-1", fullName: "Student One" },
			]);
			vi.mocked(mockDb.select)
				.mockReturnValueOnce(mockSelect1)
				.mockReturnValueOnce(mockSelect2);

			const result = await createPrivateSession(orgId, {
				teacherId: "teacher-1",
				date: "2026-02-01",
				durationMinutes: 60,
				status: "scheduled",
				studentIds: ["student-1"],
			});

			expect(result.id).toBe("ps-new");
			expect(result.students).toHaveLength(1);
			expect(mockDb.insert).toHaveBeenCalled();
		});
	});

	describe("updatePrivateSession", () => {
		it("returns null when session not found", async () => {
			const mockSelect = createMockDrizzleDb().select();
			configureMockQuery(mockSelect, []);
			vi.mocked(mockDb.select).mockReturnValue(mockSelect);

			const result = await updatePrivateSession(orgId, "ps-999", {
				status: "held",
			});

			expect(result).toBeNull();
		});

		it("throws when studentIds is empty array", async () => {
			const sessionRow = {
				id: "ps-1",
				organizationId: orgId,
				teacherId: "teacher-1",
				venueId: null,
				date: "2026-02-01",
				durationMinutes: 60,
				status: "scheduled",
				createdAt: new Date(),
				teacher: { id: "teacher-1", fullName: "Teacher One" },
				venue: null,
				students: [{ id: "student-1", fullName: "Student One" }],
			};
			const mockSelect = createMockDrizzleDb().select();
			configureMockQuery(mockSelect, [sessionRow]);
			vi.mocked(mockDb.select).mockReturnValue(mockSelect);

			await expect(
				updatePrivateSession(orgId, "ps-1", { studentIds: [] }),
			).rejects.toThrow("At least one student is required");
		});
	});

	describe("deletePrivateSession", () => {
		it("returns false when session not found", async () => {
			const mockSelect = createMockDrizzleDb().select();
			configureMockQuery(mockSelect, []);
			vi.mocked(mockDb.select).mockReturnValue(mockSelect);

			const result = await deletePrivateSession(orgId, "ps-999");

			expect(result).toBe(false);
		});

		it("deletes junction and session when found", async () => {
			const mockSelect = createMockDrizzleDb().select();
			configureMockQuery(mockSelect, [{ id: "ps-1" }]);
			const mockDelete = createMockDrizzleDb().delete();
			mockDelete.where = vi.fn().mockResolvedValue(undefined);
			vi.mocked(mockDb.select).mockReturnValue(mockSelect);
			vi.mocked(mockDb.delete).mockReturnValue(mockDelete);

			const result = await deletePrivateSession(orgId, "ps-1");

			expect(result).toBe(true);
			expect(mockDb.delete).toHaveBeenCalled();
		});
	});

	describe("getPrivateSessionsByTeacher", () => {
		it("calls getPrivateSessionsByOrganization with teacherId filter", async () => {
			const mockSelect = createMockDrizzleDb().select();
			configureMockQuery(mockSelect, []);
			vi.mocked(mockDb.select).mockReturnValue(mockSelect);

			const result = await getPrivateSessionsByTeacher(orgId, "teacher-1");

			expect(result).toEqual([]);
			expect(mockDb.select).toHaveBeenCalled();
		});
	});

	describe("getPrivateSessionsByStudent", () => {
		it("returns empty when student has no sessions", async () => {
			const mockSelectIds = createMockDrizzleDb().select();
			configureMockQuery(mockSelectIds, []);
			vi.mocked(mockDb.select).mockReturnValue(mockSelectIds);

			const result = await getPrivateSessionsByStudent(orgId, "student-1");

			expect(result).toEqual([]);
		});
	});
});
