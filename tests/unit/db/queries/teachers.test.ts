import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	getTeachersByOrganization,
	getTeacherById,
	createTeacher,
	updateTeacher,
	deleteTeacher,
} from "@/db/queries/teachers";
import {
	createMockDrizzleDb,
	configureMockQuery,
} from "../../../mocks/drizzle";
import { createTeachers } from "../../../factories";

vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../../mocks/drizzle");
	return {
		db: createMockDrizzleDb(),
	};
});
vi.mock("@/db/schema", () => ({
	teachers: { id: {}, organizationId: {}, userId: {}, fullName: {} },
	user: { id: {}, email: {}, name: {} },
	member: { id: {} },
}));

describe("db/queries/teachers", () => {
	let mockDb: ReturnType<typeof createMockDrizzleDb>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
	});

	describe("getTeachersByOrganization", () => {
		it("should return all teachers for organization", async () => {
			const orgId = "org-123";
			const mockTeachers = createTeachers(3, orgId);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockTeachers);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getTeachersByOrganization(orgId);
			expect(result).toHaveLength(3);
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
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getTeacherById(orgId, teacherId);
			expect(result).toEqual(mockTeacher);
		});
	});

	describe("createTeacher", () => {
		it("should create a new teacher", async () => {
			const newTeacher = createTeachers(1, "org-123")[0];

			const mockInsert = createMockDrizzleDb().insert();
			mockInsert.values = vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([newTeacher]),
			});
			vi.mocked(mockDb.insert).mockReturnValue(mockInsert);

			const result = await createTeacher({
				organizationId: newTeacher.organizationId,
				fullName: newTeacher.fullName,
				paymentType: newTeacher.paymentType,
				monthlyRate: newTeacher.monthlyRate || null,
				ratePerHead: newTeacher.ratePerHead || null,
				ratePerClass: newTeacher.ratePerClass || null,
			});

			expect(result).toEqual(newTeacher);
		});
	});

	describe("updateTeacher", () => {
		it("should update teacher", async () => {
			const existingTeacher = createTeachers(1, "org-123")[0];
			const updatedTeacher = { ...existingTeacher, fullName: "Updated Name" };

			const mockUpdate = createMockDrizzleDb().update();
			mockUpdate.set = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([updatedTeacher]),
				}),
			});
			vi.mocked(mockDb.update).mockReturnValue(mockUpdate);

			const result = await updateTeacher(existingTeacher.id, existingTeacher, {
				fullName: "Updated Name",
			});

			expect(result).toEqual(updatedTeacher);
		});
	});

	describe("deleteTeacher", () => {
		it("should delete teacher", async () => {
			const mockDelete = createMockDrizzleDb().delete();
			mockDelete.where = vi.fn().mockResolvedValue(undefined);
			vi.mocked(mockDb.delete).mockReturnValue(mockDelete);

			await deleteTeacher("teacher-123");
			expect(mockDb.delete).toHaveBeenCalled();
		});
	});
});
