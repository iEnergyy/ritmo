import "dotenv/config"; // Load .env for standalone scripts
import { db } from "@/db";
import { sql } from "drizzle-orm";
import "@/lib/env"; // Validate environment variables

async function checkDatabase() {
	try {
		console.log("Checking database connection...");

		// Check if Better Auth tables exist
		const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

		console.log("\n✅ Database connection successful!");
		console.log("\n📊 Tables in database:");

		// Handle different response formats
		const tables = Array.isArray(result) ? result : (result as any).rows || [];
		const tableNames = tables.map((row: any) =>
			typeof row === "string"
				? row
				: row.table_name || row[0] || Object.values(row)[0],
		);

		tableNames.forEach((name: string) => console.log(`  - ${name}`));

		// Check if Better Auth core tables exist
		const requiredTables = [
			"user",
			"session",
			"account",
			"organization",
			"member",
		];
		const existingTables = tableNames;
		const missingTables = requiredTables.filter(
			(t) => !existingTables.includes(t),
		);

		if (missingTables.length === 0) {
			console.log("\n✅ All Better Auth tables exist!");
		} else {
			console.log("\n⚠️  Missing tables:", missingTables);
		}

		// Check if custom tables exist
		const customTables = [
			"students",
			"teachers",
			"groups",
			"organization_metadata",
			"organization_members",
		];
		const missingCustom = customTables.filter(
			(t) =>
				!existingTables.some(
					(et: string) => et.toLowerCase() === t.toLowerCase(),
				),
		);

		if (missingCustom.length === 0) {
			console.log("✅ All custom tables exist!");
		} else {
			console.log("⚠️  Missing custom tables:", missingCustom);
		}

		process.exit(0);
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

checkDatabase();
