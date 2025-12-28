import 'dotenv/config';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - drizzle-orm/postgres-js is a valid export, this is a TypeScript language server cache issue
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create the postgres client
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false, // Disable prepared statements for Supabase Transaction pool mode
});

// Create the drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for use in other files
export * from './schema';

