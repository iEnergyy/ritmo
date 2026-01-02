import { vi } from "vitest";
import type { NextRequest } from "next/server";

export interface MockSession {
	user: {
		id: string;
		name: string;
		email: string;
		image?: string;
	};
	session: {
		id: string;
		expiresAt: Date;
		activeOrganizationId?: string;
	};
}

/**
 * Creates a mock BetterAuth session
 */
export function createMockSession(
	overrides?: Partial<MockSession>,
): MockSession {
	return {
		user: {
			id: "user-123",
			name: "Test User",
			email: "test@example.com",
			...overrides?.user,
		},
		session: {
			id: "session-123",
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
			activeOrganizationId: "org-123",
			...overrides?.session,
		},
	};
}

/**
 * Creates a mock BetterAuth API object
 */
export function createMockAuthApi(mockSession: MockSession | null = null) {
	return {
		getSession: vi.fn().mockResolvedValue(mockSession),
		signUp: vi.fn().mockResolvedValue({ user: mockSession?.user }),
		signIn: vi.fn().mockResolvedValue({ user: mockSession?.user }),
		signOut: vi.fn().mockResolvedValue(undefined),
		setActiveOrganization: vi.fn().mockResolvedValue(undefined),
	};
}

/**
 * Creates a mock BetterAuth instance
 */
export function createMockAuth(mockSession: MockSession | null = null) {
	return {
		api: createMockAuthApi(mockSession),
	};
}
