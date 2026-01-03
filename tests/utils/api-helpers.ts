import { NextRequest, NextResponse } from "next/server";
import { createMockSession } from "../mocks/auth";

/**
 * Create a mock NextRequest
 */
export function createMockRequest(
	url: string = "http://localhost:3000",
	options?: {
		method?: string;
		headers?: HeadersInit;
		body?: unknown;
		cookies?: Record<string, string>;
	},
): NextRequest {
	const headers = new Headers(options?.headers);

	// Add cookies to headers
	if (options?.cookies) {
		const cookieString = Object.entries(options.cookies)
			.map(([key, value]) => `${key}=${value}`)
			.join("; ");
		headers.set("cookie", cookieString);
	}

	const requestInit: RequestInit = {
		method: options?.method || "GET",
		headers,
	};

	if (options?.body) {
		requestInit.body = JSON.stringify(options.body);
		headers.set("content-type", "application/json");
	}

	// Type assertion to match Next.js RequestInit (which doesn't allow signal: null)
	return new NextRequest(url, requestInit as ConstructorParameters<typeof NextRequest>[1]);
}

/**
 * Create a mock NextRequest with authentication
 */
export function createAuthenticatedRequest(
	url: string = "http://localhost:3000",
	sessionId: string = "session-123",
	options?: {
		method?: string;
		body?: unknown;
		organizationId?: string;
	},
): NextRequest {
	const session = createMockSession({
		session: {
			id: sessionId,
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
			activeOrganizationId: options?.organizationId || "org-123",
		},
	});

	return createMockRequest(url, {
		...options,
		cookies: {
			"better-auth.session_token": sessionId,
		},
	});
}

/**
 * Extract JSON from NextResponse
 */
export async function getResponseJson<T = unknown>(
	response: NextResponse,
): Promise<T> {
	return (await response.json()) as T;
}

/**
 * Extract text from NextResponse
 */
export async function getResponseText(response: NextResponse): Promise<string> {
	return await response.text();
}
