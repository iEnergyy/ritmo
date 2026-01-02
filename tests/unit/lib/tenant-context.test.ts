import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	getActiveOrganization,
	requireActiveOrganization,
	verifyOrganizationMembership,
	getTenantContext,
} from "@/lib/tenant-context";
import { createMockDrizzleDb, configureMockQuery } from "../../mocks/drizzle";
import { createMockAuth, createMockSession } from "../../mocks/auth";
import { createMembers } from "../../factories";
import { NextRequest } from "next/server";

// Mock database
vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../mocks/drizzle");
	return {
		db: createMockDrizzleDb(),
	};
});

// Mock schema
vi.mock("@/db/schema", () => ({
	member: { id: {}, organizationId: {}, userId: {} },
}));

// Mock BetterAuth
vi.mock("@/auth/better-auth", async () => {
	const { createMockAuth } = await import("../../mocks/auth");
	return {
		auth: createMockAuth(),
	};
});

describe("lib/tenant-context", () => {
	let mockDb: ReturnType<typeof createMockDrizzleDb>;
	let mockAuth: ReturnType<typeof createMockAuth>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		const { auth } = await import("@/auth/better-auth");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
		mockAuth = auth as ReturnType<typeof createMockAuth>;
	});

	describe("getActiveOrganization", () => {
		it("should return active organization ID from session", async () => {
			const orgId = "org-123";
			const session = createMockSession({
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: orgId,
				},
			});

			vi.mocked(mockAuth.api.getSession).mockResolvedValue(session);

			const request = new NextRequest("http://localhost:3000");
			const result = await getActiveOrganization(request);

			expect(result).toBe(orgId);
			expect(mockAuth.api.getSession).toHaveBeenCalled();
		});

		it("should return null if no active organization", async () => {
			const session = createMockSession({
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: undefined,
				},
			});

			vi.mocked(mockAuth.api.getSession).mockResolvedValue(session);

			const request = new NextRequest("http://localhost:3000");
			const result = await getActiveOrganization(request);

			expect(result).toBeNull();
		});

		it("should return null if no session", async () => {
			mockAuth.api.getSession = vi.fn().mockResolvedValue(null);

			const request = new NextRequest("http://localhost:3000");
			const result = await getActiveOrganization(request);

			expect(result).toBeNull();
		});
	});

	describe("requireActiveOrganization", () => {
		it("should return organization ID if present", async () => {
			const orgId = "org-123";
			const session = createMockSession({
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: orgId,
				},
			});

			vi.mocked(mockAuth.api.getSession).mockResolvedValue(session);

			const request = new NextRequest("http://localhost:3000");
			const result = await requireActiveOrganization(request);

			expect(result).toBe(orgId);
		});

		it("should throw error if no active organization", async () => {
			mockAuth.api.getSession = vi.fn().mockResolvedValue(null);

			const request = new NextRequest("http://localhost:3000");
			await expect(requireActiveOrganization(request)).rejects.toThrow(
				"No active organization set",
			);
		});
	});

	describe("verifyOrganizationMembership", () => {
		it("should return true if user is a member", async () => {
			const userId = "user-123";
			const orgId = "org-123";
			const mockMember = createMembers(1, orgId)[0];
			mockMember.userId = userId;

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, [mockMember]);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await verifyOrganizationMembership(userId, orgId);

			expect(result).toBe(true);
		});

		it("should return false if user is not a member", async () => {
			const userId = "user-123";
			const orgId = "org-123";

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await verifyOrganizationMembership(userId, orgId);

			expect(result).toBe(false);
		});

		it("should return false on error", async () => {
			const userId = "user-123";
			const orgId = "org-123";

			vi.mocked(mockDb.select).mockImplementation(() => {
				throw new Error("Database error");
			});

			const result = await verifyOrganizationMembership(userId, orgId);

			expect(result).toBe(false);
		});
	});

	describe("getTenantContext", () => {
		it("should return tenant context if user is member", async () => {
			const userId = "user-123";
			const orgId = "org-123";
			const session = createMockSession({
				user: { id: userId, name: "Test", email: "test@example.com" },
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: orgId,
				},
			});

			vi.mocked(mockAuth.api.getSession).mockResolvedValue(session);

			const mockMember = createMembers(1, orgId)[0];
			mockMember.userId = userId;

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, [mockMember]);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const request = new NextRequest("http://localhost:3000");
			const result = await getTenantContext(request);

			expect(result).toEqual({ organizationId: orgId, userId });
		});

		it("should return null if no session", async () => {
			mockAuth.api.getSession = vi.fn().mockResolvedValue(null);

			const request = new NextRequest("http://localhost:3000");
			const result = await getTenantContext(request);

			expect(result).toBeNull();
		});

		it("should return null if no active organization", async () => {
			const session = createMockSession({
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: undefined,
				},
			});

			vi.mocked(mockAuth.api.getSession).mockResolvedValue(session);

			const request = new NextRequest("http://localhost:3000");
			const result = await getTenantContext(request);

			expect(result).toBeNull();
		});

		it("should return null if user is not a member", async () => {
			const userId = "user-123";
			const orgId = "org-123";
			const session = createMockSession({
				user: { id: userId, name: "Test", email: "test@example.com" },
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: orgId,
				},
			});

			vi.mocked(mockAuth.api.getSession).mockResolvedValue(session);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const request = new NextRequest("http://localhost:3000");
			const result = await getTenantContext(request);

			expect(result).toBeNull();
		});
	});
});
