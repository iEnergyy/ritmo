import { describe, it, expect } from "vitest";
import {
	TenantNotFoundError,
	TenantAccessDeniedError,
	NoActiveTenantError,
	TenantMembershipError,
	handleTenantError,
	createTenantErrorRedirect,
} from "@/lib/tenant-errors";
import { NextResponse } from "next/server";

describe("lib/tenant-errors", () => {
	describe("TenantNotFoundError", () => {
		it("should create error with default message", () => {
			const error = new TenantNotFoundError();
			expect(error).toBeInstanceOf(Error);
			expect(error.name).toBe("TenantNotFoundError");
			expect(error.message).toBe("Tenant not found");
		});

		it("should create error with custom message", () => {
			const error = new TenantNotFoundError("Custom message");
			expect(error.message).toBe("Custom message");
		});
	});

	describe("TenantAccessDeniedError", () => {
		it("should create error with default message", () => {
			const error = new TenantAccessDeniedError();
			expect(error).toBeInstanceOf(Error);
			expect(error.name).toBe("TenantAccessDeniedError");
			expect(error.message).toBe("Access denied to tenant");
		});
	});

	describe("NoActiveTenantError", () => {
		it("should create error with default message", () => {
			const error = new NoActiveTenantError();
			expect(error).toBeInstanceOf(Error);
			expect(error.name).toBe("NoActiveTenantError");
			expect(error.message).toBe("No active tenant set");
		});
	});

	describe("TenantMembershipError", () => {
		it("should create error with default message", () => {
			const error = new TenantMembershipError();
			expect(error).toBeInstanceOf(Error);
			expect(error.name).toBe("TenantMembershipError");
			expect(error.message).toBe("User is not a member of this tenant");
		});
	});

	describe("handleTenantError", () => {
		it("should handle TenantNotFoundError", () => {
			const error = new TenantNotFoundError("Not found");
			const response = handleTenantError(error);

			expect(response).toBeInstanceOf(NextResponse);
			expect(response.status).toBe(404);
		});

		it("should handle TenantAccessDeniedError", () => {
			const error = new TenantAccessDeniedError("Access denied");
			const response = handleTenantError(error);

			expect(response).toBeInstanceOf(NextResponse);
			expect(response.status).toBe(403);
		});

		it("should handle NoActiveTenantError", () => {
			const error = new NoActiveTenantError("No tenant");
			const response = handleTenantError(error);

			expect(response).toBeInstanceOf(NextResponse);
			expect(response.status).toBe(400);
		});

		it("should handle TenantMembershipError", () => {
			const error = new TenantMembershipError("Not a member");
			const response = handleTenantError(error);

			expect(response).toBeInstanceOf(NextResponse);
			expect(response.status).toBe(403);
		});

		it("should handle unknown errors", () => {
			const error = new Error("Unknown error");
			const response = handleTenantError(error);

			expect(response).toBeInstanceOf(NextResponse);
			expect(response.status).toBe(500);
		});
	});

	describe("createTenantErrorRedirect", () => {
		it("should create redirect with error parameter", () => {
			const redirectUrl = "http://localhost:3000/dashboard";
			const response = createTenantErrorRedirect("not_found", redirectUrl);

			expect(response).toBeInstanceOf(NextResponse);
			expect(response.status).toBe(307);
		});

		it("should create redirect with custom error parameter", () => {
			const redirectUrl = "http://localhost:3000/dashboard";
			const response = createTenantErrorRedirect(
				"access_denied",
				redirectUrl,
				"custom_error",
			);

			expect(response).toBeInstanceOf(NextResponse);
		});
	});
});
