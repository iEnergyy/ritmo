import "dotenv/config";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import "@/lib/env";

/**
 * Drops student_id from private_sessions if it still exists (Phase 6 uses
 * private_session_students junction instead). Run if you get:
 *   null value in column "student_id" of relation "private_sessions" violates not-null constraint
 */
async function dropPrivateSessionsStudentId() {
	console.log("Dropping private_sessions.student_id if present...\n");

	const hasColumn = await db.execute(sql`
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'private_sessions' AND column_name = 'student_id';
	`);
	const rows = Array.isArray(hasColumn)
		? hasColumn
		: (hasColumn as { rows?: unknown[] })?.rows ?? [];
	if (rows.length === 0) {
		console.log("✅ Column student_id does not exist. No changes needed.");
		return;
	}

	await db.execute(sql.raw(`ALTER TABLE private_sessions DROP CONSTRAINT IF EXISTS private_sessions_student_id_students_id_fk;`));
	console.log("✅ Dropped FK (if existed)");

	await db.execute(sql.raw(`ALTER TABLE private_sessions DROP COLUMN IF EXISTS student_id;`));
	console.log("✅ Dropped column student_id");

	console.log("\n✅ Done. You can create private sessions again.");
}

dropPrivateSessionsStudentId()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("❌ Error:", err);
		process.exit(1);
	});
