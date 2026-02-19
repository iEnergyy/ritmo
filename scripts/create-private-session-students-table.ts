import "dotenv/config";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import "@/lib/env";

/**
 * Creates private_session_students table if missing (Phase 6 junction table).
 * Run if you get: relation "private_session_students" does not exist
 */
async function createPrivateSessionStudentsTable() {
	console.log("Creating private_session_students table if missing...\n");

	await db.execute(
		sql.raw(`
		CREATE TABLE IF NOT EXISTS "private_session_students" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"private_session_id" uuid NOT NULL REFERENCES "private_sessions"("id") ON DELETE CASCADE,
			"student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE
		);
	`),
	);
	console.log("✅ Table created or already exists");

	await db.execute(
		sql.raw(`
		CREATE UNIQUE INDEX IF NOT EXISTS "private_session_students_session_student_uidx"
		ON "private_session_students" ("private_session_id", "student_id");
	`),
	);
	await db.execute(
		sql.raw(`
		CREATE INDEX IF NOT EXISTS "private_session_students_session_idx"
		ON "private_session_students" ("private_session_id");
	`),
	);
	await db.execute(
		sql.raw(`
		CREATE INDEX IF NOT EXISTS "private_session_students_student_idx"
		ON "private_session_students" ("student_id");
	`),
	);
	console.log("✅ Indexes created or already exist");

	console.log("\n✅ Done. You can add private sessions with students again.");
}

createPrivateSessionStudentsTable()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("❌ Error:", err);
		process.exit(1);
	});
