import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "@/app/api/organizations/[id]/sessions/route";
import {
	GET as GET_SESSION,
	PATCH,
	DELETE,
} from "@/app/api/organizations/[id]/sessions/[sessionId]/route";
import { PATCH as PATCH_STATUS } from "@/app/api/organizations/[id]/sessions/[sessionId]/status/route";
import { createMockRequest, getResponseJson } from "../../../utils/api-helpers";
import { createMockAuth, createMockSession } from "../../../mocks/auth";
import { createClassSessions, createTeacher } from "../../../factories";
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
vi.mock("@/db/queries/class-sessions", () => ({
	getSessionsByOrganization: vi.fn(),
	getSessionById: vi.fn(),
	getSessionsByGroup: vi.fn(),
	createSession: vi.fn(),
	updateSession: vi.fn(),
	updateSessionStatus: vi.fn(),
	deleteSession: vi.fn(),
}));
vi.mock("@/db/queries/teachers", () => ({
	getTeacherByIdSimple: vi.fn(),
}));
vi.mock("@/db/queries/groups", () => ({
	getGroupById: vi.fn(),
}));
vi.mock("@/db/queries/venues", () => ({
	getVenueById: vi.fn(),
}));

describe("API /organizations/[id]/sessions", () => {
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

	describe("GET /organizations/[id]/sessions", () => {
		it("should return list of sessions", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionsByOrganization } = await import(
				"@/db/queries/class-sessions"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const mockSessions = createClassSessions(3, orgId);
			vi.mocked(getSessionsByOrganization).mockResolvedValue(mockSessions);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.sessions).toHaveLength(3);
		});

		it("should pass filters to getSessionsByOrganization", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionsByOrganization } = await import(
				"@/db/queries/class-sessions"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionsByOrganization).mockResolvedValue([]);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions?groupId=g1&teacherId=t1&venueId=v1&dateFrom=2025-01-01&dateTo=2025-01-31&status=held`,
			);
			await GET(request, { params: Promise.resolve({ id: orgId }) });

			expect(getSessionsByOrganization).toHaveBeenCalledWith(orgId, {
				groupId: "g1",
				teacherId: "t1",
				venueId: "v1",
				dateFrom: new Date("2025-01-01"),
				dateTo: new Date("2025-01-31"),
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
				`http://localhost:3000/api/organizations/${orgId}/sessions`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ id: orgId }),
			});

			expect(response.status).toBe(401);
		});
	});

	describe("POST /organizations/[id]/sessions", () => {
		it("should create a new session", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { createSession } = await import("@/db/queries/class-sessions");
			const { getTeacherByIdSimple } = await import("@/db/queries/teachers");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const teacher = createTeacher({ organizationId: orgId });
			const newSession = createClassSessions(1, orgId, {
				teacherId: teacher.id,
				date: "2025-02-01",
				startTime: "10:00",
				endTime: "11:00",
				status: "scheduled",
			})[0];

			vi.mocked(getTeacherByIdSimple).mockResolvedValue(teacher);
			vi.mocked(createSession).mockResolvedValue(newSession);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions`,
				{
					method: "POST",
					body: {
						teacherId: teacher.id,
						date: "2025-02-01",
						startTime: "10:00",
						endTime: "11:00",
						status: "scheduled",
					},
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(201);
			expect(data.session).toBeDefined();
		});

		it("should return 400 if teacherId is missing", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions`,
				{
					method: "POST",
					body: { date: "2025-02-01", status: "scheduled" },
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(400);
			expect(data.error).toBe("Teacher is required");
		});

		it("should return 400 if date is missing", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions`,
				{
					method: "POST",
					body: { teacherId: "t1", status: "scheduled" },
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(400);
			expect(data.error).toBe("Date is required");
		});

		it("should return 400 if status is invalid", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions`,
				{
					method: "POST",
					body: { teacherId: "t1", date: "2025-02-01", status: "invalid" },
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(400);
			expect(data.error).toBe("Status must be scheduled, held, or cancelled");
		});

		it("should return 404 if teacher not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getTeacherByIdSimple } = await import("@/db/queries/teachers");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getTeacherByIdSimple).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions`,
				{
					method: "POST",
					body: {
						teacherId: "unknown-teacher",
						date: "2025-02-01",
						status: "scheduled",
					},
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(404);
			expect(data.error).toContain("Teacher not found");
		});

		it("should return 400 if startTime >= endTime", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getTeacherByIdSimple } = await import("@/db/queries/teachers");

			const teacher = createTeacher({ organizationId: orgId });
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getTeacherByIdSimple).mockResolvedValue(teacher);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions`,
				{
					method: "POST",
					body: {
						teacherId: teacher.id,
						date: "2025-02-01",
						startTime: "11:00",
						endTime: "10:00",
						status: "scheduled",
					},
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(400);
			expect(data.error).toBe("Start time must be before end time");
		});
	});

	describe("GET /organizations/[id]/sessions/[sessionId]", () => {
		it("should return session when found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById } = await import("@/db/queries/class-sessions");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const classSession = createClassSessions(1, orgId)[0];
			vi.mocked(getSessionById).mockResolvedValue(classSession);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/${classSession.id}`,
			);
			const response = await GET_SESSION(request, {
				params: Promise.resolve({ id: orgId, sessionId: classSession.id }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			// Dates are serialized to strings in JSON responses
			const expected = {
				...classSession,
				createdAt: classSession.createdAt.toISOString(),
			};
			expect(data.session).toEqual(expected);
		});

		it("should return 404 when session not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById } = await import("@/db/queries/class-sessions");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionById).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/sess-123`,
			);
			const response = await GET_SESSION(request, {
				params: Promise.resolve({ id: orgId, sessionId: "sess-123" }),
			});

			expect(response.status).toBe(404);
		});
	});

	describe("PATCH /organizations/[id]/sessions/[sessionId]", () => {
		it("should update session", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById, updateSession } = await import(
				"@/db/queries/class-sessions"
			);

			const existing = createClassSessions(1, orgId)[0];
			const updated = { ...existing, startTime: "09:00", endTime: "10:00" };

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionById).mockResolvedValue(existing);
			vi.mocked(updateSession).mockResolvedValue(updated);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/${existing.id}`,
				{
					method: "PATCH",
					body: { startTime: "09:00", endTime: "10:00" },
				},
			);

			const response = await PATCH(request, {
				params: Promise.resolve({ id: orgId, sessionId: existing.id }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.session.startTime).toBe("09:00");
		});

		it("should return 404 when session not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById } = await import("@/db/queries/class-sessions");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionById).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/sess-123`,
				{ method: "PATCH", body: {} },
			);

			const response = await PATCH(request, {
				params: Promise.resolve({ id: orgId, sessionId: "sess-123" }),
			});

			expect(response.status).toBe(404);
		});
	});

	describe("DELETE /organizations/[id]/sessions/[sessionId]", () => {
		it("should delete session", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById, deleteSession } = await import(
				"@/db/queries/class-sessions"
			);

			const classSession = createClassSessions(1, orgId)[0];

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionById).mockResolvedValue(classSession);
			vi.mocked(deleteSession).mockResolvedValue(undefined);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/${classSession.id}`,
				{ method: "DELETE" },
			);

			const response = await DELETE(request, {
				params: Promise.resolve({ id: orgId, sessionId: classSession.id }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.message).toBe("Session deleted successfully");
		});

		it("should return 404 when session not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById } = await import("@/db/queries/class-sessions");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionById).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/sess-123`,
				{ method: "DELETE" },
			);

			const response = await DELETE(request, {
				params: Promise.resolve({ id: orgId, sessionId: "sess-123" }),
			});

			expect(response.status).toBe(404);
		});
	});

	describe("PATCH /organizations/[id]/sessions/[sessionId]/status", () => {
		it("should update session status", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById, updateSessionStatus } = await import(
				"@/db/queries/class-sessions"
			);

			const existing = createClassSessions(1, orgId)[0];
			const updated = { ...existing, status: "held" as const };

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionById).mockResolvedValue(existing);
			vi.mocked(updateSessionStatus).mockResolvedValue(updated);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/${existing.id}/status`,
				{ method: "PATCH", body: { status: "held" } },
			);

			const response = await PATCH_STATUS(request, {
				params: Promise.resolve({ id: orgId, sessionId: existing.id }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.session.status).toBe("held");
		});

		it("should return 400 if status is invalid", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById } = await import("@/db/queries/class-sessions");

			const existing = createClassSessions(1, orgId)[0];
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionById).mockResolvedValue(existing);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/${existing.id}/status`,
				{ method: "PATCH", body: { status: "invalid" } },
			);

			const response = await PATCH_STATUS(request, {
				params: Promise.resolve({ id: orgId, sessionId: existing.id }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(400);
			expect(data.error).toBe("Status must be scheduled, held, or cancelled");
		});

		it("should return 404 when session not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getSessionById } = await import("@/db/queries/class-sessions");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getSessionById).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/sessions/sess-123/status`,
				{ method: "PATCH", body: { status: "held" } },
			);

			const response = await PATCH_STATUS(request, {
				params: Promise.resolve({ id: orgId, sessionId: "sess-123" }),
			});

			expect(response.status).toBe(404);
		});
	});
});
