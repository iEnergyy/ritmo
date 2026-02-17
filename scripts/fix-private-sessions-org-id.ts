import "dotenv/config";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import "@/lib/env";

/**
 * Converts private_sessions.organization_id from UUID to text when the column
 * was created as UUID (e.g. before Better Auth text IDs). Fixes:
 *   invalid input syntax for type uuid: "xHdM7Fgy8uKEzVoM02XnWWq6YSPcmNZQ"
 * when listing or creating private sessions.
 */
async function fixPrivateSessionsOrgId() {
	console.log("Fixing private_sessions.organization_id column type...\n");

	const checkType = await db.execute(sql`
		SELECT data_type
		FROM information_schema.columns
		WHERE table_schema = 'public'
		AND table_name = 'private_sessions'
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

		// Drop both possible FK names (drizzle vs manual migrations)
		for (const constraintName of [
			"private_sessions_organization_id_organization_id_fk",
			"private_sessions_organization_id_organizations_id_fk",
		]) {
			try {
				await db.execute(
					sql.raw(
						`ALTER TABLE private_sessions DROP CONSTRAINT IF EXISTS "${constraintName}";`,
					),
				);
				console.log(`✅ Dropped constraint (if existed): ${constraintName}`);
			} catch (err: unknown) {
				console.log(
					`⚠️  Could not drop ${constraintName}:`,
					err instanceof Error ? err.message : err,
				);
			}
		}

		await db.execute(sql`
			ALTER TABLE private_sessions
			ALTER COLUMN organization_id TYPE text USING organization_id::text;
		`);
		console.log("✅ Changed column type to text");

		await db.execute(sql`
			ALTER TABLE private_sessions
			ADD CONSTRAINT private_sessions_organization_id_organization_id_fk
			FOREIGN KEY (organization_id)
			REFERENCES organization(id)
			ON DELETE NO ACTION
			ON UPDATE NO ACTION;
		`);
		console.log("✅ Re-added foreign key constraint");

		console.log(
			"\n✅ Successfully converted private_sessions.organization_id from UUID to text!",
		);
	} else {
		console.log(
			`⚠️  Unexpected column type: ${currentType}. Expected 'uuid' or 'text'. Table may not exist yet—run migrations first: pnpm db:migrate`,
		);
	}
}

fixPrivateSessionsOrgId()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("❌ Error:", err);
		process.exit(1);
	});
