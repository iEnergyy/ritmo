import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	getVenuesByOrganization,
	getVenueById,
	createVenue,
	updateVenue,
	deleteVenue,
} from "@/db/queries/venues";
import {
	createMockDrizzleDb,
	configureMockQuery,
} from "../../../mocks/drizzle";
import { createVenues } from "../../../factories";

vi.mock("@/db", async () => {
	const { createMockDrizzleDb } = await import("../../../mocks/drizzle");
	return {
		db: createMockDrizzleDb(),
	};
});
vi.mock("@/db/schema", () => ({
	venues: { id: {}, organizationId: {}, name: {}, address: {} },
}));

describe("db/queries/venues", () => {
	let mockDb: ReturnType<typeof createMockDrizzleDb>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { db } = await import("@/db");
		mockDb = db as ReturnType<typeof createMockDrizzleDb>;
	});

	describe("getVenuesByOrganization", () => {
		it("should return all venues for organization", async () => {
			const orgId = "org-123";
			const mockVenues = createVenues(3, orgId);

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, mockVenues);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getVenuesByOrganization(orgId);
			expect(result).toEqual(mockVenues);
		});
	});

	describe("getVenueById", () => {
		it("should return venue when found", async () => {
			const orgId = "org-123";
			const venueId = "venue-123";
			const mockVenue = createVenues(1, orgId)[0];
			mockVenue.id = venueId;

			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, [mockVenue]);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getVenueById(orgId, venueId);
			expect(result).toEqual(mockVenue);
		});

		it("should return null when not found", async () => {
			const mockQuery = createMockDrizzleDb().select();
			configureMockQuery(mockQuery, []);
			vi.mocked(mockDb.select).mockReturnValue(mockQuery);

			const result = await getVenueById("org-123", "venue-123");
			expect(result).toBeNull();
		});
	});

	describe("createVenue", () => {
		it("should create a new venue", async () => {
			const newVenue = createVenues(1, "org-123")[0];

			const mockInsert = createMockDrizzleDb().insert();
			mockInsert.values = vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([newVenue]),
			});
			vi.mocked(mockDb.insert).mockReturnValue(mockInsert);

			const result = await createVenue({
				organizationId: newVenue.organizationId,
				name: newVenue.name,
				address: newVenue.address || null,
			});

			expect(result).toEqual(newVenue);
		});
	});

	describe("updateVenue", () => {
		it("should update venue", async () => {
			const existingVenue = createVenues(1, "org-123")[0];
			const updatedVenue = { ...existingVenue, name: "Updated Name" };

			const mockUpdate = createMockDrizzleDb().update();
			mockUpdate.set = vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([updatedVenue]),
				}),
			});
			vi.mocked(mockDb.update).mockReturnValue(mockUpdate);

			const result = await updateVenue(existingVenue.id, existingVenue, {
				name: "Updated Name",
			});

			expect(result).toEqual(updatedVenue);
		});
	});

	describe("deleteVenue", () => {
		it("should delete venue", async () => {
			const mockDelete = createMockDrizzleDb().delete();
			mockDelete.where = vi.fn().mockResolvedValue(undefined);
			vi.mocked(mockDb.delete).mockReturnValue(mockDelete);

			await deleteVenue("venue-123");
			expect(mockDb.delete).toHaveBeenCalled();
		});
	});
});
