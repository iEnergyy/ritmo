import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "@/app/api/organizations/[id]/students/route";
import {
	GET as GET_STUDENT,
	PATCH,
	DELETE,
} from "@/app/api/organizations/[id]/students/[studentId]/route";
import { createMockRequest, getResponseJson } from "../../../utils/api-helpers";
import { createMockAuth, createMockSession } from "../../../mocks/auth";
import {
	createMockDrizzleDb,
	configureMockQuery,
} from "../../../mocks/drizzle";
import { createStudents } from "../../../factories";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/auth/better-auth", async () => {
	const { createMockAuth } = await import("../../../mocks/auth");
	return {
		auth: createMockAuth(),
	};
});
vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../../mocks/drizzle");
	return {
		db: createMockDrizzleDb(),
	};
});
vi.mock("@/lib/api-helpers", async () => {
	const actual = await vi.importActual("@/lib/api-helpers");
	return {
		...actual,
		getAuthenticatedSession: vi.fn(),
		enforceTenantIsolation: vi.fn(),
	};
});
vi.mock("@/db/queries/students", () => ({
	getStudentsByOrganization: vi.fn(),
	createStudent: vi.fn(),
	getStudentById: vi.fn(),
	updateStudent: vi.fn(),
	deleteStudent: vi.fn(),
}));

describe("API /organizations/[id]/students", () => {
	const orgId = "org-123";
	const userId = "user-123";
	const session = createMockSession({
		user: { id: userId, name: "Test", email: "test@example.com" },
		session: {
			id: "session-123",
			expiresAt: new Date(),
			activeOrganizationId: orgId,
		},
	});

	beforeEach(async () => {
		vi.clearAllMocks();
		const { auth } = await import("@/auth/better-auth");
		auth.api.getSession = vi.fn().mockResolvedValue(session);
	});

	describe("GET /organizations/[id]/students", () => {
		it("should return list of students", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getStudentsByOrganization } = await import(
				"@/db/queries/students"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const mockStudents = createStudents(3, orgId);
			vi.mocked(getStudentsByOrganization).mockResolvedValue(mockStudents);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/students`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.students).toHaveLength(3);
		});

		it("should return 401 if not authenticated", async () => {
			const { getAuthenticatedSession } = await import("@/lib/api-helpers");
			const { NextResponse } = await import("next/server");
			vi.mocked(getAuthenticatedSession).mockImplementation(() => {
				throw new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
				});
			});

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/students`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ id: orgId }),
			});

			expect(response.status).toBe(401);
		});
	});

	describe("POST /organizations/[id]/students", () => {
		it("should create a new student", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { createStudent } = await import("@/db/queries/students");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const newStudent = createStudents(1, orgId)[0];
			vi.mocked(createStudent).mockResolvedValue(newStudent);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/students`,
				{
					method: "POST",
					body: {
						fullName: newStudent.fullName,
						email: newStudent.email,
						phone: newStudent.phone,
					},
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(201);
			expect(data.student).toBeDefined();
		});

		it("should return 400 if fullName is missing", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/students`,
				{
					method: "POST",
					body: { email: "test@example.com" },
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(400);
			expect(data.error).toBe("Full name is required");
		});
	});

	describe("GET /organizations/[id]/students/[studentId]", () => {
		it("should return student when found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getStudentById } = await import("@/db/queries/students");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const student = createStudents(1, orgId)[0];
			vi.mocked(getStudentById).mockResolvedValue(student);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/students/${student.id}`,
			);
			const response = await GET_STUDENT(request, {
				params: Promise.resolve({ id: orgId, studentId: student.id }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			// Dates are serialized to strings in JSON responses
			const expectedStudent = {
				...student,
				createdAt: student.createdAt.toISOString(),
			};
			expect(data.student).toEqual(expectedStudent);
		});

		it("should return 404 when student not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getStudentById } = await import("@/db/queries/students");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getStudentById).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/students/student-123`,
			);
			const response = await GET_STUDENT(request, {
				params: Promise.resolve({ id: orgId, studentId: "student-123" }),
			});

			expect(response.status).toBe(404);
		});
	});

	describe("PATCH /organizations/[id]/students/[studentId]", () => {
		it("should update student", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getStudentById, updateStudent } = await import(
				"@/db/queries/students"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const existingStudent = createStudents(1, orgId)[0];
			const updatedStudent = { ...existingStudent, fullName: "Updated Name" };

			vi.mocked(getStudentById).mockResolvedValue(existingStudent);
			vi.mocked(updateStudent).mockResolvedValue(updatedStudent);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/students/${existingStudent.id}`,
				{
					method: "PATCH",
					body: { fullName: "Updated Name" },
				},
			);

			const response = await PATCH(request, {
				params: Promise.resolve({ id: orgId, studentId: existingStudent.id }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.student.fullName).toBe("Updated Name");
		});
	});

	describe("DELETE /organizations/[id]/students/[studentId]", () => {
		it("should delete student", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getStudentById, deleteStudent } = await import(
				"@/db/queries/students"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const student = createStudents(1, orgId)[0];
			vi.mocked(getStudentById).mockResolvedValue(student);
			vi.mocked(deleteStudent).mockResolvedValue(undefined);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/students/${student.id}`,
				{ method: "DELETE" },
			);

			const response = await DELETE(request, {
				params: Promise.resolve({ id: orgId, studentId: student.id }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.message).toBe("Student deleted successfully");
		});
	});
});
