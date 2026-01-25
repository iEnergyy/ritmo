import "dotenv/config";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import "@/lib/env";

/**
 * Converts class_sessions.organization_id from UUID to text when the column
 * was created as UUID (e.g. before Better Auth text IDs). Fixes:
 *   invalid input syntax for type uuid: "xHdM7Fgy8uKEzVoM02XnWWq6YSPcmNZQ"
 */
async function fixClassSessionsOrgId() {
	console.log("Fixing class_sessions.organization_id column type...\n");

	const checkType = await db.execute(sql`
		SELECT data_type
		FROM information_schema.columns
		WHERE table_schema = 'public'
		AND table_name = 'class_sessions'
		AND column_name = 'organization_id';
	`);

	const result = Array.isArray(checkType)
		? checkType[0]
		: (checkType as { rows?: { data_type: string }[] }).rows?.[0] || checkType;
	const currentType =
		typeof result === "object" && result !== null && "data_type" in result
			? (result as { data_type: string }).data_type
			: null;

	console.log(`Current organization_id type: ${currentType ?? "unknown"}`);

	if (currentType === "text") {
		console.log("✅ Column is already text. No changes needed.");
		return;
	}

	if (currentType === "uuid") {
		console.log("Converting organization_id from UUID to text...");

		try {
			await db.execute(sql`
				ALTER TABLE class_sessions
				DROP CONSTRAINT IF EXISTS class_sessions_organization_id_organization_id_fk;
			`);
			console.log("✅ Dropped foreign key constraint");
		} catch (err: unknown) {
			console.log(
				"⚠️  Could not drop constraint (may not exist):",
				err instanceof Error ? err.message : err,
			);
		}

		await db.execute(sql`
			ALTER TABLE class_sessions
			ADD COLUMN IF NOT EXISTS organization_id_temp text;
		`);
		console.log("✅ Added temporary column");

		await db.execute(sql`
			UPDATE class_sessions
			SET organization_id_temp = organization_id::text
			WHERE organization_id IS NOT NULL;
		`);
		console.log("✅ Populated temporary column");

		await db.execute(sql`
			ALTER TABLE class_sessions
			DROP COLUMN organization_id;
		`);
		console.log("✅ Dropped old UUID column");

		await db.execute(sql`
			ALTER TABLE class_sessions
			RENAME COLUMN organization_id_temp TO organization_id;
		`);
		console.log("✅ Renamed temporary column");

		await db.execute(sql`
			ALTER TABLE class_sessions
			ALTER COLUMN organization_id SET NOT NULL;
		`);
		console.log("✅ Set NOT NULL constraint");

		await db.execute(sql`
			ALTER TABLE class_sessions
			ADD CONSTRAINT class_sessions_organization_id_organization_id_fk
			FOREIGN KEY (organization_id)
			REFERENCES organization(id)
			ON DELETE NO ACTION
			ON UPDATE NO ACTION;
		`);
		console.log("✅ Re-added foreign key constraint");

		console.log(
			"\n✅ Successfully converted class_sessions.organization_id from UUID to text!",
		);
	} else {
		console.log(
			`⚠️  Unexpected column type: ${currentType}. Expected 'uuid' or 'text'.`,
		);
	}
}

fixClassSessionsOrgId()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("❌ Error:", err);
		process.exit(1);
	});
