import { vi } from "vitest";
import type { NextRequest } from "next/server";
import { createMockSession } from "../mocks/auth";
import { createMockDrizzleDb } from "../mocks/drizzle";

/**
 * Create tenant context for testing
 */
export interface TenantContext {
	organizationId: string;
	userId: string;
}

/**
 * Mock tenant context resolution
 */
export function mockTenantContext(context: TenantContext | null) {
	// Mock the database for membership checks
	const mockDb = createMockDrizzleDb();

	if (context) {
		// Mock membership query to return true
		const mockQuery = mockDb.select();
		mockQuery.from = vi.fn().mockReturnThis();
		mockQuery.where = vi.fn().mockReturnThis();
		mockQuery.limit = vi.fn().mockResolvedValue([{ id: "member-123" }]);
		mockDb.select = vi.fn().mockReturnValue(mockQuery);
	} else {
		// Mock membership query to return empty (no membership)
		const mockQuery = mockDb.select();
		mockQuery.from = vi.fn().mockReturnThis();
		mockQuery.where = vi.fn().mockReturnThis();
		mockQuery.limit = vi.fn().mockResolvedValue([]);
		mockDb.select = vi.fn().mockReturnValue(mockQuery);
	}

	vi.mock("@/db", () => ({
		db: mockDb,
	}));

	// Mock auth session
	const mockSession = context
		? createMockSession({
				user: { id: context.userId, name: "Test", email: "test@example.com" },
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: context.organizationId,
				},
			})
		: null;

	vi.mock("@/auth/better-auth", () => ({
		auth: {
			api: {
				getSession: vi.fn().mockResolvedValue(mockSession),
			},
		},
	}));

	return { mockDb, mockSession };
}

/**
 * Create organization IDs for testing
 */
export function createTestOrgIds(count: number = 2): string[] {
	return Array.from({ length: count }, (_, i) => `org-${i + 1}`);
}

/**
 * Create user IDs for testing
 */
export function createTestUserIds(count: number = 2): string[] {
	return Array.from({ length: count }, (_, i) => `user-${i + 1}`);
}
