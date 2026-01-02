import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	getAuthenticatedSession,
	getTenantContextWithAuth,
	enforceTenantIsolation,
	withTenantIsolation,
} from "@/lib/api-helpers";
import { createMockAuth, createMockSession } from "../../mocks/auth";
import { createMockRequest } from "../../utils/api-helpers";
import {
	TenantAccessDeniedError,
	NoActiveTenantError,
	TenantMembershipError,
} from "@/lib/tenant-errors";
import { NextRequest, NextResponse } from "next/server";

// Mock tenant-context
const { mockGetTenantContext, mockVerifyOrganizationMembership } = vi.hoisted(
	() => ({
		mockGetTenantContext: vi.fn(),
		mockVerifyOrganizationMembership: vi.fn(),
	}),
);
vi.mock("@/lib/tenant-context", () => ({
	getTenantContext: mockGetTenantContext,
	verifyOrganizationMembership: mockVerifyOrganizationMembership,
}));

// Mock tenant-errors
vi.mock("@/lib/tenant-errors", async () => {
	const actual = await vi.importActual("@/lib/tenant-errors");
	return {
		...actual,
		handleTenantError: vi.fn((error) => {
			if (error instanceof TenantAccessDeniedError) {
				return NextResponse.json({ error: error.message }, { status: 403 });
			}
			if (error instanceof NoActiveTenantError) {
				return NextResponse.json({ error: error.message }, { status: 400 });
			}
			if (error instanceof TenantMembershipError) {
				return NextResponse.json({ error: error.message }, { status: 403 });
			}
			return NextResponse.json(
				{ error: "Internal server error" },
				{ status: 500 },
			);
		}),
	};
});

// Mock BetterAuth
vi.mock("@/auth/better-auth", async () => {
	const { createMockAuth } = await import("../../mocks/auth");
	return {
		auth: createMockAuth(),
	};
});

describe("lib/api-helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAuthenticatedSession", () => {
		it("should return session if user exists", async () => {
			const session = createMockSession();
			const { auth } = await import("@/auth/better-auth");
			auth.api.getSession = vi.fn().mockResolvedValue(session);

			const request = createMockRequest();
			const result = await getAuthenticatedSession(request);

			expect(result).toEqual(session);
		});

		it("should throw NextResponse if no user", async () => {
			const { auth } = await import("@/auth/better-auth");
			auth.api.getSession = vi.fn().mockResolvedValue({ session: {} });

			const request = createMockRequest();
			await expect(getAuthenticatedSession(request)).rejects.toThrow(
				NextResponse,
			);
		});

		it("should throw NextResponse if no session", async () => {
			const { auth } = await import("@/auth/better-auth");
			auth.api.getSession = vi.fn().mockResolvedValue(null);

			const request = createMockRequest();
			await expect(getAuthenticatedSession(request)).rejects.toThrow(
				NextResponse,
			);
		});
	});

	describe("getTenantContextWithAuth", () => {
		it("should return tenant context if valid", async () => {
			const session = createMockSession();
			const tenantContext = { organizationId: "org-123", userId: "user-123" };

			const { auth } = await import("@/auth/better-auth");
			auth.api.getSession = vi.fn().mockResolvedValue(session);
			mockGetTenantContext.mockResolvedValue(tenantContext);

			const request = createMockRequest();
			const result = await getTenantContextWithAuth(request);

			expect(result).toEqual(tenantContext);
		});

		it("should throw TenantMembershipError if user not a member", async () => {
			const session = createMockSession({
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: "org-123",
				},
			});

			const { auth } = await import("@/auth/better-auth");
			auth.api.getSession = vi.fn().mockResolvedValue(session);
			mockGetTenantContext.mockResolvedValue(null);
			mockVerifyOrganizationMembership.mockResolvedValue(false);

			const request = createMockRequest();
			await expect(getTenantContextWithAuth(request)).rejects.toThrow(
				TenantMembershipError,
			);
		});

		it("should throw NoActiveTenantError if no active organization", async () => {
			const session = createMockSession({
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: undefined,
				},
			});

			const { auth } = await import("@/auth/better-auth");
			auth.api.getSession = vi.fn().mockResolvedValue(session);
			mockGetTenantContext.mockResolvedValue(null);

			const request = createMockRequest();
			await expect(getTenantContextWithAuth(request)).rejects.toThrow(
				NoActiveTenantError,
			);
		});
	});

	describe("enforceTenantIsolation", () => {
		it("should throw error if organizationId is missing", async () => {
			await expect(enforceTenantIsolation("", "user-123")).rejects.toThrow(
				"Organization ID and User ID are required",
			);
		});

		it("should throw error if userId is missing", async () => {
			await expect(enforceTenantIsolation("org-123", "")).rejects.toThrow(
				"Organization ID and User ID are required",
			);
		});

		it("should not throw if user is a member", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(true);

			await expect(
				enforceTenantIsolation("org-123", "user-123"),
			).resolves.not.toThrow();
		});

		it("should throw TenantAccessDeniedError if user is not a member", async () => {
			mockVerifyOrganizationMembership.mockResolvedValue(false);

			await expect(
				enforceTenantIsolation("org-123", "user-123"),
			).rejects.toThrow(TenantAccessDeniedError);
		});
	});

	describe("withTenantIsolation", () => {
		it("should call handler with tenant context", async () => {
			const session = createMockSession();
			const tenantContext = { organizationId: "org-123", userId: "user-123" };

			const { auth } = await import("@/auth/better-auth");
			auth.api.getSession = vi.fn().mockResolvedValue(session);
			mockGetTenantContext.mockResolvedValue(tenantContext);

			const handler = vi
				.fn()
				.mockResolvedValue(NextResponse.json({ success: true }));

			const wrappedHandler = withTenantIsolation(handler);
			const request = createMockRequest();
			const result = await wrappedHandler(request);

			expect(handler).toHaveBeenCalledWith(request, tenantContext);
			expect(result.status).toBe(200);
		});

		it("should handle tenant errors", async () => {
			const session = createMockSession();
			const { auth } = await import("@/auth/better-auth");
			auth.api.getSession = vi.fn().mockResolvedValue(session);
			mockGetTenantContext.mockResolvedValue(null);
			mockVerifyOrganizationMembership.mockResolvedValue(false);

			const handler = vi.fn();
			const wrappedHandler = withTenantIsolation(handler);
			const request = createMockRequest();
			const result = await wrappedHandler(request);

			expect(handler).not.toHaveBeenCalled();
			expect(result.status).toBe(403);
		});

		it("should handle NextResponse errors", async () => {
			const session = createMockSession();
			const { auth } = await import("@/auth/better-auth");
			auth.api.getSession = vi.fn().mockResolvedValue(session);
			mockGetTenantContext.mockImplementation(() => {
				throw new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
				});
			});

			const handler = vi.fn();
			const wrappedHandler = withTenantIsolation(handler);
			const request = createMockRequest();
			const result = await wrappedHandler(request);

			expect(result.status).toBe(401);
		});

		it("should handle unknown errors", async () => {
			const session = createMockSession();
			const { auth } = await import("@/auth/better-auth");
			auth.api.getSession = vi.fn().mockResolvedValue(session);
			mockGetTenantContext.mockImplementation(() => {
				throw new Error("Unknown error");
			});

			const handler = vi.fn();
			const wrappedHandler = withTenantIsolation(handler);
			const request = createMockRequest();
			const result = await wrappedHandler(request);

			expect(result.status).toBe(500);
		});
	});
});
