import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	requireOrganizationAccess,
	requireRole,
	canAccessResource,
	hasRole,
	isAdmin,
	isTeacher,
} from "@/lib/auth-helpers";
import { createMockDrizzleDb, configureMockQuery } from "../../mocks/drizzle";
import { createMembers, createOrganizationMember } from "../../factories";

// Mock tenant-context
const { mockVerifyOrganizationMembership } = vi.hoisted(() => ({
	mockVerifyOrganizationMembership: vi.fn(),
}));
vi.mock("@/lib/tenant-context", () => ({
	verifyOrganizationMembership: mockVerifyOrganizationMembership,
}));

// Mock database
vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../mocks/drizzle");
	return {
		db: createMockDrizzleDb(),
	};
});

// Mock schema
vi.mock("@/db/schema", () => ({
	member: { id: {}, organizationId: {}, userId: {}, createdAt: {} },
	organizationMembers: { id: {}, memberId: {}, role: {} },
}));

describe("lib/auth-helpers", () => {
	let mockDb: ReturnType<typeof createMockDrizzleDb>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
	});

	describe("requireOrganizationAccess", () => {
		it("should throw error if organizationId is missing", async () => {
			await expect(requireOrganizationAccess("", "user-123")).rejects.toThrow(
				"Organization ID and User ID are required",
			);
		});

		it("should throw error if userId is missing", async () => {
			await expect(requireOrganizationAccess("org-123", "")).rejects.toThrow(
				"Organization ID and User ID are required",
			);
		});

		it("should not throw if user has access", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(true);

			await expect(
				requireOrganizationAccess("org-123", "user-123"),
			).resolves.not.toThrow();

			expect(mockVerifyOrganizationMembership).toHaveBeenCalledWith(
				"user-123",
				"org-123",
			);
		});

		it("should throw if user does not have access", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(false);

			await expect(
				requireOrganizationAccess("org-123", "user-123"),
			).rejects.toThrow("does not have access to organization");
		});
	});

	describe("requireRole", () => {
		it("should throw error if organizationId is missing", async () => {
			await expect(requireRole("", "user-123", "admin")).rejects.toThrow(
				"Organization ID and User ID are required",
			);
		});

		it("should throw error if userId is missing", async () => {
			await expect(requireRole("org-123", "", "admin")).rejects.toThrow(
				"Organization ID and User ID are required",
			);
		});

		it("should throw if user is not a member", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(false);

			await expect(requireRole("org-123", "user-123", "admin")).rejects.toThrow(
				"does not have access to organization",
			);
		});

		it("should throw if member record not found", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(true);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			await expect(requireRole("org-123", "user-123", "admin")).rejects.toThrow(
				"User is not a member of this organization",
			);
		});

		it("should throw if user does not have required role", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(true);

			const mockMember = createMembers(1, "org-123")[0];
			const mockOrgMember = createOrganizationMember({
				memberId: mockMember.id,
				role: "teacher",
			});

			// Mock member query
			const memberQuery = createMockDrizzleDb().select();
			configureMockQuery(memberQuery, [mockMember]);
			vi.mocked(mockDb.select)
				.mockReturnValueOnce(memberQuery)
				.mockReturnValueOnce(
					(() => {
						const orgMemberQuery = createMockDrizzleDb().select();
						configureMockQuery(orgMemberQuery, [mockOrgMember]);
						return orgMemberQuery;
					})(),
				);

			await expect(requireRole("org-123", "user-123", "admin")).rejects.toThrow(
				"does not have required role: admin",
			);
		});

		it("should not throw if user has required role", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(true);

			const mockMember = createMembers(1, "org-123")[0];
			const mockOrgMember = createOrganizationMember({
				memberId: mockMember.id,
				role: "admin",
			});

			// Mock member query
			const memberQuery = createMockDrizzleDb().select();
			configureMockQuery(memberQuery, [mockMember]);
			vi.mocked(mockDb.select)
				.mockReturnValueOnce(memberQuery)
				.mockReturnValueOnce(
					(() => {
						const orgMemberQuery = createMockDrizzleDb().select();
						configureMockQuery(orgMemberQuery, [mockOrgMember]);
						return orgMemberQuery;
					})(),
				);

			await expect(
				requireRole("org-123", "user-123", "admin"),
			).resolves.not.toThrow();
		});

		it("should auto-assign admin role to first member", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(true);

			const mockMember = createMembers(1, "org-123")[0];

			// Mock member query - returns member
			const memberQuery = createMockDrizzleDb().select();
			configureMockQuery(memberQuery, [mockMember]);

			// Mock orgMember query - returns empty (no role assigned)
			const orgMemberQuery = createMockDrizzleDb().select();
			configureMockQuery(orgMemberQuery, []);

			// Mock allMembers query - returns only this member (first member)
			const allMembersQuery = createMockDrizzleDb().select();
			configureMockQuery(allMembersQuery, [mockMember]);

			// Mock insert for creating admin role
			const mockInsert = createMockDrizzleDb().insert();
			mockInsert.values = vi.fn().mockResolvedValue(undefined);
			vi.mocked(mockDb.insert).mockReturnValue(mockInsert);

			vi.mocked(mockDb.select)
				.mockReturnValueOnce(memberQuery)
				.mockReturnValueOnce(orgMemberQuery)
				.mockReturnValueOnce(allMembersQuery);

			await expect(
				requireRole("org-123", "user-123", "admin"),
			).resolves.not.toThrow();

			expect(mockDb.insert).toHaveBeenCalled();
		});
	});

	describe("canAccessResource", () => {
		it("should return false if resource has no organizationId", async () => {
			const result = await canAccessResource({} as any, "user-123");
			expect(result).toBe(false);
		});

		it("should return false if userId is missing", async () => {
			const result = await canAccessResource({ organizationId: "org-123" }, "");
			expect(result).toBe(false);
		});

		it("should return true if user has access", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(true);

			const result = await canAccessResource(
				{ organizationId: "org-123" },
				"user-123",
			);

			expect(result).toBe(true);
		});

		it("should return false if user does not have access", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(false);

			const result = await canAccessResource(
				{ organizationId: "org-123" },
				"user-123",
			);

			expect(result).toBe(false);
		});
	});

	describe("hasRole", () => {
		it("should return true if user has role", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(true);

			const mockMember = createMembers(1, "org-123")[0];
			const mockOrgMember = createOrganizationMember({
				memberId: mockMember.id,
				role: "admin",
			});

			const memberQuery = createMockDrizzleDb().select();
			configureMockQuery(memberQuery, [mockMember]);
			const orgMemberQuery = createMockDrizzleDb().select();
			configureMockQuery(orgMemberQuery, [mockOrgMember]);

			mockDb.select = vi
				.fn()
				.mockReturnValueOnce(memberQuery)
				.mockReturnValueOnce(orgMemberQuery);

			const result = await hasRole("org-123", "user-123", "admin");

			expect(result).toBe(true);
		});

		it("should return false if user does not have role", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(true);

			const mockMember = createMembers(1, "org-123")[0];
			const mockOrgMember = createOrganizationMember({
				memberId: mockMember.id,
				role: "teacher",
			});

			const memberQuery = createMockDrizzleDb().select();
			configureMockQuery(memberQuery, [mockMember]);
			const orgMemberQuery = createMockDrizzleDb().select();
			configureMockQuery(orgMemberQuery, [mockOrgMember]);

			mockDb.select = vi
				.fn()
				.mockReturnValueOnce(memberQuery)
				.mockReturnValueOnce(orgMemberQuery);

			const result = await hasRole("org-123", "user-123", "admin");

			expect(result).toBe(false);
		});
	});

	describe("isAdmin", () => {
		it("should return true if user is admin", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(true);

			const mockMember = createMembers(1, "org-123")[0];
			const mockOrgMember = createOrganizationMember({
				memberId: mockMember.id,
				role: "admin",
			});

			const memberQuery = createMockDrizzleDb().select();
			configureMockQuery(memberQuery, [mockMember]);
			const orgMemberQuery = createMockDrizzleDb().select();
			configureMockQuery(orgMemberQuery, [mockOrgMember]);

			mockDb.select = vi
				.fn()
				.mockReturnValueOnce(memberQuery)
				.mockReturnValueOnce(orgMemberQuery);

			const result = await isAdmin("org-123", "user-123");

			expect(result).toBe(true);
		});
	});

	describe("isTeacher", () => {
		it("should return true if user is teacher", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(true);

			const mockMember = createMembers(1, "org-123")[0];
			const mockOrgMember = createOrganizationMember({
				memberId: mockMember.id,
				role: "teacher",
			});

			const memberQuery = createMockDrizzleDb().select();
			configureMockQuery(memberQuery, [mockMember]);
			const orgMemberQuery = createMockDrizzleDb().select();
			configureMockQuery(orgMemberQuery, [mockOrgMember]);

			mockDb.select = vi
				.fn()
				.mockReturnValueOnce(memberQuery)
				.mockReturnValueOnce(orgMemberQuery);

			const result = await isTeacher("org-123", "user-123");

			expect(result).toBe(true);
		});
	});
});
