import { vi } from "vitest";
import { createMockDrizzleDb, configureMockQuery } from "../mocks/drizzle";

/**
 * Setup database mocks for a test
 */
export function setupDbMocks() {
	const mockDb = createMockDrizzleDb();
	vi.mock("@/db", () => ({
		db: mockDb,
	}));
	return mockDb;
}

/**
 * Configure mock query to return data
 */
export function mockQueryResult<T>(mockDb: any, data: T[]) {
	const mockQuery = mockDb.select();
	configureMockQuery(mockQuery, data);
	return mockQuery;
}

/**
 * Configure mock query to return empty array
 */
export function mockQueryEmpty(mockDb: any) {
	return mockQueryResult(mockDb, []);
}

/**
 * Configure mock insert to return inserted data
 */
export function mockInsertResult<T>(mockDb: any, data: T[]) {
	const mockInsert = mockDb.insert();
	mockInsert.values = vi.fn().mockReturnValue({
		returning: vi.fn().mockResolvedValue(data),
	});
	return mockInsert;
}

/**
 * Configure mock update to return updated data
 */
export function mockUpdateResult<T>(mockDb: any, data: T[]) {
	const mockUpdate = mockDb.update();
	mockUpdate.set = vi.fn().mockReturnValue({
		where: vi.fn().mockReturnValue({
			returning: vi.fn().mockResolvedValue(data),
		}),
	});
	return mockUpdate;
}

/**
 * Configure mock delete to return deleted data
 */
export function mockDeleteResult<T>(mockDb: any, data: T[]) {
	const mockDelete = mockDb.delete();
	mockDelete.where = vi.fn().mockReturnValue({
		returning: vi.fn().mockResolvedValue(data),
	});
	return mockDelete;
}
