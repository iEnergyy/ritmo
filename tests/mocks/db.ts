import { vi } from "vitest";
import type { Mock } from "vitest";

/**
 * Creates a mock query builder that chains methods and returns fixture data
 */
export function createMockQueryBuilder<T = unknown>(mockData: T[] = []) {
	const mockBuilder = {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		groupBy: vi.fn().mockReturnThis(),
		having: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis(),
	} as unknown as Mock;

	// Make it a proper thenable that works with await
	(mockBuilder as any).then = function (
		onFulfilled?: (value: T[]) => any,
		onRejected?: (error: any) => any,
	) {
		const promise = Promise.resolve(mockData);
		return promise.then(onFulfilled, onRejected);
	};
	(mockBuilder as any).catch = function (onRejected?: (error: any) => any) {
		return Promise.resolve(mockData).catch(onRejected);
	};

	return mockBuilder;
}

/**
 * Creates a mock database instance with query builders
 */
export function createMockDb() {
	const mockDb = {
		select: vi.fn().mockReturnValue(createMockQueryBuilder()),
		insert: vi.fn().mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([]),
			}),
			returning: vi.fn().mockResolvedValue([]),
		}),
		update: vi.fn().mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([]),
				}),
				returning: vi.fn().mockResolvedValue([]),
			}),
			where: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([]),
			}),
		}),
		delete: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([]),
			}),
		}),
	};

	return mockDb;
}

/**
 * Resets all database mocks
 */
export function resetDbMocks() {
	vi.clearAllMocks();
}
