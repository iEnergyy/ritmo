import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	getAttendanceBySession,
	hasAttendanceRecords,
	getAttendanceForSessionWithExpected,
} from "@/db/queries/attendance";
import {
	createMockDrizzleDb,
	configureMockQuery,
} from "../../../mocks/drizzle";
import { createClassSession, createClassSessions } from "../../../factories";
import { createStudent } from "../../../factories";

vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../../mocks/drizzle");
	return { db: createMockDrizzleDb() };
});
vi.mock("@/db/schema", () => ({
	attendanceRecords: {
		id: {},
		classSessionId: {},
		studentId: {},
		status: {},
		markedAt: {},
	},
	classSessions: { id: {}, organizationId: {}, groupId: {} },
	students: { id: {}, organizationId: {} },
	groups: { id: {} },
}));
vi.mock("@/db/queries/class-sessions", () => ({
	getSessionById: vi.fn(),
}));
vi.mock("@/db/queries/student-groups", () => ({
	getEnrollmentsByGroupOnDate: vi.fn(),
}));

describe("db/queries/attendance", () => {
	let mockDb: ReturnType<typeof createMockDrizzleDb>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
	});

	describe("getAttendanceBySession", () => {
		it("returns empty when session not found", async () => {
			const { getSessionById } = await import("@/db/queries/class-sessions");
			vi.mocked(getSessionById).mockResolvedValue(null);

			const result = await getAttendanceBySession("org-1", "session-1");

			expect(result).toHaveLength(0);
		});

		it("returns attendance records when session exists", async () => {
			const { getSessionById } = await import("@/db/queries/class-sessions");
			const session = createClassSessions(1, "org-1")[0];
			const student = createStudent({ organizationId: "org-1" });
			vi.mocked(getSessionById).mockResolvedValue({
				...session,
				group: null,
				teacher: { id: "t-1", fullName: "T", organizationId: "org-1" },
				venue: null,
			});

			const mockRecords = [
				{
					id: "ar-1",
					classSessionId: session.id,
					studentId: student.id,
					status: "present" as const,
					markedAt: new Date(),
					student,
				},
			];
			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockRecords);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getAttendanceBySession("org-1", session.id);

			expect(result).toHaveLength(1);
			expect(result[0].status).toBe("present");
		});
	});

	describe("getAttendanceForSessionWithExpected", () => {
		it("returns empty expected and rows when session not found", async () => {
			const { getSessionById } = await import("@/db/queries/class-sessions");
			vi.mocked(getSessionById).mockResolvedValue(null);

			const result = await getAttendanceForSessionWithExpected(
				"org-1",
				"session-1",
			);

			expect(result.expected).toHaveLength(0);
			expect(result.rows).toHaveLength(0);
		});
	});

	describe("hasAttendanceRecords", () => {
		it("returns false when no records", async () => {
			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await hasAttendanceRecords("session-1");

			expect(result).toBe(false);
		});

		it("returns true when records exist", async () => {
			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, [{ id: "ar-1" }]);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await hasAttendanceRecords("session-1");

			expect(result).toBe(true);
		});
	});
});
