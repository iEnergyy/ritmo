import { vi } from "vitest";
import type { NextRequest } from "next/server";
import {
	createMockSession,
	createMockAuth,
	type MockSession,
} from "../mocks/auth";

/**
 * Mock BetterAuth session for testing
 */
export function mockAuthSession(session: MockSession | null = null) {
	const mockAuth = createMockAuth(session);
	vi.mock("@/auth/better-auth", () => ({
		auth: mockAuth,
	}));
	return mockAuth;
}

/**
 * Create a mock session with organization context
 */
export function createSessionWithOrg(
	userId: string,
	orgId: string,
	overrides?: Partial<MockSession>,
): MockSession {
	return createMockSession({
		user: {
			id: userId,
			name: "Test User",
			email: "test@example.com",
			...overrides?.user,
		},
		session: {
			id: "session-123",
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
			activeOrganizationId: orgId,
			...overrides?.session,
		},
	});
}

/**
 * Create a mock request with auth headers
 */
export function createMockRequest(
	sessionId?: string,
	overrides?: Partial<RequestInit>,
): NextRequest {
	const headers = new Headers(overrides?.headers);
	if (sessionId) {
		headers.set("cookie", `better-auth.session_token=${sessionId}`);
	}

	return new NextRequest("http://localhost:3000", {
		...overrides,
		headers,
	});
}
