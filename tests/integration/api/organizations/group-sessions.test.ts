import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	GET,
	POST,
} from "@/app/api/organizations/[id]/groups/[groupId]/sessions/route";
import { createMockRequest, getResponseJson } from "../../../utils/api-helpers";
import { createMockAuth, createMockSession } from "../../../mocks/auth";
import {
	createClassSessions,
	createGroup,
	createTeacher,
} from "../../../factories";
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

describe("API /organizations/[id]/groups/[groupId]/sessions", () => {
	const orgId = "org-123";
	const groupId = "group-456";
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

	describe("GET /organizations/[id]/groups/[groupId]/sessions", () => {
		it("should return list of sessions for the group", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getGroupById } = await import("@/db/queries/groups");
			const { getSessionsByGroup } = await import(
				"@/db/queries/class-sessions"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const group = createGroup({ id: groupId, organizationId: orgId });
			vi.mocked(getGroupById).mockResolvedValue(group);

			const mockSessions = createClassSessions(2, orgId, { groupId });
			vi.mocked(getSessionsByGroup).mockResolvedValue(mockSessions);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/${groupId}/sessions`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ id: orgId, groupId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.sessions).toHaveLength(2);
		});

		it("should return 404 when group not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getGroupById } = await import("@/db/queries/groups");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getGroupById).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/unknown-group/sessions`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ id: orgId, groupId: "unknown-group" }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(404);
			expect(data.error).toBe("Group not found");
		});

		it("should return 401 if not authenticated", async () => {
			const { getAuthenticatedSession } = await import("@/lib/api-helpers");
			vi.mocked(getAuthenticatedSession).mockImplementation(() => {
				throw new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
				});
			});

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/${groupId}/sessions`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ id: orgId, groupId }),
			});

			expect(response.status).toBe(401);
		});
	});

	describe("POST /organizations/[id]/groups/[groupId]/sessions", () => {
		it("should create a session for the group", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getGroupById } = await import("@/db/queries/groups");
			const { getTeacherByIdSimple } = await import("@/db/queries/teachers");
			const { createSession } = await import("@/db/queries/class-sessions");

			const group = createGroup({ id: groupId, organizationId: orgId });
			const teacher = createTeacher({ organizationId: orgId });
			const newSession = createClassSessions(1, orgId, {
				groupId,
				teacherId: teacher.id,
				date: "2025-02-01",
				startTime: "10:00",
				endTime: "11:00",
				status: "scheduled",
			})[0];

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getGroupById).mockResolvedValue(group);
			vi.mocked(getTeacherByIdSimple).mockResolvedValue(teacher);
			vi.mocked(createSession).mockResolvedValue(newSession);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/${groupId}/sessions`,
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
				params: Promise.resolve({ id: orgId, groupId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(201);
			expect(data.session).toBeDefined();
			expect(createSession).toHaveBeenCalledWith(
				expect.objectContaining({
					organizationId: orgId,
					groupId,
					teacherId: teacher.id,
					date: new Date("2025-02-01"),
					status: "scheduled",
				}),
			);
		});

		it("should return 404 when group not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getGroupById } = await import("@/db/queries/groups");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getGroupById).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/unknown-group/sessions`,
				{
					method: "POST",
					body: {
						teacherId: "t1",
						date: "2025-02-01",
						status: "scheduled",
					},
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId, groupId: "unknown-group" }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(404);
			expect(data.error).toBe("Group not found");
		});

		it("should return 400 if teacherId is missing", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getGroupById } = await import("@/db/queries/groups");

			const group = createGroup({ id: groupId, organizationId: orgId });
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getGroupById).mockResolvedValue(group);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/${groupId}/sessions`,
				{
					method: "POST",
					body: { date: "2025-02-01", status: "scheduled" },
				},
			);

			const response = await POST(request, {
				params: Promise.resolve({ id: orgId, groupId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(400);
			expect(data.error).toBe("Teacher is required");
		});

		it("should return 404 if teacher not found", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getGroupById } = await import("@/db/queries/groups");
			const { getTeacherByIdSimple } = await import("@/db/queries/teachers");

			const group = createGroup({ id: groupId, organizationId: orgId });
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getGroupById).mockResolvedValue(group);
			vi.mocked(getTeacherByIdSimple).mockResolvedValue(null);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/${groupId}/sessions`,
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
				params: Promise.resolve({ id: orgId, groupId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(404);
			expect(data.error).toContain("Teacher not found");
		});
	});
});
