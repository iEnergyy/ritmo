import "dotenv/config"; // Load .env for standalone scripts
import { db } from "@/db";
import { sql } from "drizzle-orm";
import "@/lib/env"; // Validate environment variables

async function fixSessionTable() {
	try {
		console.log("Checking session table schema...\n");

		// Check if active_organization_id column exists
		const columnCheck = await db.execute(sql`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_schema = 'public' 
			AND table_name = 'session' 
			AND column_name = 'active_organization_id';
		`);

		// Handle different response formats
		const rows = Array.isArray(columnCheck)
			? columnCheck
			: (columnCheck as any).rows || [];
		const hasColumn = rows.length > 0;

		if (hasColumn) {
			console.log(
				"✅ Column 'active_organization_id' already exists in session table",
			);
		} else {
			console.log(
				"⚠️  Column 'active_organization_id' is missing. Adding it...",
			);

			// Add the column
			await db.execute(sql`
				ALTER TABLE "session" 
				ADD COLUMN IF NOT EXISTS "active_organization_id" text;
			`);

			console.log("✅ Column 'active_organization_id' added successfully!");
		}

		// Verify all required columns exist
		const allColumns = await db.execute(sql`
			SELECT column_name, data_type, is_nullable
			FROM information_schema.columns 
			WHERE table_schema = 'public' 
			AND table_name = 'session'
			ORDER BY ordinal_position;
		`);

		console.log("\n📊 Current session table columns:");
		const columns = Array.isArray(allColumns)
			? allColumns
			: (allColumns as any).rows || [];
		columns.forEach((row: any) => {
			const colName =
				typeof row === "string"
					? row
					: row.column_name || row[0] || Object.values(row)[0];
			const dataType =
				typeof row === "string"
					? ""
					: row.data_type || row[1] || Object.values(row)[1];
			console.log(`  - ${colName} (${dataType})`);
		});

		console.log("\n✅ Session table check complete!");
		process.exit(0);
	} catch (error: any) {
		console.error("❌ Error:", error.message || error);
		process.exit(1);
	}
}

fixSessionTable();
