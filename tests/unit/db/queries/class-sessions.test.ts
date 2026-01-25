import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	getSessionsByOrganization,
	getSessionById,
	getSessionsByGroup,
	createSession,
	updateSession,
	updateSessionStatus,
	deleteSession,
} from "@/db/queries/class-sessions";
import {
	createMockDrizzleDb,
	configureMockQuery,
} from "../../../mocks/drizzle";
import { createClassSessions, createClassSession } from "../../../factories";

vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../../mocks/drizzle");
	return {
		db: createMockDrizzleDb(),
	};
});
vi.mock("@/db/schema", () => ({
	classSessions: { id: {}, organizationId: {}, groupId: {}, teacherId: {} },
	groups: { id: {} },
	teachers: { id: {} },
	venues: { id: {} },
}));

function asSessionWithRelations(s: ReturnType<typeof createClassSession>) {
	return {
		...s,
		group: null,
		teacher: {
			id: s.teacherId,
			fullName: "Teacher",
			organizationId: s.organizationId,
		},
		venue: null,
	};
}

describe("db/queries/class-sessions", () => {
	let mockDb: ReturnType<typeof createMockDrizzleDb>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
	});

	describe("getSessionsByOrganization", () => {
		it("returns sessions for organization", async () => {
			const orgId = "org-1";
			const mockSessions = createClassSessions(2, orgId).map(
				asSessionWithRelations,
			);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockSessions);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getSessionsByOrganization(orgId);

			expect(result).toHaveLength(2);
			expect(mockDb.select).toHaveBeenCalled();
		});

		it("applies filters when provided", async () => {
			const orgId = "org-1";
			const mockSessions = createClassSessions(1, orgId).map(
				asSessionWithRelations,
			);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockSessions);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			await getSessionsByOrganization(orgId, {
				groupId: "g-1",
				teacherId: "t-1",
				status: "scheduled",
			});

			expect(mockDb.select).toHaveBeenCalled();
		});
	});

	describe("getSessionById", () => {
		it("returns session when found", async () => {
			const orgId = "org-1";
			const sessionId = "session-1";
			const mockSession = asSessionWithRelations(
				createClassSession({ id: sessionId, organizationId: orgId }),
			);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, [mockSession]);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getSessionById(orgId, sessionId);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(sessionId);
		});

		it("returns null when not found", async () => {
			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getSessionById("org-1", "session-999");

			expect(result).toBeNull();
		});
	});

	describe("getSessionsByGroup", () => {
		it("returns sessions for group via getSessionsByOrganization", async () => {
			const orgId = "org-1";
			const groupId = "g-1";
			const mockSessions = createClassSessions(1, orgId, { groupId }).map(
				asSessionWithRelations,
			);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockSessions);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getSessionsByGroup(groupId, orgId);

			expect(result).toHaveLength(1);
		});
	});

	describe("createSession", () => {
		it("creates a session with date string", async () => {
			const newSession = createClassSession({ organizationId: "org-1" });

			const mockInsert = createMockDrizzleDb().insert();
			mockInsert.values = vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([newSession]),
			});
			vi.mocked(mockDb.insert).mockReturnValue(mockInsert);

			const result = await createSession({
				organizationId: newSession.organizationId,
				teacherId: newSession.teacherId,
				date: newSession.date,
				status: newSession.status,
			});

			expect(result).toEqual(newSession);
			expect(mockDb.insert).toHaveBeenCalled();
		});

		it("accepts Date for date and normalizes to string", async () => {
			const newSession = createClassSession({ organizationId: "org-1" });

			const mockInsert = createMockDrizzleDb().insert();
			mockInsert.values = vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([newSession]),
			});
			vi.mocked(mockDb.insert).mockReturnValue(mockInsert);

			await createSession({
				organizationId: newSession.organizationId,
				teacherId: newSession.teacherId,
				date: new Date(newSession.date + "T12:00:00"),
				status: newSession.status,
			});

			expect(mockInsert.values).toHaveBeenCalledWith(
				expect.objectContaining({
					organizationId: newSession.organizationId,
					teacherId: newSession.teacherId,
					status: newSession.status,
				}),
			);
		});
	});

	describe("updateSession", () => {
		it("updates session and returns updated", async () => {
			const existing = createClassSession({ organizationId: "org-1" });
			const updated = {
				...existing,
				date: "2026-02-01",
				startTime: "14:00",
				endTime: "15:00",
			};

			const mockUpdate = createMockDrizzleDb().update();
			mockUpdate.set = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([updated]),
				}),
			});
			vi.mocked(mockDb.update).mockReturnValue(mockUpdate);

			const result = await updateSession(existing.id, existing, {
				date: "2026-02-01",
				startTime: "14:00",
				endTime: "15:00",
			});

			expect(result.date).toBe("2026-02-01");
		});
	});

	describe("updateSessionStatus", () => {
		it("updates status and returns session", async () => {
			const existing = createClassSession({ organizationId: "org-1" });
			const updated = { ...existing, status: "held" as const };

			const mockUpdate = createMockDrizzleDb().update();
			mockUpdate.set = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([updated]),
				}),
			});
			vi.mocked(mockDb.update).mockReturnValue(mockUpdate);

			const result = await updateSessionStatus(existing.id, "held");

			expect(result.status).toBe("held");
		});
	});

	describe("deleteSession", () => {
		it("deletes session", async () => {
			const mockDelete = createMockDrizzleDb().delete();
			mockDelete.where = vi.fn().mockResolvedValue(undefined);
			vi.mocked(mockDb.delete).mockReturnValue(mockDelete);

			await deleteSession("session-1");

			expect(mockDb.delete).toHaveBeenCalled();
		});
	});
});
