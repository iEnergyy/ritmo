import "dotenv/config";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import "@/lib/env";

async function convertOrgIdToText() {
  try {
    console.log("Converting organization_id columns from UUID to text...\n");
    console.log("⚠️  WARNING: This will modify your database schema!");
    console.log("⚠️  Make sure you have a backup before proceeding!\n");

    const tables = ["students", "venues", "teachers"];

    for (const tableName of tables) {
      console.log(`\nProcessing ${tableName}...`);

      try {
        // Step 1: Add a temporary text column
        await db.execute(sql.raw(`
					ALTER TABLE ${tableName} 
					ADD COLUMN IF NOT EXISTS organization_id_text text;
				`));
        console.log(`  ✅ Added temporary organization_id_text column`);

        // Step 2: Convert UUID to text (cast UUID to text)
        await db.execute(sql.raw(`
					UPDATE ${tableName}
					SET organization_id_text = organization_id::text
					WHERE organization_id IS NOT NULL;
				`));
        console.log(`  ✅ Converted UUID values to text`);

        // Step 3: Drop the old UUID column
        await db.execute(sql.raw(`
					ALTER TABLE ${tableName}
					DROP COLUMN IF EXISTS organization_id;
				`));
        console.log(`  ✅ Dropped old UUID organization_id column`);

        // Step 4: Rename the text column to organization_id
        await db.execute(sql.raw(`
					ALTER TABLE ${tableName}
					RENAME COLUMN organization_id_text TO organization_id;
				`));
        console.log(`  ✅ Renamed organization_id_text to organization_id`);

        // Step 5: Add NOT NULL constraint if needed
        await db.execute(sql.raw(`
					ALTER TABLE ${tableName}
					ALTER COLUMN organization_id SET NOT NULL;
				`));
        console.log(`  ✅ Added NOT NULL constraint`);

        // Step 6: Re-add foreign key constraint
        await db.execute(sql.raw(`
					ALTER TABLE ${tableName}
					ADD CONSTRAINT ${tableName}_organization_id_fk 
					FOREIGN KEY (organization_id) REFERENCES organization(id);
				`));
        console.log(`  ✅ Re-added foreign key constraint`);

        console.log(`  ✅ ${tableName} conversion complete!`);

      } catch (error: any) {
        console.error(`  ❌ Error converting ${tableName}:`, error.message);
        if (error.message.includes("violates foreign key constraint")) {
          console.log(`     ⚠️  Some organization_id values don't match organization.id`);
          console.log(`     You may need to update the values manually`);
        }
      }
    }

    console.log("\n✅ Conversion complete!");
    console.log("\n⚠️  Note: If you had existing UUID values, they've been converted to text.");
    console.log("   Make sure they match your organization.id values!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Safety check - only run if explicitly enabled
const ENABLE_MIGRATION = process.env.ENABLE_DB_MIGRATION === "true";

if (ENABLE_MIGRATION) {
  console.log("\n🚀 Migration enabled via ENABLE_DB_MIGRATION=true");
  convertOrgIdToText();
} else {
  console.log("⚠️  Migration disabled for safety.");
  console.log("   To run this migration, set ENABLE_DB_MIGRATION=true environment variable");
  console.log("   Example: ENABLE_DB_MIGRATION=true pnpm tsx scripts/convert-org-id-to-text.ts");
  console.log("\n   ⚠️  Make sure you have a database backup first!");
}

