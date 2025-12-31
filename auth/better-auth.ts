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
		// Enable cross-subdomain cookies to share session across subdomains
		// Note: Browsers don't support .localhost domain for cookies due to security restrictions
		// This means cookies set on localhost:3000 won't be accessible on nrgschool.localhost:3000
		// The client-side auth will need to handle re-authentication when navigating to subdomains
		crossSubDomainCookies: {
			enabled: true,
			// Don't set domain for localhost - let BetterAuth handle it
			// For production, you would set domain: "yourdomain.com"
		},
	},
	plugins: [
		organization({
			// Organization plugin configuration
			// This enables multi-tenancy support
		}),
	],
});
