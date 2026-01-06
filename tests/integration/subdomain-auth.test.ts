import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { createMockSession, createMockAuth } from "../mocks/auth";
import { createOrganizations, createMembers } from "../factories";
import { createMockDrizzleDb, configureMockQuery } from "../mocks/drizzle";
import {
	resolveTenantFromSubdomain,
	resolveTenantWithMembership,
} from "@/lib/tenant-resolver";

// Mock next-intl middleware
vi.mock("next-intl/middleware", () => ({
	default: vi.fn((request: NextRequest) => {
		return new NextResponse(null, { status: 200 });
	}),
}));

// Mock proxy - we'll test the logic directly instead of importing the middleware
// since it has complex dependencies

// Mock database
vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../mocks/drizzle");
	return {
		db: createMockDrizzleDb(),
	};
});

// Mock BetterAuth
vi.mock("@/auth/better-auth", async () => {
	const { createMockAuth } = await import("../mocks/auth");
	return {
		auth: createMockAuth(),
	};
});

// Don't mock tenant-resolver - we want to test the actual implementation
// Only mock the dependencies (database, queries, etc.)

// Mock organization queries
vi.mock("@/db/queries/organizations", () => ({
	getOrganizationBySlug: vi.fn(),
}));

// Mock tenant-context
vi.mock("@/lib/tenant-context", async () => {
	const actual = await vi.importActual("@/lib/tenant-context");
	return {
		...actual,
		verifyOrganizationMembership: vi.fn(),
	};
});

// Mock cookies
vi.mock("better-auth/cookies", () => ({
	getCookieCache: vi.fn(),
	getSessionCookie: vi.fn(),
}));

describe("Subdomain Authentication Integration", () => {
	let mockDb: ReturnType<typeof createMockDrizzleDb>;
	let mockAuth: ReturnType<typeof createMockAuth>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		const { auth } = await import("@/auth/better-auth");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
		mockAuth = auth as ReturnType<typeof createMockAuth>;
	});

	describe("Subdomain tenant resolution", () => {
		it("should extract tenant slug from subdomain correctly", () => {
			// Test the actual function implementation
			expect(resolveTenantFromSubdomain("nrgschool.localhost:3000")).toBe(
				"nrgschool",
			);
			expect(resolveTenantFromSubdomain("acme.localhost")).toBe("acme");
			expect(resolveTenantFromSubdomain("localhost:3000")).toBeNull();
		});
	});

	describe("Proxy middleware with subdomain", () => {
		// Note: These tests verify the tenant resolution logic
		// The actual proxy middleware is tested through integration tests
		// that test the full request/response cycle

		it("should resolve tenant from subdomain correctly", () => {
			// Test the actual function implementation
			expect(resolveTenantFromSubdomain("nrgschool.localhost:3000")).toBe(
				"nrgschool",
			);
			expect(resolveTenantFromSubdomain("acme.localhost")).toBe("acme");
			expect(resolveTenantFromSubdomain("localhost:3000")).toBeNull();
		});

		it("should verify membership when resolving tenant", async () => {
			const userId = "user-123";
			const org = createOrganizations(1)[0];
			org.slug = "nrgschool";

			// Mock the query function
			const { getOrganizationBySlug } = await import(
				"@/db/queries/organizations"
			);
			vi.mocked(getOrganizationBySlug).mockResolvedValue(org as any);

			const { verifyOrganizationMembership } = await import(
				"@/lib/tenant-context"
			);
			vi.mocked(verifyOrganizationMembership).mockResolvedValue(true);

			const result = await resolveTenantWithMembership(
				"nrgschool.localhost:3000",
				userId,
			);

			expect(result).toEqual({
				organizationId: org.id,
				slug: org.slug,
			});
			expect(verifyOrganizationMembership).toHaveBeenCalledWith(userId, org.id);
		});
	});

	describe("resolveTenantWithMembership integration", () => {
		it("should resolve tenant and verify membership correctly", async () => {
			const userId = "user-123";
			const org = createOrganizations(1)[0];
			org.slug = "nrgschool";
			const member = createMembers(1, org.id)[0];
			member.userId = userId;

			// Mock the query function
			const { getOrganizationBySlug } = await import(
				"@/db/queries/organizations"
			);
			vi.mocked(getOrganizationBySlug).mockResolvedValue(org as any);

			const { verifyOrganizationMembership } = await import(
				"@/lib/tenant-context"
			);
			vi.mocked(verifyOrganizationMembership).mockResolvedValue(true);

			const result = await resolveTenantWithMembership(
				"nrgschool.localhost:3000",
				userId,
			);

			expect(result).toEqual({
				organizationId: org.id,
				slug: org.slug,
			});
			expect(verifyOrganizationMembership).toHaveBeenCalledWith(userId, org.id);
		});

		it("should return null when organization does not exist", async () => {
			const userId = "user-123";

			// Mock the query function
			const orgQueries = await import("@/db/queries/organizations");
			vi.mocked(orgQueries.getOrganizationBySlug).mockResolvedValue(null);

			const result = await resolveTenantWithMembership(
				"nonexistent.localhost:3000",
				userId,
			);

			expect(result).toBeNull();
		});

		it("should return null when user is not a member", async () => {
			const userId = "user-123";
			const org = createOrganizations(1)[0];
			org.slug = "nrgschool";

			// Mock the query function
			const { getOrganizationBySlug } = await import(
				"@/db/queries/organizations"
			);
			vi.mocked(getOrganizationBySlug).mockResolvedValue(org as any);

			const { verifyOrganizationMembership } = await import(
				"@/lib/tenant-context"
			);
			vi.mocked(verifyOrganizationMembership).mockResolvedValue(false);

			const result = await resolveTenantWithMembership(
				"nrgschool.localhost:3000",
				userId,
			);

			expect(result).toBeNull();
		});
	});
});
