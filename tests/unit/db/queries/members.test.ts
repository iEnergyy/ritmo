import { describe, it, expect, beforeEach, vi } from "vitest";
import { getMembersByOrganization, getMemberById } from "@/db/queries/members";
import {
	createMockDrizzleDb,
	configureMockQuery,
} from "../../../mocks/drizzle";
import { createMembers } from "../../../factories";

vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../../mocks/drizzle");
	return {
		db: createMockDrizzleDb(),
	};
});
vi.mock("@/db/schema", () => ({
	member: { id: {}, organizationId: {}, userId: {}, createdAt: {} },
	organizationMembers: { role: {} },
	user: { email: {}, name: {} },
}));

describe("db/queries/members", () => {
	let mockDb: ReturnType<typeof createMockDrizzleDb>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
	});

	describe("getMembersByOrganization", () => {
		it("should return all members for organization", async () => {
			const orgId = "org-123";
			const mockMembers = createMembers(3, orgId);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockMembers);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getMembersByOrganization(orgId);
			expect(mockDb.select).toHaveBeenCalled();
		});
	});

	describe("getMemberById", () => {
		it("should return member when found", async () => {
			const orgId = "org-123";
			const memberId = "member-123";
			const mockMember = createMembers(1, orgId)[0];
			mockMember.id = memberId;

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, [mockMember]);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getMemberById(orgId, memberId);
			expect(result).toEqual(mockMember);
		});

		it("should return null when not found", async () => {
			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getMemberById("org-123", "member-123");
			expect(result).toBeNull();
		});
	});
});
