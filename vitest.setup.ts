import "@testing-library/jest-dom";
import { vi, beforeEach } from "vitest";

// Mock environment variables
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.BETTER_AUTH_SECRET = "test-secret-key-for-testing-only";
process.env.BETTER_AUTH_URL = "http://localhost:3000";

// Global test setup
beforeEach(() => {
	// Reset all mocks before each test
	vi.clearAllMocks();
});
