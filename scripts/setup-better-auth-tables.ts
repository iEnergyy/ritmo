import 'dotenv/config';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function setupBetterAuthTables() {
  try {
    console.log('Setting up Better Auth tables...\n');

    // Create Better Auth core tables if they don't exist
    const queries = [
      // User table
      sql`CREATE TABLE IF NOT EXISTS "user" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL,
        "email_verified" boolean DEFAULT false NOT NULL,
        "image" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "user_email_unique" UNIQUE("email")
      )`,
      
      // Session table
      sql`CREATE TABLE IF NOT EXISTS "session" (
        "id" text PRIMARY KEY NOT NULL,
        "expires_at" timestamp NOT NULL,
        "token" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "ip_address" text,
        "user_agent" text,
        "user_id" text NOT NULL,
        "active_organization_id" text,
        CONSTRAINT "session_token_unique" UNIQUE("token"),
        CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
      )`,
      
      // Account table
      sql`CREATE TABLE IF NOT EXISTS "account" (
        "id" text PRIMARY KEY NOT NULL,
        "account_id" text NOT NULL,
        "provider_id" text NOT NULL,
        "user_id" text NOT NULL,
        "access_token" text,
        "refresh_token" text,
        "id_token" text,
        "access_token_expires_at" timestamp,
        "refresh_token_expires_at" timestamp,
        "scope" text,
        "password" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
      )`,
      
      // Verification table
      sql`CREATE TABLE IF NOT EXISTS "verification" (
        "id" text PRIMARY KEY NOT NULL,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )`,
      
      // Organization table
      sql`CREATE TABLE IF NOT EXISTS "organization" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "slug" text NOT NULL,
        "logo" text,
        "created_at" timestamp NOT NULL,
        "metadata" text,
        CONSTRAINT "organization_slug_unique" UNIQUE("slug")
      )`,
      
      // Member table
      sql`CREATE TABLE IF NOT EXISTS "member" (
        "id" text PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL,
        "user_id" text NOT NULL,
        "role" text DEFAULT 'member' NOT NULL,
        "created_at" timestamp NOT NULL,
        CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
        CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
      )`,
      
      // Invitation table
      sql`CREATE TABLE IF NOT EXISTS "invitation" (
        "id" text PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL,
        "email" text NOT NULL,
        "role" text,
        "status" text DEFAULT 'pending' NOT NULL,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "inviter_id" text NOT NULL,
        CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
        CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "user"("id") ON DELETE cascade
      )`,
    ];

    // Create indexes
    const indexes = [
      sql`CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("user_id")`,
      sql`CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("user_id")`,
      sql`CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier")`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "organization_slug_uidx" ON "organization" ("slug")`,
      sql`CREATE INDEX IF NOT EXISTS "member_organizationId_idx" ON "member" ("organization_id")`,
      sql`CREATE INDEX IF NOT EXISTS "member_userId_idx" ON "member" ("user_id")`,
      sql`CREATE INDEX IF NOT EXISTS "invitation_organizationId_idx" ON "invitation" ("organization_id")`,
      sql`CREATE INDEX IF NOT EXISTS "invitation_email_idx" ON "invitation" ("email")`,
    ];

    console.log('Creating tables...');
    for (const query of queries) {
      await db.execute(query);
    }
    
    console.log('Creating indexes...');
    for (const index of indexes) {
      await db.execute(index);
    }

    // Create organization_metadata table if it doesn't exist
    const orgMetadataQuery = sql`
      CREATE TABLE IF NOT EXISTS "organization_metadata" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" text NOT NULL,
        "type" "organization_type" NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "organization_metadata_organization_id_unique" UNIQUE("organization_id"),
        CONSTRAINT "organization_metadata_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade
      )
    `;
    
    await db.execute(orgMetadataQuery);
    
    console.log('\n✅ Better Auth tables created successfully!');
    process.exit(0);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('\n✅ Tables already exist (some may have been created)');
      process.exit(0);
    } else {
      console.error('❌ Error:', error.message || error);
      process.exit(1);
    }
  }
}

setupBetterAuthTables();

