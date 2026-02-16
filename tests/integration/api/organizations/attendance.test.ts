import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	GET as GET_SESSION_ATTENDANCE,
	PATCH as PATCH_SESSION_ATTENDANCE,
} from "@/app/api/organizations/[id]/sessions/[sessionId]/attendance/route";
import { GET as GET_ATTENDANCE } from "@/app/api/organizations/[id]/attendance/route";
import { GET as GET_MISSING } from "@/app/api/organizations/[id]/attendance/missing/route";
import { GET as GET_STUDENT_ATTENDANCE } from "@/app/api/organizations/[id]/students/[studentId]/attendance/route";
import { createMockRequest, getResponseJson } from "../../../utils/api-helpers";
import { createMockSession } from "../../../mocks/auth";
import { createClassSessions, createStudent } from "../../../factories";

vi.mock("@/auth/better-auth", async () => {
	const { createMockAuth } = await import("../../../mocks/auth");
	return { auth: createMockAuth() };
});
vi.mock("@/lib/api-helpers", async () => {
	const actual = await vi.importActual("@/lib/api-helpers");
	return {
		...actual,
		getAuthenticatedSession: vi.fn(),
		enforceTenantIsolation: vi.fn(),
	};
});
vi.mock("@/db/queries/class-sessions", () => ({
	getSessionById: vi.fn(),
}));
vi.mock("@/db/queries/attendance", () => ({
	getAttendanceForSessionWithExpected: vi.fn(),
	bulkUpsertAttendanceForSession: vi.fn(),
	getAttendanceByOrganization: vi.fn(),
	getSessionsWithMissingAttendance: vi.fn(),
	getAttendanceByStudent: vi.fn(),
}));
vi.mock("@/db/queries/students", () => ({
	getStudentById: vi.fn(),
}));

describe("API /organizations/[id] attendance", () => {
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

	describe("GET /organizations/[id]/sessions/[sessionId]/attendance", () => {
		it("returns expected and rows for session", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById } = await import("@/db/queries/class-sessions");
			const { getAttendanceForSessionWithExpected } = await import(
				"@/db/queries/attendance"
			);

			const classSession = createClassSessions(1, orgId)[0];
			const student = createStudent({ organizationId: orgId });
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionById).mockResolvedValue({
				...classSession,
				group: { id: "g-1", name: "Group" },
				teacher: { id: "t-1", fullName: "T", organizationId: orgId },
				venue: null,
			});
			vi.mocked(getAttendanceForSessionWithExpected).mockResolvedValue({
				expected: [{ studentId: student.id, student, enrollmentId: "e-1" }],
				rows: [
					{
						studentId: student.id,
						student,
						status: "present" as const,
						recordId: "ar-1",
						markedAt: new Date().toISOString(),
					},
				],
			});

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/${classSession.id}/attendance`,
			);
			const response = await GET_SESSION_ATTENDANCE(request, {
				params: Promise.resolve({ id: orgId, sessionId: classSession.id }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.expected).toHaveLength(1);
			expect(data.rows).toHaveLength(1);
			expect(data.rows[0].status).toBe("present");
		});

		it("returns 404 when session not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById } = await import("@/db/queries/class-sessions");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionById).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/sess-999/attendance`,
			);
			const response = await GET_SESSION_ATTENDANCE(request, {
				params: Promise.resolve({ id: orgId, sessionId: "sess-999" }),
			});

			expect(response.status).toBe(404);
		});
	});

	describe("PATCH /organizations/[id]/sessions/[sessionId]/attendance", () => {
		it("updates attendance with entries", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById } = await import("@/db/queries/class-sessions");
			const { bulkUpsertAttendanceForSession } = await import(
				"@/db/queries/attendance"
			);

			const classSession = createClassSessions(1, orgId)[0];
			const student = createStudent({ organizationId: orgId });

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionById).mockResolvedValue({
				...classSession,
				group: null,
				teacher: { id: "t-1", fullName: "T", organizationId: orgId },
				venue: null,
			});
			vi.mocked(bulkUpsertAttendanceForSession).mockResolvedValue(undefined);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/${classSession.id}/attendance`,
				{
					method: "PATCH",
					body: {
						entries: [{ studentId: student.id, status: "present" }],
					},
				},
			);
			const response = await PATCH_SESSION_ATTENDANCE(request, {
				params: Promise.resolve({ id: orgId, sessionId: classSession.id }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.message).toBe("Attendance updated");
			expect(bulkUpsertAttendanceForSession).toHaveBeenCalledWith(
				orgId,
				classSession.id,
				[{ studentId: student.id, status: "present" }],
			);
		});

		it("returns 400 when entries is not array", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById } = await import("@/db/queries/class-sessions");

			const classSession = createClassSessions(1, orgId)[0];
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionById).mockResolvedValue({
				...classSession,
				group: null,
				teacher: { id: "t-1", fullName: "T", organizationId: orgId },
				venue: null,
			});

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/${classSession.id}/attendance`,
				{ method: "PATCH", body: { entries: "invalid" } },
			);
			const response = await PATCH_SESSION_ATTENDANCE(request, {
				params: Promise.resolve({ id: orgId, sessionId: classSession.id }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(400);
			expect(data.error).toContain("entries");
		});
	});

	describe("GET /organizations/[id]/attendance", () => {
		it("returns records with filters", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getAttendanceByOrganization } = await import(
				"@/db/queries/attendance"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getAttendanceByOrganization).mockResolvedValue([]);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/attendance?status=present`,
			);
			const response = await GET_ATTENDANCE(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.records).toEqual([]);
			expect(getAttendanceByOrganization).toHaveBeenCalledWith(
				orgId,
				expect.objectContaining({ status: "present" }),
			);
		});
	});

	describe("GET /organizations/[id]/attendance/missing", () => {
		it("returns sessions with missing attendance", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionsWithMissingAttendance } = await import(
				"@/db/queries/attendance"
			);

			const classSession = createClassSessions(1, orgId)[0];
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionsWithMissingAttendance).mockResolvedValue([
				{
					...classSession,
					group: { id: "g-1", name: "G" },
					teacher: { id: "t-1", fullName: "T", organizationId: orgId },
					venue: null,
				},
			]);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/attendance/missing`,
			);
			const response = await GET_MISSING(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.sessions).toHaveLength(1);
		});
	});

	describe("GET /organizations/[id]/students/[studentId]/attendance", () => {
		it("returns attendance records for student", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getStudentById } = await import("@/db/queries/students");
			const { getAttendanceByStudent } = await import(
				"@/db/queries/attendance"
			);

			const student = createStudent({ organizationId: orgId });
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getStudentById).mockResolvedValue(student);
			vi.mocked(getAttendanceByStudent).mockResolvedValue([]);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/students/${student.id}/attendance`,
			);
			const response = await GET_STUDENT_ATTENDANCE(request, {
				params: Promise.resolve({ id: orgId, studentId: student.id }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.records).toEqual([]);
		});

		it("returns 404 when student not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getStudentById } = await import("@/db/queries/students");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getStudentById).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/students/student-999/attendance`,
			);
			const response = await GET_STUDENT_ATTENDANCE(request, {
				params: Promise.resolve({ id: orgId, studentId: "student-999" }),
			});

			expect(response.status).toBe(404);
		});
	});
});
