import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	getGroupSchedule,
	getScheduleSlots,
	upsertGroupSchedule,
} from "@/db/queries/group-schedules";
import {
	createMockDrizzleDb,
	configureMockQuery,
} from "../../../mocks/drizzle";

vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../../mocks/drizzle");
	return {
		db: createMockDrizzleDb(),
	};
});
vi.mock("@/db/schema", () => ({
	groupSchedules: {
		id: {},
		groupId: {},
		organizationId: {},
		effectiveFrom: {},
		effectiveTo: {},
	},
	groupScheduleSlots: {
		id: {},
		groupScheduleId: {},
		dayOfWeek: {},
		startTime: {},
		sortOrder: {},
	},
}));

describe("db/queries/group-schedules", () => {
	let mockDb: ReturnType<typeof createMockDrizzleDb>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
	});

	describe("getGroupSchedule", () => {
		it("returns schedules with slots for group", async () => {
			const groupId = "g-1";
			const orgId = "org-1";
			const mockRows = [
				{
					schedule: {
						id: "sched-1",
						groupId,
						organizationId: orgId,
						recurrence: "weekly",
						durationHours: "1",
						effectiveFrom: "2026-01-01",
						effectiveTo: null,
						createdAt: new Date(),
					},
					slot: {
						id: "slot-1",
						groupScheduleId: "sched-1",
						dayOfWeek: 1,
						startTime: "10:00",
						sortOrder: 0,
					},
				},
			];

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockRows);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getGroupSchedule(groupId, orgId);

			expect(result).toHaveLength(1);
			expect(result[0].slots).toHaveLength(1);
			expect(result[0].slots[0].startTime).toBe("10:00");
			expect(mockDb.select).toHaveBeenCalled();
		});

		it("returns empty when no schedule", async () => {
			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getGroupSchedule("g-1", "org-1");

			expect(result).toHaveLength(0);
		});
	});

	describe("getScheduleSlots", () => {
		it("returns schedules in date range", async () => {
			const groupId = "g-1";
			const orgId = "org-1";
			const mockRows = [
				{
					schedule: {
						id: "sched-1",
						groupId,
						organizationId: orgId,
						recurrence: "weekly",
						durationHours: "1",
						effectiveFrom: "2026-01-01",
						effectiveTo: "2026-12-31",
						createdAt: new Date(),
					},
					slot: {
						id: "slot-1",
						groupScheduleId: "sched-1",
						dayOfWeek: 1,
						startTime: "10:00",
						sortOrder: 0,
					},
				},
			];

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockRows);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getScheduleSlots(
				groupId,
				orgId,
				new Date("2026-06-01"),
				new Date("2026-06-30"),
			);

			expect(result).toHaveLength(1);
			expect(mockDb.select).toHaveBeenCalled();
		});
	});

	describe("upsertGroupSchedule", () => {
		it("inserts new schedule and slots", async () => {
			const groupId = "g-1";
			const orgId = "org-1";
			const newSchedule = {
				id: "sched-new",
				groupId,
				organizationId: orgId,
				recurrence: "weekly",
				durationHours: "1",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				createdAt: new Date(),
			};
			const newSlot = {
				id: "slot-new",
				groupScheduleId: newSchedule.id,
				dayOfWeek: 1,
				startTime: "10:00",
				sortOrder: 0,
			};

			const mockUpdate = createMockDrizzleDb().update();
			mockUpdate.set = vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined),
			});
			vi.mocked(mockDb.update).mockReturnValue(mockUpdate);

			const mockInsert = createMockDrizzleDb().insert();
			mockInsert.values = vi.fn().mockReturnValue({
				returning: vi
					.fn()
					.mockResolvedValueOnce([newSchedule])
					.mockResolvedValueOnce([newSlot]),
			});
			vi.mocked(mockDb.insert).mockReturnValue(mockInsert);

			const result = await upsertGroupSchedule(groupId, orgId, {
				recurrence: "weekly",
				durationHours: 1,
				effectiveFrom: "2026-01-01",
				slots: [{ dayOfWeek: 1, startTime: "10:00" }],
			});

			expect(result.id).toBe(newSchedule.id);
			expect(result.slots).toHaveLength(1);
			expect(result.slots[0].startTime).toBe("10:00");
		});
	});
});
