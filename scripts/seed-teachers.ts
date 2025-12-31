import "dotenv/config"; // Load .env for standalone scripts
import { db } from "@/db";
import { teachers, organization } from "@/db/schema";
import { eq } from "drizzle-orm";
import "@/lib/env"; // Validate environment variables

async function seedTeachers() {
	try {
		const organizationId =
			process.env.ORGANIZATION_ID || process.argv[2];

		if (!organizationId) {
			console.error(
				"❌ Error: ORGANIZATION_ID is required. Provide it as an environment variable or command-line argument.",
			);
			console.error("Usage: ORGANIZATION_ID=org_xxx tsx scripts/seed-teachers.ts");
			process.exit(1);
		}

		console.log(`\n🌱 Seeding teachers for organization: ${organizationId}\n`);

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

		// Generate 4 teachers covering all payment types
		const teacherData = [
			{
				fullName: "Sarah Chen",
				userId: null, // Teacher without user account
				paymentType: "fixed_monthly" as const,
				monthlyRate: "3500.00",
				ratePerHead: null,
				ratePerClass: null,
			},
			{
				fullName: "Michael Rodriguez",
				userId: null, // Teacher without user account
				paymentType: "per_head" as const,
				monthlyRate: null,
				ratePerHead: "25.00",
				ratePerClass: null,
			},
			{
				fullName: "Jessica Thompson",
				userId: null, // Teacher without user account
				paymentType: "per_class" as const,
				monthlyRate: null,
				ratePerHead: null,
				ratePerClass: "150.00",
			},
			{
				fullName: "David Kim",
				userId: null, // Teacher without user account
				paymentType: "fixed_monthly" as const,
				monthlyRate: "4200.00",
				ratePerHead: null,
				ratePerClass: null,
			},
		];

		// Insert teachers
		const teachersToInsert = teacherData.map((teacher) => ({
			organizationId,
			userId: teacher.userId,
			fullName: teacher.fullName,
			paymentType: teacher.paymentType,
			monthlyRate: teacher.monthlyRate,
			ratePerHead: teacher.ratePerHead,
			ratePerClass: teacher.ratePerClass,
		}));

		await db.insert(teachers).values(teachersToInsert);

		console.log(`✅ Successfully seeded ${teacherData.length} teachers!`);
		console.log(`   - ${teacherData.filter((t) => t.paymentType === "fixed_monthly").length} with fixed_monthly payment`);
		console.log(`   - ${teacherData.filter((t) => t.paymentType === "per_head").length} with per_head payment`);
		console.log(`   - ${teacherData.filter((t) => t.paymentType === "per_class").length} with per_class payment\n`);

		process.exit(0);
	} catch (error) {
		console.error("❌ Error seeding teachers:", error);
		process.exit(1);
	}
}

seedTeachers();

