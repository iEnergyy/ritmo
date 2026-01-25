-- Group time schedules: one-time or recurring (weekly/twice-weekly), duration per session, effective range for "apply to future only"
DO $$ BEGIN
	CREATE TYPE "schedule_recurrence" AS ENUM('one_time', 'weekly', 'twice_weekly');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
	"organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
	"recurrence" "schedule_recurrence" NOT NULL,
	"duration_hours" numeric(4, 2) NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_schedules_groupId_idx" ON "group_schedules" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_schedules_organizationId_idx" ON "group_schedules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_schedules_effectiveFrom_idx" ON "group_schedules" USING btree ("effective_from");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_schedule_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_schedule_id" uuid NOT NULL REFERENCES "group_schedules"("id") ON DELETE CASCADE,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
