import "dotenv/config"; // Load .env for standalone scripts
import { db } from "@/db";
import { venues, organization } from "@/db/schema";
import { eq } from "drizzle-orm";
import "@/lib/env"; // Validate environment variables

async function seedVenues() {
	try {
		const organizationId =
			process.env.ORGANIZATION_ID || process.argv[2];

		if (!organizationId) {
			console.error(
				"❌ Error: ORGANIZATION_ID is required. Provide it as an environment variable or command-line argument.",
			);
			console.error("Usage: ORGANIZATION_ID=org_xxx tsx scripts/seed-venues.ts");
			process.exit(1);
		}

		console.log(`\n🌱 Seeding venues for organization: ${organizationId}\n`);

		// Verify organization exists
		const org = await db
			.select()
			.from(organization)
			.where(eq(organization.id, organizationId))
			.limit(1);

		if (org.length === 0) {
			console.error(`❌ Error: Organization with ID ${organizationId} not found.`);
			process.exit(1);
		}

		console.log(`✅ Organization found: ${org[0].name}\n`);

		// Generate 3 venues with realistic names and addresses
		const venueData = [
			{
				name: "Main Studio",
				address: "123 Dance Street, Suite 200, New York, NY 10001",
			},
			{
				name: "Dance Hall",
				address: "456 Performance Avenue, Los Angeles, CA 90028",
			},
			{
				name: "Rehearsal Room",
				address: null, // Venue without address
			},
		];

		// Insert venues
		const venuesToInsert = venueData.map((venue) => ({
			organizationId,
			name: venue.name,
			address: venue.address,
		}));

		await db.insert(venues).values(venuesToInsert);

		console.log(`✅ Successfully seeded ${venueData.length} venues!`);
		console.log(`   - ${venueData.filter((v) => v.address).length} with addresses`);
		console.log(`   - ${venueData.filter((v) => !v.address).length} without addresses\n`);

		process.exit(0);
	} catch (error) {
		console.error("❌ Error seeding venues:", error);
		process.exit(1);
	}
}

seedVenues();

