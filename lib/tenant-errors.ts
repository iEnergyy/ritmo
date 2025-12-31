import { NextResponse } from "next/server";

/**
 * Custom error classes for tenant-related errors
 */
export class TenantNotFoundError extends Error {
	constructor(message = "Tenant not found") {
		super(message);
		this.name = "TenantNotFoundError";
	}
}

export class TenantAccessDeniedError extends Error {
	constructor(message = "Access denied to tenant") {
		super(message);
		this.name = "TenantAccessDeniedError";
	}
}

export class NoActiveTenantError extends Error {
	constructor(message = "No active tenant set") {
		super(message);
		this.name = "NoActiveTenantError";
	}
}

export class TenantMembershipError extends Error {
	constructor(message = "User is not a member of this tenant") {
		super(message);
		this.name = "TenantMembershipError";
	}
}

/**
 * Handle tenant-related errors and return appropriate HTTP responses
 * @param error - The error to handle
 * @returns NextResponse with appropriate status code and error message
 */
export function handleTenantError(error: unknown): NextResponse {
	if (error instanceof TenantNotFoundError) {
		return NextResponse.json({ error: error.message }, { status: 404 });
	}

	if (error instanceof TenantAccessDeniedError) {
		return NextResponse.json({ error: error.message }, { status: 403 });
	}

	if (error instanceof NoActiveTenantError) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	if (error instanceof TenantMembershipError) {
		return NextResponse.json({ error: error.message }, { status: 403 });
	}

	// Unknown error
	console.error("Unhandled tenant error:", error);
	return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/**
 * Create a redirect response for tenant-related errors
 * @param error - The error type
 * @param redirectUrl - The URL to redirect to
 * @param errorParam - Optional error parameter to include in query string
 * @returns NextResponse redirect
 */
export function createTenantErrorRedirect(
	error: "not_found" | "access_denied" | "no_membership",
	redirectUrl: string,
	errorParam?: string,
): NextResponse {
	const url = new URL(redirectUrl);
	url.searchParams.set("error", errorParam || error);
	return NextResponse.redirect(url);
}
