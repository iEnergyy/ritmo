import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	GET,
	PATCH,
} from "@/app/api/organizations/[id]/groups/[groupId]/schedule/route";
import { createMockRequest, getResponseJson } from "../../../utils/api-helpers";
import { createMockAuth, createMockSession } from "../../../mocks/auth";
import { createGroup } from "../../../factories";
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
vi.mock("@/db/queries/groups", () => ({
	getGroupById: vi.fn(),
}));
vi.mock("@/db/queries/group-schedules", () => ({
	getGroupSchedule: vi.fn(),
	getScheduleSlots: vi.fn(),
	upsertGroupSchedule: vi.fn(),
	generateSessionsFromSchedule: vi.fn(),
}));

describe("API /organizations/[id]/groups/[groupId]/schedule", () => {
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

	describe("GET /organizations/[id]/groups/[groupId]/schedule", () => {
		it("should return schedules when group exists", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getGroupById } = await import("@/db/queries/groups");
			const { getGroupSchedule } = await import("@/db/queries/group-schedules");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const group = createGroup({ id: groupId, organizationId: orgId });
			vi.mocked(getGroupById).mockResolvedValue(group);

			const mockSchedules = [
				{
					id: "sched-1",
					groupId,
					organizationId: orgId,
					recurrence: "weekly",
					durationHours: "1",
					effectiveFrom: "2025-01-01",
					effectiveTo: null,
					slots: [{ dayOfWeek: 1, startTime: "10:00", sortOrder: 0 }],
				},
			];
			vi.mocked(getGroupSchedule).mockResolvedValue(mockSchedules);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/${groupId}/schedule`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ id: orgId, groupId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.schedules).toHaveLength(1);
			expect(getGroupSchedule).toHaveBeenCalledWith(groupId, orgId);
		});

		it("should use getScheduleSlots when from and to are provided", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getGroupById } = await import("@/db/queries/groups");
			const { getScheduleSlots } = await import("@/db/queries/group-schedules");

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const group = createGroup({ id: groupId, organizationId: orgId });
			vi.mocked(getGroupById).mockResolvedValue(group);
			vi.mocked(getScheduleSlots).mockResolvedValue([]);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/${groupId}/schedule?from=2025-01-01&to=2025-01-31`,
			);
			await GET(request, {
				params: Promise.resolve({ id: orgId, groupId }),
			});

			expect(getScheduleSlots).toHaveBeenCalledWith(
				groupId,
				orgId,
				new Date("2025-01-01"),
				new Date("2025-01-31"),
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
				`http://localhost:3000/api/organizations/${orgId}/groups/unknown-group/schedule`,
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
				`http://localhost:3000/api/organizations/${orgId}/groups/${groupId}/schedule`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ id: orgId, groupId }),
			});

			expect(response.status).toBe(401);
		});
	});

	describe("PATCH /organizations/[id]/groups/[groupId]/schedule", () => {
		it("should upsert schedule and return it", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getGroupById } = await import("@/db/queries/groups");
			const { upsertGroupSchedule } = await import(
				"@/db/queries/group-schedules"
			);

			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

			const group = createGroup({ id: groupId, organizationId: orgId });
			vi.mocked(getGroupById).mockResolvedValue(group);

			const savedSchedule = {
				id: "sched-1",
				groupId,
				organizationId: orgId,
				recurrence: "weekly",
				durationHours: "1",
				effectiveFrom: "2025-01-01",
				effectiveTo: null,
				slots: [{ dayOfWeek: 1, startTime: "10:00", sortOrder: 0 }],
			};
			vi.mocked(upsertGroupSchedule).mockResolvedValue(savedSchedule);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/${groupId}/schedule`,
				{
					method: "PATCH",
					body: {
						recurrence: "weekly",
						durationHours: 1,
						effectiveFrom: "2025-01-01",
						slots: [{ dayOfWeek: 1, startTime: "10:00" }],
					},
				},
			);

			const response = await PATCH(request, {
				params: Promise.resolve({ id: orgId, groupId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(200);
			expect(data.schedule).toEqual(savedSchedule);
			expect(upsertGroupSchedule).toHaveBeenCalledWith(
				groupId,
				orgId,
				expect.objectContaining({
					recurrence: "weekly",
					durationHours: 1,
					effectiveFrom: "2025-01-01",
					slots: [{ dayOfWeek: 1, startTime: "10:00", sortOrder: 0 }],
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
				`http://localhost:3000/api/organizations/${orgId}/groups/unknown-group/schedule`,
				{
					method: "PATCH",
					body: {
						recurrence: "weekly",
						durationHours: 1,
						effectiveFrom: "2025-01-01",
						slots: [{ dayOfWeek: 1, startTime: "10:00" }],
					},
				},
			);

			const response = await PATCH(request, {
				params: Promise.resolve({ id: orgId, groupId: "unknown-group" }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(404);
			expect(data.error).toBe("Group not found");
		});

		it("should return 400 if recurrence is invalid", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getGroupById } = await import("@/db/queries/groups");

			const group = createGroup({ id: groupId, organizationId: orgId });
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getGroupById).mockResolvedValue(group);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/${groupId}/schedule`,
				{
					method: "PATCH",
					body: {
						recurrence: "daily",
						durationHours: 1,
						effectiveFrom: "2025-01-01",
						slots: [{ dayOfWeek: 1, startTime: "10:00" }],
					},
				},
			);

			const response = await PATCH(request, {
				params: Promise.resolve({ id: orgId, groupId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(400);
			expect(data.error).toBe(
				"Recurrence must be one_time, weekly, or twice_weekly",
			);
		});

		it("should return 400 if effectiveFrom is missing", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getGroupById } = await import("@/db/queries/groups");

			const group = createGroup({ id: groupId, organizationId: orgId });
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getGroupById).mockResolvedValue(group);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/${groupId}/schedule`,
				{
					method: "PATCH",
					body: {
						recurrence: "weekly",
						durationHours: 1,
						slots: [{ dayOfWeek: 1, startTime: "10:00" }],
					},
				},
			);

			const response = await PATCH(request, {
				params: Promise.resolve({ id: orgId, groupId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(400);
			expect(data.error).toBe("effectiveFrom (YYYY-MM-DD) is required");
		});

		it("should return 400 if twice_weekly does not have exactly two slots", async () => {
			const { getAuthenticatedSession, enforceTenantIsolation } = await import(
				"@/lib/api-helpers"
			);
			const { getGroupById } = await import("@/db/queries/groups");

			const group = createGroup({ id: groupId, organizationId: orgId });
			vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
			vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);
			vi.mocked(getGroupById).mockResolvedValue(group);

			const request = createMockRequest(
				`http://localhost:3000/api/organizations/${orgId}/groups/${groupId}/schedule`,
				{
					method: "PATCH",
					body: {
						recurrence: "twice_weekly",
						durationHours: 1,
						effectiveFrom: "2025-01-01",
						slots: [{ dayOfWeek: 1, startTime: "10:00" }],
					},
				},
			);

			const response = await PATCH(request, {
				params: Promise.resolve({ id: orgId, groupId }),
			});
			const data = await getResponseJson(response);

			expect(response.status).toBe(400);
			expect(data.error).toBe(
				"Twice-weekly schedule must have exactly two slots",
			);
		});
	});
});
