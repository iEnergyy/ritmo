import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	getStudentsByOrganization,
	getStudentById,
	createStudent,
	updateStudent,
	deleteStudent,
} from "@/db/queries/students";
import {
	createMockDrizzleDb,
	configureMockQuery,
} from "../../../mocks/drizzle";
import { createStudents } from "../../../factories";

// Mock database
vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../../mocks/drizzle");
	return {
		db: createMockDrizzleDb(),
	};
});

// Mock schema
vi.mock("@/db/schema", () => ({
	students: {
		id: {},
		organizationId: {},
		fullName: {},
		email: {},
		phone: {},
	},
}));

describe("db/queries/students", () => {
	let mockDb: ReturnType<typeof createMockDrizzleDb>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
	});

	describe("getStudentsByOrganization", () => {
		it("should return all students for organization", async () => {
			const orgId = "org-123";
			const mockStudents = createStudents(3, orgId);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockStudents);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getStudentsByOrganization(orgId);

			expect(result).toEqual(mockStudents);
			expect(mockDb.select).toHaveBeenCalled();
		});

		it("should filter students by search term", async () => {
			const orgId = "org-123";
			const search = "John";
			const mockStudents = createStudents(2, orgId);
			mockStudents[0].fullName = "John Doe";

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, [mockStudents[0]]);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getStudentsByOrganization(orgId, search);

			expect(result).toEqual([mockStudents[0]]);
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
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getStudentById(orgId, studentId);

			expect(result).toEqual(mockStudent);
		});

		it("should return null when not found", async () => {
			const orgId = "org-123";
			const studentId = "student-123";

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getStudentById(orgId, studentId);

			expect(result).toBeNull();
		});
	});

	describe("createStudent", () => {
		it("should create a new student", async () => {
			const orgId = "org-123";
			const newStudent = createStudents(1, orgId)[0];

			const mockInsert = createMockDrizzleDb().insert();
			mockInsert.values = vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([newStudent]),
			});
			vi.mocked(mockDb.insert).mockReturnValue(mockInsert);

			const result = await createStudent({
				organizationId: orgId,
				fullName: newStudent.fullName,
				email: newStudent.email || null,
				phone: newStudent.phone || null,
			});

			expect(result).toEqual(newStudent);
			expect(mockDb.insert).toHaveBeenCalled();
		});
	});

	describe("updateStudent", () => {
		it("should update student", async () => {
			const studentId = "student-123";
			const existingStudent = createStudents(1, "org-123")[0];
			existingStudent.id = studentId;

			const updatedStudent = { ...existingStudent, fullName: "Updated Name" };

			const mockUpdate = createMockDrizzleDb().update();
			mockUpdate.set = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([updatedStudent]),
				}),
			});
			vi.mocked(mockDb.update).mockReturnValue(mockUpdate);

			const result = await updateStudent(studentId, existingStudent, {
				fullName: "Updated Name",
			});

			expect(result).toEqual(updatedStudent);
		});
	});

	describe("deleteStudent", () => {
		it("should delete student", async () => {
			const studentId = "student-123";

			const mockDelete = createMockDrizzleDb().delete();
			mockDelete.where = vi.fn().mockResolvedValue(undefined);
			vi.mocked(mockDb.delete).mockReturnValue(mockDelete);

			await deleteStudent(studentId);

			expect(mockDb.delete).toHaveBeenCalled();
		});
	});
});
