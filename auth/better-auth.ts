import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@/db";
import { BETTER_AUTH_URL, BETTER_AUTH_SECRET } from "@/lib/env";
import * as schema from "@/db/schema";

// Initialize BetterAuth with drizzle adapter
// BetterAuth's drizzleAdapter requires explicit schema tables to construct queries
// We pass the entire schema object so it can find all tables
export const auth = betterAuth({
	baseURL: BETTER_AUTH_URL,
	basePath: "/api/auth",
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification,
			organization: schema.organization,
			member: schema.member,
			invitation: schema.invitation,
		},
	}),
	emailAndPassword: {
		enabled: true,
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 minutes cache duration
		},
	},
	// Allow subdomain-based tenants to access the auth API
	trustedOrigins: [
		"http://localhost:3000",
		"http://*.localhost:3000", // Allow any subdomain on localhost with HTTP
	],
	advanced: {
		// Disable cross-subdomain cookies for localhost since browsers don't support .localhost domain
		// Cookies will be set for the specific subdomain (e.g., nrgschool.localhost:3000)
		// This means each subdomain has its own session cookies, which is fine for localhost
		// For production with a real domain, you would enable this and set domain: "yourdomain.com"
		crossSubDomainCookies: {
			enabled: false,
		},
	},
	plugins: [
		organization({
			// Organization plugin configuration
			// This enables multi-tenancy support
		}),
	],
});
