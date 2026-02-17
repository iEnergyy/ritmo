import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "@/app/api/organizations/[id]/private-sessions/route";
import {
	GET as GET_SESSION,
	PATCH,
	DELETE,
} from "@/app/api/organizations/[id]/private-sessions/[sessionId]/route";
import { createMockRequest, getResponseJson } from "../../../utils/api-helpers";
import { createMockSession } from "../../../mocks/auth";
import { createTeacher, createStudent } from "../../../factories";
import { NextResponse } from "next/server";

vi.mock("@/auth/better-auth", async () => {
	const { createMockAuth } = await import("../../../mocks/auth");
	return { auth: createMockAuth() };
});
vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../../mocks/drizzle");
	return { db: createMockDrizzleDb() };
});
vi.mock("@/lib/api-helpers", async () => {
	const actual = await vi.importActual("@/lib/api-helpers");
	return {
		...actual,
		getAuthenticatedSession: vi.fn(),
		enforceTenantIsolation: vi.fn(),
	};
});
vi.mock("@/db/queries/private-sessions", () => ({
	getPrivateSessionsByOrganization: vi.fn(),
	getPrivateSessionById: vi.fn(),
	createPrivateSession: vi.fn(),
	updatePrivateSession: vi.fn(),
	deletePrivateSession: vi.fn(),
	getPrivateSessionsByTeacher: vi.fn(),
	getPrivateSessionsByStudent: vi.fn(),
}));

describe("API /organizations/[id]/private-sessions", () => {
	const orgId = "org-123";
	const sessionId = "ps-123";
	const userId = "user-123";
	const session = createMockSession({
		user: { id: userId, name: "Test", email: "test@example.com" },
		session: {
			id: "session-123",
			expiresAt: new Date(),
			activeOrganizationId: orgId,
		},
	});

	const mockPrivateSessionWithRelations = {
		id: sessionId,
		organizationId: orgId,
		teacherId: "teacher-1",
		venueId: null,
		date: "2026-02-01",
		durationMinutes: 60,
		status: "scheduled" as const,
		createdAt: new Date(),
		teacher: { id: "teacher-1", fullName: "Teacher One" },
		venue: null,
		students: [{ id: "student-1", fullName: "Student One" }],
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		const { auth } = await import("@/auth/better-auth");
		auth.api.getSession = vi.fn().mockResolvedValue(session);
	});

	describe("GET /organizations/[id]/private-sessions", () => {
		it("should return list of private sessions", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getPrivateSessionsByOrganization } = await import(
				"@/db/queries/private-sessions"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getPrivateSessionsByOrganization).mockResolvedValue([
				mockPrivateSessionWithRelations,
			]);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/private-sessions`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.sessions).toHaveLength(1);
			expect(data.sessions[0].id).toBe(sessionId);
			expect(data.sessions[0].teacher.fullName).toBe("Teacher One");
			expect(data.sessions[0].students).toHaveLength(1);
		});

		it("should pass filters to getPrivateSessionsByOrganization", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getPrivateSessionsByOrganization } = await import(
				"@/db/queries/private-sessions"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getPrivateSessionsByOrganization).mockResolvedValue([]);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/private-sessions?teacherId=t1&studentId=s1&dateFrom=2026-01-01&dateTo=2026-01-31&status=held`,
			);
			await GET(request, { params: Promise.resolve({ id: orgId }) });

			expect(getPrivateSessionsByOrganization).toHaveBeenCalledWith(orgId, {
				teacherId: "t1",
				studentId: "s1",
				dateFrom: new Date("2026-01-01"),
				dateTo: new Date("2026-01-31"),
				status: "held",
			});
		});

		it("should return 401 if not authenticated", async () => {
			const { getAuthenticatedSession } = await import("@/lib/api-helpers");
			vi.mocked(getAuthenticatedSession).mockImplementation(() => {
				throw new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
				});
			});

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/private-sessions`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ id: orgId }),
			});

			expect(response.status).toBe(401);
		});
	});

	describe("POST /organizations/[id]/private-sessions", () => {
		it("should create a new private session", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { createPrivateSession } = await import(
				"@/db/queries/private-sessions"
			);

			const teacher = createTeacher({ organizationId: orgId });
			const student = createStudent({ organizationId: orgId });

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(createPrivateSession).mockResolvedValue(
				mockPrivateSessionWithRelations,
			);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/private-sessions`,
				{
					method: "POST",
					body: {
						teacherId: teacher.id,
						date: "2026-02-01",
						durationMinutes: 60,
						status: "scheduled",
						studentIds: [student.id],
					},
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(201);
			expect(data.session).toBeDefined();
			expect(data.session.id).toBe(sessionId);
		});

		it("should return 400 if teacherId is missing", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/private-sessions`,
				{
					method: "POST",
					body: {
						date: "2026-02-01",
						durationMinutes: 60,
						status: "scheduled",
						studentIds: ["student-1"],
					},
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId }),
			});

			expect(response.status).toBe(400);
		});

		it("should return 400 if studentIds is empty", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/private-sessions`,
				{
					method: "POST",
					body: {
						teacherId: "teacher-1",
						date: "2026-02-01",
						durationMinutes: 60,
						status: "scheduled",
						studentIds: [],
					},
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId }),
			});

			expect(response.status).toBe(400);
		});
	});

	describe("GET /organizations/[id]/private-sessions/[sessionId]", () => {
		it("should return private session when found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getPrivateSessionById } = await import(
				"@/db/queries/private-sessions"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getPrivateSessionById).mockResolvedValue(
				mockPrivateSessionWithRelations,
			);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/private-sessions/${sessionId}`,
			);
			const response = await GET_SESSION(request, {
				params: Promise.resolve({ id: orgId, sessionId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.session.id).toBe(sessionId);
			expect(data.session.teacher.fullName).toBe("Teacher One");
		});

		it("should return 404 when private session not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getPrivateSessionById } = await import(
				"@/db/queries/private-sessions"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getPrivateSessionById).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/private-sessions/ps-999`,
			);
			const response = await GET_SESSION(request, {
				params: Promise.resolve({ id: orgId, sessionId: "ps-999" }),
			});

			expect(response.status).toBe(404);
		});
	});

	describe("PATCH /organizations/[id]/private-sessions/[sessionId]", () => {
		it("should update private session status", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getPrivateSessionById, updatePrivateSession } = await import(
				"@/db/queries/private-sessions"
			);

			const updated = {
				...mockPrivateSessionWithRelations,
				status: "held" as const,
			};

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getPrivateSessionById).mockResolvedValue(
				mockPrivateSessionWithRelations,
			);
			vi.mocked(updatePrivateSession).mockResolvedValue(updated);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/private-sessions/${sessionId}`,
				{
					method: "PATCH",
					body: { status: "held" },
				},
			);
			const response = await PATCH(request, {
				params: Promise.resolve({ id: orgId, sessionId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.session.status).toBe("held");
		});

		it("should return 404 when private session not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getPrivateSessionById } = await import(
				"@/db/queries/private-sessions"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getPrivateSessionById).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/private-sessions/ps-999`,
				{ method: "PATCH", body: { status: "held" } },
			);
			const response = await PATCH(request, {
				params: Promise.resolve({ id: orgId, sessionId: "ps-999" }),
			});

			expect(response.status).toBe(404);
		});
	});

	describe("DELETE /organizations/[id]/private-sessions/[sessionId]", () => {
		it("should delete private session and return 204", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { deletePrivateSession } = await import(
				"@/db/queries/private-sessions"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(deletePrivateSession).mockResolvedValue(true);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/private-sessions/${sessionId}`,
				{ method: "DELETE" },
			);
			const response = await DELETE(request, {
				params: Promise.resolve({ id: orgId, sessionId }),
			});

			expect(response.status).toBe(204);
		});

		it("should return 404 when private session not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { deletePrivateSession } = await import(
				"@/db/queries/private-sessions"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(deletePrivateSession).mockResolvedValue(false);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/private-sessions/ps-999`,
				{ method: "DELETE" },
			);
			const response = await DELETE(request, {
				params: Promise.resolve({ id: orgId, sessionId: "ps-999" }),
			});

			expect(response.status).toBe(404);
		});
	});
});
