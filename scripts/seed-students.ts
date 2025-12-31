import "dotenv/config"; // Load .env for standalone scripts
import { db } from "@/db";
import { students, organization } from "@/db/schema";
import { eq } from "drizzle-orm";
import "@/lib/env"; // Validate environment variables

async function seedStudents() {
	try {
		const organizationId =
			process.env.ORGANIZATION_ID || process.argv[2];

		if (!organizationId) {
			console.error(
				"❌ Error: ORGANIZATION_ID is required. Provide it as an environment variable or command-line argument.",
			);
			console.error("Usage: ORGANIZATION_ID=org_xxx tsx scripts/seed-students.ts");
			process.exit(1);
		}

		console.log(`\n🌱 Seeding students for organization: ${organizationId}\n`);

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

		// Generate 30+ students with varied data
		const studentData = [
			// Students with both email and phone
			{
				fullName: "Emma Johnson",
				email: "emma.johnson@example.com",
				phone: "+1-555-0101",
			},
			{
				fullName: "Liam Williams",
				email: "liam.williams@example.com",
				phone: "+1-555-0102",
			},
			{
				fullName: "Olivia Brown",
				email: "olivia.brown@example.com",
				phone: "+1-555-0103",
			},
			{
				fullName: "Noah Jones",
				email: "noah.jones@example.com",
				phone: "+1-555-0104",
			},
			{
				fullName: "Ava Garcia",
				email: "ava.garcia@example.com",
				phone: "+1-555-0105",
			},
			{
				fullName: "Ethan Miller",
				email: "ethan.miller@example.com",
				phone: "+1-555-0106",
			},
			{
				fullName: "Sophia Davis",
				email: "sophia.davis@example.com",
				phone: "+1-555-0107",
			},
			{
				fullName: "Mason Rodriguez",
				email: "mason.rodriguez@example.com",
				phone: "+1-555-0108",
			},
			{
				fullName: "Isabella Martinez",
				email: "isabella.martinez@example.com",
				phone: "+1-555-0109",
			},
			{
				fullName: "James Wilson",
				email: "james.wilson@example.com",
				phone: "+1-555-0110",
			},
			// Students with only email
			{
				fullName: "Charlotte Moore",
				email: "charlotte.moore@example.com",
				phone: null,
			},
			{
				fullName: "Benjamin Taylor",
				email: "benjamin.taylor@example.com",
				phone: null,
			},
			{
				fullName: "Amelia Anderson",
				email: "amelia.anderson@example.com",
				phone: null,
			},
			{
				fullName: "Lucas Thomas",
				email: "lucas.thomas@example.com",
				phone: null,
			},
			{
				fullName: "Harper Jackson",
				email: "harper.jackson@example.com",
				phone: null,
			},
			{
				fullName: "Henry White",
				email: "henry.white@example.com",
				phone: null,
			},
			// Students with only phone
			{
				fullName: "Mia Harris",
				email: null,
				phone: "+1-555-0117",
			},
			{
				fullName: "Alexander Martin",
				email: null,
				phone: "+1-555-0118",
			},
			{
				fullName: "Evelyn Thompson",
				email: null,
				phone: "+1-555-0119",
			},
			{
				fullName: "Daniel Garcia",
				email: null,
				phone: "+1-555-0120",
			},
			{
				fullName: "Abigail Martinez",
				email: null,
				phone: "+1-555-0121",
			},
			{
				fullName: "Matthew Robinson",
				email: null,
				phone: "+1-555-0122",
			},
			// Students with minimal data (no email, no phone)
			{
				fullName: "Emily Clark",
				email: null,
				phone: null,
			},
			{
				fullName: "David Rodriguez",
				email: null,
				phone: null,
			},
			{
				fullName: "Elizabeth Lewis",
				email: null,
				phone: null,
			},
			{
				fullName: "Joseph Walker",
				email: null,
				phone: null,
			},
			{
				fullName: "Sofia Hall",
				email: null,
				phone: null,
			},
			// Additional students with both email and phone
			{
				fullName: "Andrew Allen",
				email: "andrew.allen@example.com",
				phone: "+1-555-0128",
			},
			{
				fullName: "Grace Young",
				email: "grace.young@example.com",
				phone: "+1-555-0129",
			},
			{
				fullName: "Christopher King",
				email: "christopher.king@example.com",
				phone: "+1-555-0130",
			},
			{
				fullName: "Victoria Wright",
				email: "victoria.wright@example.com",
				phone: "+1-555-0131",
			},
		];

		// Insert students
		const studentsToInsert = studentData.map((student) => ({
			organizationId,
			fullName: student.fullName,
			email: student.email,
			phone: student.phone,
		}));

		await db.insert(students).values(studentsToInsert);

		console.log(`✅ Successfully seeded ${studentData.length} students!`);
		console.log(`   - ${studentData.filter((s) => s.email && s.phone).length} with email and phone`);
		console.log(`   - ${studentData.filter((s) => s.email && !s.phone).length} with email only`);
		console.log(`   - ${studentData.filter((s) => !s.email && s.phone).length} with phone only`);
		console.log(`   - ${studentData.filter((s) => !s.email && !s.phone).length} with minimal data\n`);

		process.exit(0);
	} catch (error) {
		console.error("❌ Error seeding students:", error);
		process.exit(1);
	}
}

seedStudents();

