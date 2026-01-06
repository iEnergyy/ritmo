import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	resolveTenantFromSubdomain,
	getOrganizationBySlug,
	resolveTenantWithMembership,
} from "@/lib/tenant-resolver";
import { createMockDrizzleDb, configureMockQuery } from "../../mocks/drizzle";
import { createOrganizations } from "../../factories";
import { createMembers } from "../../factories";

// Mock database
vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../mocks/drizzle");
	return {
		db: createMockDrizzleDb(),
	};
});

// Mock schema
vi.mock("@/db/schema", async () => {
	const actual = await vi.importActual("@/db/schema");
	return {
		...actual,
		organization: { id: {}, slug: {}, name: {} },
		user: { id: {}, name: {}, email: {} },
		member: { id: {}, organizationId: {}, userId: {} },
		session: { id: {}, expiresAt: {}, activeOrganizationId: {} },
		account: {},
		verification: {},
		invitation: {},
	};
});

// Mock tenant-context to avoid circular dependency
vi.mock("@/lib/tenant-context", async () => {
	const actual = await vi.importActual("@/lib/tenant-context");
	return {
		...actual,
		verifyOrganizationMembership: vi.fn(),
	};
});

// Mock queries
vi.mock("@/db/queries/organizations", () => ({
	getOrganizationBySlug: vi.fn(),
}));

describe("lib/tenant-resolver", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("resolveTenantFromSubdomain", () => {
		it("should extract tenant slug from localhost subdomain", () => {
			expect(resolveTenantFromSubdomain("nrgschool.localhost")).toBe(
				"nrgschool",
			);
			expect(resolveTenantFromSubdomain("acme.localhost")).toBe("acme");
			expect(resolveTenantFromSubdomain("tenant.localhost")).toBe("tenant");
		});

		it("should extract tenant slug from localhost subdomain with port", () => {
			expect(resolveTenantFromSubdomain("nrgschool.localhost:3000")).toBe(
				"nrgschool",
			);
			expect(resolveTenantFromSubdomain("acme.localhost:8080")).toBe("acme");
		});

		it("should extract tenant slug from production domain", () => {
			expect(resolveTenantFromSubdomain("acme.example.com")).toBe("acme");
			expect(resolveTenantFromSubdomain("tenant.yourdomain.com")).toBe(
				"tenant",
			);
		});

		it("should return null for localhost without subdomain", () => {
			expect(resolveTenantFromSubdomain("localhost")).toBeNull();
			expect(resolveTenantFromSubdomain("localhost:3000")).toBeNull();
		});

		it("should return null for domain without subdomain", () => {
			expect(resolveTenantFromSubdomain("example.com")).toBeNull();
			expect(resolveTenantFromSubdomain("yourdomain.com")).toBeNull();
		});

		it("should return null for empty or invalid hostname", () => {
			expect(resolveTenantFromSubdomain("")).toBeNull();
			expect(resolveTenantFromSubdomain("   ")).toBeNull();
		});

		it("should handle edge cases", () => {
			// Multiple subdomains - should take the first one
			expect(resolveTenantFromSubdomain("sub1.sub2.localhost")).toBe("sub1");
			expect(resolveTenantFromSubdomain("a.b.example.com")).toBe("a");
		});

		it("should handle single character subdomains", () => {
			expect(resolveTenantFromSubdomain("a.localhost")).toBe("a");
			expect(resolveTenantFromSubdomain("x.example.com")).toBe("x");
		});
	});

	describe("getOrganizationBySlug", () => {
		it("should return organization when found", async () => {
			const org = createOrganizations(1)[0];
			org.slug = "nrgschool";
			const { getOrganizationBySlug: getOrgBySlugQuery } = await import(
				"@/db/queries/organizations"
			);
			vi.mocked(getOrgBySlugQuery).mockResolvedValue(org as any);

			const result = await getOrganizationBySlug("nrgschool");

			expect(result).toEqual(org);
			expect(getOrgBySlugQuery).toHaveBeenCalledWith("nrgschool");
		});

		it("should return null when organization not found", async () => {
			const { getOrganizationBySlug: getOrgBySlugQuery } = await import(
				"@/db/queries/organizations"
			);
			vi.mocked(getOrgBySlugQuery).mockResolvedValue(null);

			const result = await getOrganizationBySlug("nonexistent");

			expect(result).toBeNull();
		});
	});

	describe("resolveTenantWithMembership", () => {
		it("should return tenant info when user is a member", async () => {
			const userId = "user-123";
			const org = createOrganizations(1)[0];
			org.slug = "nrgschool";
			const hostname = "nrgschool.localhost:3000";

			const { getOrganizationBySlug: getOrgBySlugQuery } = await import(
				"@/db/queries/organizations"
			);
			vi.mocked(getOrgBySlugQuery).mockResolvedValue(org as any);

			const { verifyOrganizationMembership } = await import(
				"@/lib/tenant-context"
			);
			vi.mocked(verifyOrganizationMembership).mockResolvedValue(true);

			const result = await resolveTenantWithMembership(hostname, userId);

			expect(result).toEqual({
				organizationId: org.id,
				slug: org.slug,
			});
			expect(verifyOrganizationMembership).toHaveBeenCalledWith(userId, org.id);
		});

		it("should return null when no subdomain", async () => {
			const userId = "user-123";
			const hostname = "localhost:3000";

			const result = await resolveTenantWithMembership(hostname, userId);

			expect(result).toBeNull();
		});

		it("should return null when organization not found", async () => {
			const userId = "user-123";
			const hostname = "nonexistent.localhost:3000";

			const { getOrganizationBySlug: getOrgBySlugQuery } = await import(
				"@/db/queries/organizations"
			);
			vi.mocked(getOrgBySlugQuery).mockResolvedValue(null);

			const result = await resolveTenantWithMembership(hostname, userId);

			expect(result).toBeNull();
		});

		it("should return null when user is not a member", async () => {
			const userId = "user-123";
			const org = createOrganizations(1)[0];
			org.slug = "nrgschool";
			const hostname = "nrgschool.localhost:3000";

			const { getOrganizationBySlug: getOrgBySlugQuery } = await import(
				"@/db/queries/organizations"
			);
			vi.mocked(getOrgBySlugQuery).mockResolvedValue(org as any);

			const { verifyOrganizationMembership } = await import(
				"@/lib/tenant-context"
			);
			vi.mocked(verifyOrganizationMembership).mockResolvedValue(false);

			const result = await resolveTenantWithMembership(hostname, userId);

			expect(result).toBeNull();
			expect(verifyOrganizationMembership).toHaveBeenCalledWith(userId, org.id);
		});

		it("should handle errors gracefully", async () => {
			const userId = "user-123";
			const hostname = "nrgschool.localhost:3000";

			const { getOrganizationBySlug: getOrgBySlugQuery } = await import(
				"@/db/queries/organizations"
			);
			vi.mocked(getOrgBySlugQuery).mockRejectedValue(
				new Error("Database error"),
			);

			await expect(
				resolveTenantWithMembership(hostname, userId),
			).rejects.toThrow("Database error");
		});
	});
});
