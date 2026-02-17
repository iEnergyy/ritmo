-- Private session students: support 1-to-many students per private session
CREATE TABLE IF NOT EXISTS "private_session_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"private_session_id" uuid NOT NULL REFERENCES "private_sessions"("id") ON DELETE CASCADE,
	"student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "private_session_students_session_student_uidx" ON "private_session_students" USING btree ("private_session_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "private_session_students_session_idx" ON "private_session_students" USING btree ("private_session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "private_session_students_student_idx" ON "private_session_students" USING btree ("student_id");--> statement-breakpoint
-- Backfill: copy existing student_id from private_sessions into junction table
INSERT INTO "private_session_students" ("private_session_id", "student_id")
SELECT "id", "student_id" FROM "private_sessions" WHERE "student_id" IS NOT NULL;--> statement-breakpoint
-- Drop FK then column
ALTER TABLE "private_sessions" DROP CONSTRAINT IF EXISTS "private_sessions_student_id_students_id_fk";--> statement-breakpoint
ALTER TABLE "private_sessions" DROP COLUMN IF EXISTS "student_id";
