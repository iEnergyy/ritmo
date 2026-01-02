import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "@/app/api/organizations/[id]/teachers/route";
import { createMockRequest, getResponseJson } from "../../../utils/api-helpers";
import { createMockAuth, createMockSession } from "../../../mocks/auth";
import { createTeachers } from "../../../factories";
import { createMockDrizzleDb } from "../../../mocks/drizzle";

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
vi.mock("@/db/queries/teachers", () => ({
	getTeachersByOrganization: vi.fn(),
	createTeacher: vi.fn(),
	getTeacherById: vi.fn(),
	updateTeacher: vi.fn(),
	deleteTeacher: vi.fn(),
}));

describe("API /organizations/[id]/teachers", () => {
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

	it("should return list of teachers", async () => {
		const { GET } = await import("@/app/api/organizations/[id]/teachers/route");
		const { getAuthenticatedSession, enforceTenantIsolation } = await import(
			"@/lib/api-helpers"
		);
		const { getTeachersByOrganization } = await import("@/db/queries/teachers");

		vi.mocked(getAuthenticatedSession).mockResolvedValue(session);
		vi.mocked(enforceTenantIsolation).mockResolvedValue(undefined);

		const mockTeachers = createTeachers(3, orgId);
		vi.mocked(getTeachersByOrganization).mockResolvedValue(mockTeachers);

		const request = createMockRequest(
			`http://localhost:3000/api/organizations/${orgId}/teachers`,
		);
		const response = await GET(request, {
			params: Promise.resolve({ id: orgId }),
		});
		const data = await getResponseJson(response);

		expect(response.status).toBe(200);
		expect(data.teachers).toBeDefined();
	});
});
