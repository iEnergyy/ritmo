import "dotenv/config";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import "@/lib/env";

async function migrateDatabaseSchema() {
	try {
		console.log("Starting database schema migration...\n");

		// Step 1: Fix organization_id types from UUID to text
		console.log("Step 1: Converting organization_id columns from UUID to text...");
		
		// Check if we need to convert
		const checkTypes = await db.execute(sql`
			SELECT table_name, data_type 
			FROM information_schema.columns 
			WHERE table_schema = 'public' 
			AND column_name = 'organization_id'
			AND table_name IN ('students', 'venues', 'teachers')
			AND data_type = 'uuid';
		`);

		const uuidTables = Array.isArray(checkTypes) ? checkTypes : (checkTypes as any).rows || [];
		
		if (uuidTables.length > 0) {
			console.log(`Found ${uuidTables.length} tables with UUID organization_id that need conversion`);
			
			for (const row of uuidTables) {
				const tableName = row.table_name || row[0];
				console.log(`\nConverting ${tableName}.organization_id from UUID to text...`);
				
				// This is a complex migration - we need to:
				// 1. Add a new text column
				// 2. Convert UUID to text (but organization.id is text, so this won't work)
				// Actually, if organization.id is text, we can't convert UUIDs to it
				// This suggests the data might be inconsistent
				
				console.log(`⚠️  ${tableName}: Cannot automatically convert UUID to text without data mapping`);
				console.log(`   You may need to manually update the organization_id values`);
			}
		} else {
			console.log("✅ All organization_id columns are already text type");
		}

		// Step 2: Fix organization_members table structure
		console.log("\nStep 2: Fixing organization_members table structure...");
		
		const checkOrgMembers = await db.execute(sql`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_schema = 'public' 
			AND table_name = 'organization_members';
		`);

		const columns = Array.isArray(checkOrgMembers) ? checkOrgMembers : (checkOrgMembers as any).rows || [];
		const columnNames = columns.map((row: any) => row.column_name || row[0]);

		if (columnNames.includes("organization_id") && columnNames.includes("user_id") && !columnNames.includes("member_id")) {
			console.log("⚠️  organization_members needs restructuring");
			console.log("   Current: organization_id, user_id");
			console.log("   Needed: member_id (references member.id)");
			console.log("\n   This requires:");
			console.log("   1. Finding or creating member records for each organization_members entry");
			console.log("   2. Adding member_id column");
			console.log("   3. Populating member_id from member table");
			console.log("   4. Dropping organization_id and user_id columns");
			console.log("\n   ⚠️  This is a complex migration. Proceeding with caution...\n");

			// Check if we have member records that match
			const existingMembers = await db.execute(sql`
				SELECT COUNT(*) as count FROM member;
			`);
			const memberCount = Array.isArray(existingMembers) 
				? (existingMembers[0] as any)?.count || 0
				: ((existingMembers as any).rows?.[0] as any)?.count || 0;
			
			console.log(`Found ${memberCount} member records`);

			// Try to create member_id column and populate it
			try {
				// Add member_id column
				await db.execute(sql`
					ALTER TABLE organization_members 
					ADD COLUMN IF NOT EXISTS member_id text;
				`);
				console.log("✅ Added member_id column");

				// Try to populate member_id from existing member records
				// Note: organization_id might be UUID in organization_members but text in member
				// So we need to cast it
				try {
					await db.execute(sql`
						UPDATE organization_members om
						SET member_id = m.id
						FROM member m
						WHERE (m.organization_id::text = om.organization_id::text OR m.organization_id = om.organization_id::text)
						AND (m.user_id::text = om.user_id::text OR m.user_id = om.user_id::text)
						AND om.member_id IS NULL;
					`);
					console.log("✅ Populated member_id from existing member records");
				} catch (updateError: any) {
					// If the above fails, try a simpler approach
					console.log("⚠️  First update attempt failed, trying alternative approach...");
					await db.execute(sql`
						UPDATE organization_members om
						SET member_id = m.id
						FROM member m
						WHERE CAST(m.organization_id AS text) = CAST(om.organization_id AS text)
						AND CAST(m.user_id AS text) = CAST(om.user_id AS text)
						AND om.member_id IS NULL;
					`);
					console.log("✅ Populated member_id using CAST");
				}

				// Check how many were updated
				const nullCount = await db.execute(sql`
					SELECT COUNT(*) as count 
					FROM organization_members 
					WHERE member_id IS NULL;
				`);
				const nulls = Array.isArray(nullCount) 
					? (nullCount[0] as any)?.count || 0
					: ((nullCount as any).rows?.[0] as any)?.count || 0;

				if (nulls > 0) {
					console.log(`⚠️  ${nulls} organization_members entries don't have matching member records`);
					console.log("   You may need to create member records for these");
				}

				// Add foreign key constraint
				await db.execute(sql`
					ALTER TABLE organization_members
					ADD CONSTRAINT organization_members_member_id_fk 
					FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE;
				`);
				console.log("✅ Added foreign key constraint");

				// Make member_id unique
				await db.execute(sql`
					ALTER TABLE organization_members
					ADD CONSTRAINT organization_members_member_id_unique UNIQUE (member_id);
				`);
				console.log("✅ Added unique constraint on member_id");

				// Drop old columns (only if member_id is populated)
				if (nulls === 0) {
					await db.execute(sql`
						ALTER TABLE organization_members
						DROP COLUMN IF EXISTS organization_id,
						DROP COLUMN IF EXISTS user_id;
					`);
					console.log("✅ Dropped old organization_id and user_id columns");
				} else {
					console.log("⚠️  Not dropping old columns yet - some entries need member records");
				}

			} catch (error: any) {
				console.error("❌ Error during migration:", error.message);
				if (error.message.includes("violates foreign key constraint")) {
					console.log("   Some organization_members entries don't have matching member records");
					console.log("   You need to create member records first");
				}
			}
		} else if (columnNames.includes("member_id")) {
			console.log("✅ organization_members already has member_id column");
		}

		console.log("\n✅ Migration check complete!");
		console.log("\n⚠️  Note: organization_id type conversion (UUID -> text) requires manual data mapping");
		console.log("   You may need to update organization_id values in students, venues, and teachers tables");

		process.exit(0);
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

migrateDatabaseSchema();

