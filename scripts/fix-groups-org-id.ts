import "dotenv/config";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import "@/lib/env";

async function fixGroupsOrgId() {
	try {
		console.log("Fixing groups.organization_id column type...\n");

		// Check current column type
		const checkType = await db.execute(sql`
			SELECT data_type 
			FROM information_schema.columns 
			WHERE table_schema = 'public' 
			AND table_name = 'groups'
			AND column_name = 'organization_id';
		`);

		const result = Array.isArray(checkType)
			? checkType[0]
			: (checkType as any).rows?.[0] || checkType;

		const currentType = result?.data_type || result?.[0];

		console.log(`Current organization_id type: ${currentType}`);

		if (currentType === "text") {
			console.log("✅ Column is already text type. No changes needed.");
			return;
		}

		if (currentType === "uuid") {
			console.log("Converting organization_id from UUID to text...");

			// Step 1: Drop foreign key constraint if it exists
			try {
				await db.execute(sql`
					ALTER TABLE groups 
					DROP CONSTRAINT IF EXISTS groups_organization_id_organization_id_fk;
				`);
				console.log("✅ Dropped foreign key constraint");
			} catch (error: any) {
				console.log(
					"⚠️  Could not drop constraint (may not exist):",
					error.message,
				);
			}

			// Step 2: Add a temporary text column
			await db.execute(sql`
				ALTER TABLE groups 
				ADD COLUMN IF NOT EXISTS organization_id_temp text;
			`);
			console.log("✅ Added temporary column");

			// Step 3: Convert UUID to text and populate temp column
			await db.execute(sql`
				UPDATE groups 
				SET organization_id_temp = organization_id::text;
			`);
			console.log("✅ Populated temporary column");

			// Step 4: Drop old UUID column
			await db.execute(sql`
				ALTER TABLE groups 
				DROP COLUMN organization_id;
			`);
			console.log("✅ Dropped old UUID column");

			// Step 5: Rename temp column to organization_id
			await db.execute(sql`
				ALTER TABLE groups 
				RENAME COLUMN organization_id_temp TO organization_id;
			`);
			console.log("✅ Renamed temporary column");

			// Step 6: Set NOT NULL constraint
			await db.execute(sql`
				ALTER TABLE groups 
				ALTER COLUMN organization_id SET NOT NULL;
			`);
			console.log("✅ Set NOT NULL constraint");

			// Step 7: Re-add foreign key constraint
			await db.execute(sql`
				ALTER TABLE groups 
				ADD CONSTRAINT groups_organization_id_organization_id_fk 
				FOREIGN KEY (organization_id) 
				REFERENCES organization(id) 
				ON DELETE NO ACTION 
				ON UPDATE NO ACTION;
			`);
			console.log("✅ Re-added foreign key constraint");

			console.log(
				"\n✅ Successfully converted groups.organization_id from UUID to text!",
			);
		} else {
			console.log(
				`⚠️  Unexpected column type: ${currentType}. Expected 'uuid' or 'text'.`,
			);
		}
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

fixGroupsOrgId();
