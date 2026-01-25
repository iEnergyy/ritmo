/**
 * One-time baseline for __drizzle_migrations when the database was created
 * before using drizzle-kit migrate. Inserts records for 0000, 0001, 0002
 * so that "pnpm db:migrate" only runs 0003 and newer.
 *
 * Uses drizzle-orm and the project db. Run with: pnpm db:baseline
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import "@/lib/env";

const DRIZZLE_DIR = join(process.cwd(), "drizzle");
const JOURNAL_PATH = join(DRIZZLE_DIR, "meta", "_journal.json");

async function baseline() {
	const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf-8")) as {
		entries: Array<{ tag: string; when: number }>;
	};
	// Only baseline the first three (0000, 0001, 0002)
	const toBaseline = journal.entries.slice(0, 3);
	if (toBaseline.length === 0) {
		console.log("No migrations to baseline.");
		return;
	}

	// Ensure drizzle schema and migrations table exist (same as dialect.migrate)
	await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
			id SERIAL PRIMARY KEY,
			hash text NOT NULL,
			created_at bigint
		)
	`);

	for (const entry of toBaseline) {
		const path = join(DRIZZLE_DIR, `${entry.tag}.sql`);
		const content = readFileSync(path, "utf-8");
		const hash = createHash("sha256").update(content).digest("hex");
		const existing = await db.execute(sql`
			SELECT 1 FROM "drizzle"."__drizzle_migrations"
			WHERE "created_at" = ${entry.when}
			LIMIT 1
		`);
		const rows = Array.isArray(existing) ? existing : (existing as { rows?: unknown[] }).rows ?? [];
		if (rows.length > 0) {
			console.log(`Already applied: ${entry.tag}, skipping.`);
			continue;
		}
		await db.execute(sql`
			INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
			VALUES (${hash}, ${entry.when})
		`);
		console.log(`Baseline recorded: ${entry.tag} (${entry.when})`);
	}
}

baseline()
	.then(() => {
		console.log("Baseline done. Run pnpm db:migrate to apply pending migrations.");
		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
