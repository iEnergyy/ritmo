import "dotenv/config"; // Load .env for standalone scripts
import { db } from "@/db";
import {
	user,
	member,
	organizationMembers,
	organization,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import "@/lib/env"; // Validate environment variables

// Helper function to generate random text ID (similar to Better Auth)
function generateId(size = 32): string {
	return randomBytes(size).toString("base64url");
}

async function seedMembers() {
	try {
		const organizationId =
			process.env.ORGANIZATION_ID || process.argv[2];

		if (!organizationId) {
			console.error(
				"❌ Error: ORGANIZATION_ID is required. Provide it as an environment variable or command-line argument.",
			);
			console.error("Usage: ORGANIZATION_ID=org_xxx tsx scripts/seed-members.ts");
			process.exit(1);
		}

		console.log(`\n🌱 Seeding members for organization: ${organizationId}\n`);

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

		// Generate member data with all role types
		const memberData = [
			// Admins
			{
				name: "Admin User One",
				email: "admin1@example.com",
				role: "admin" as const,
			},
			{
				name: "Admin User Two",
				email: "admin2@example.com",
				role: "admin" as const,
			},
			// Teachers
			{
				name: "Teacher User One",
				email: "teacher1@example.com",
				role: "teacher" as const,
			},
			{
				name: "Teacher User Two",
				email: "teacher2@example.com",
				role: "teacher" as const,
			},
			{
				name: "Teacher User Three",
				email: "teacher3@example.com",
				role: "teacher" as const,
			},
			// Staff
			{
				name: "Staff User One",
				email: "staff1@example.com",
				role: "staff" as const,
			},
			{
				name: "Staff User Two",
				email: "staff2@example.com",
				role: "staff" as const,
			},
			{
				name: "Staff User Three",
				email: "staff3@example.com",
				role: "staff" as const,
			},
		];

		console.log(`Creating ${memberData.length} users and members...\n`);

		// Create users and members
		const now = new Date();
		const usersToInsert = memberData.map((m) => ({
			id: generateId(),
			name: m.name,
			email: m.email,
			emailVerified: false,
			image: null,
			createdAt: now,
			updatedAt: now,
		}));

		await db.insert(user).values(usersToInsert);

		console.log(`✅ Created ${usersToInsert.length} users`);

		// Create members (Better Auth member table)
		const membersToInsert = usersToInsert.map((u, index) => ({
			id: generateId(),
			organizationId,
			userId: u.id,
			role: "member", // Default role in Better Auth
			createdAt: now,
		}));

		await db.insert(member).values(membersToInsert);

		console.log(`✅ Created ${membersToInsert.length} members`);

		// Create organizationMembers with custom roles
		const organizationMembersToInsert = membersToInsert.map((m, index) => ({
			memberId: m.id,
			role: memberData[index].role,
			createdAt: now,
		}));

		await db.insert(organizationMembers).values(organizationMembersToInsert);

		console.log(`✅ Created ${organizationMembersToInsert.length} organization members with roles\n`);

		// Summary
		const adminCount = memberData.filter((m) => m.role === "admin").length;
		const teacherCount = memberData.filter((m) => m.role === "teacher").length;
		const staffCount = memberData.filter((m) => m.role === "staff").length;

		console.log(`📊 Summary:`);
		console.log(`   - ${adminCount} admins`);
		console.log(`   - ${teacherCount} teachers`);
		console.log(`   - ${staffCount} staff members\n`);

		process.exit(0);
	} catch (error) {
		console.error("❌ Error seeding members:", error);
		process.exit(1);
	}
}

seedMembers();

