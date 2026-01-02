import { vi } from "vitest";
import type { Mock } from "vitest";
import { createMockQueryBuilder } from "./db";

/**
 * Creates a chainable Drizzle query builder mock
 * Supports chaining: .select().from().where().limit()
 */
export function createDrizzleQueryBuilder<T = unknown>(mockData: T[] = []) {
	const builder = createMockQueryBuilder<T>(mockData);

	// Add Drizzle-specific methods
	(builder as any).as = vi.fn().mockReturnThis();
	(builder as any).with = vi.fn().mockReturnThis();
	(builder as any).union = vi.fn().mockReturnThis();
	(builder as any).unionAll = vi.fn().mockReturnThis();
	(builder as any).except = vi.fn().mockReturnThis();
	(builder as any).intersect = vi.fn().mockReturnThis();

	return builder;
}

/**
 * Creates a mock Drizzle database instance
 */
export function createMockDrizzleDb() {
	const mockDb = {
		select: vi.fn().mockReturnValue(createDrizzleQueryBuilder()),
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
		transaction: vi.fn().mockImplementation(async (callback) => {
			const mockTx = createMockDrizzleDb();
			return callback(mockTx);
		}),
	};

	return mockDb;
}

/**
 * Helper to configure mock query to return specific data
 */
export function configureMockQuery<T>(mockBuilder: any, mockData: T[]): void {
	// Make it a proper thenable that works with await
	mockBuilder.then = function (
		onFulfilled?: (value: T[]) => any,
		onRejected?: (error: any) => any,
	) {
		const promise = Promise.resolve(mockData);
		return promise.then(onFulfilled, onRejected);
	};
	mockBuilder.catch = function (onRejected?: (error: any) => any) {
		return Promise.resolve(mockData).catch(onRejected);
	};
}

/**
 * Helper to configure mock query to return empty array
 */
export function configureMockQueryEmpty(mockBuilder: any): void {
	configureMockQuery(mockBuilder, []);
}

/**
 * Helper to configure mock query to throw error
 */
export function configureMockQueryError(mockBuilder: any, error: Error): void {
	// Make it a proper thenable that rejects
	mockBuilder.then = function (
		onFulfilled?: (value: any) => any,
		onRejected?: (error: any) => any,
	) {
		const promise = Promise.reject(error);
		return promise.then(onFulfilled, onRejected);
	};
	mockBuilder.catch = function (onRejected?: (error: any) => any) {
		return Promise.reject(error).catch(onRejected);
	};
}
