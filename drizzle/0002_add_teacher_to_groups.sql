-- Add teacher_id column as nullable first to allow migration of existing groups
ALTER TABLE "groups" ADD COLUMN "teacher_id" uuid REFERENCES "teachers"("id");

-- For existing groups without a teacher, assign the first teacher from the same organization
-- This is a temporary solution - you should review and update groups manually if needed
UPDATE "groups" 
SET "teacher_id" = (
	SELECT t.id 
	FROM "teachers" t 
	WHERE t.organization_id = "groups".organization_id 
	LIMIT 1
)
WHERE "teacher_id" IS NULL;

-- Now make it NOT NULL since all groups should have a teacher
ALTER TABLE "groups" ALTER COLUMN "teacher_id" SET NOT NULL;
