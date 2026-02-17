-- Ensure private_sessions.organization_id is TEXT (Better Auth org IDs are text, not UUID).
-- Safe if column is already text (::text is no-op). Fixes "invalid input syntax for type uuid" when column was created as UUID.
ALTER TABLE "private_sessions" DROP CONSTRAINT IF EXISTS "private_sessions_organization_id_organization_id_fk";--> statement-breakpoint
ALTER TABLE "private_sessions" ALTER COLUMN "organization_id" TYPE text USING "organization_id"::text;--> statement-breakpoint
ALTER TABLE "private_sessions" ADD CONSTRAINT "private_sessions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
