/**
 * Centralized environment variable configuration
 * 
 * Note: Next.js automatically loads .env files, so we don't need to import dotenv/config here.
 * This file validates and exports environment variables with proper defaults.
 * 
 * For standalone scripts, import dotenv/config directly in those files.
 */

// Database configuration
export const DATABASE_URL = (() => {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error(
			"DATABASE_URL environment variable is required. Please set it in your .env file.",
		);
	}
	return url;
})();

// BetterAuth configuration
export const BETTER_AUTH_SECRET = (() => {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret) {
		console.warn(
			"⚠️  BETTER_AUTH_SECRET is not set. Using default secret. This is insecure for production!",
		);
		return "change-me-in-production";
	}
	return secret;
})();

export const BETTER_AUTH_URL =
	process.env.BETTER_AUTH_URL || "http://localhost:3000";

export const NEXT_PUBLIC_BETTER_AUTH_URL =
	process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";

/**
 * Validate that all required environment variables are set
 * Call this at application startup to catch missing variables early
 */
export function validateEnv(): void {
	// DATABASE_URL is validated above and will throw if missing
	// BETTER_AUTH_SECRET has a default, so it's optional but warned
	// Other variables can be added here as needed
}

// Run validation on import (for server-side code only)
if (globalThis.window === undefined) {
	validateEnv();
}

