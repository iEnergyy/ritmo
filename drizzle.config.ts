import { defineConfig } from "drizzle-kit";
import { DATABASE_URL } from "./lib/env";

export default defineConfig({
	out: "./drizzle",
	schema: "./db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: DATABASE_URL,
	},
	migrations: {
		table: "__drizzle_migrations",
		schema: "drizzle",
	},
});
