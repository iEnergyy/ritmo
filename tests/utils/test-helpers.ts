import { vi } from "vitest";

/**
 * Reset all mocks between tests
 */
export function resetMocks() {
	vi.clearAllMocks();
}

/**
 * Wait for async operations to complete
 */
export async function waitFor(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock function that returns a value after a delay
 */
export function createDelayedMock<T>(value: T, delay: number = 0) {
	return vi
		.fn()
		.mockImplementation(
			() =>
				new Promise<T>((resolve) => setTimeout(() => resolve(value), delay)),
		);
}
