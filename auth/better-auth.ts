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
	// Use a function to dynamically validate origins for subdomain support
	trustedOrigins: async (request) => {
		const origins: string[] = [
			"http://localhost:3000",
			"https://kdence.xyz", // Production root domain
		];

		// Get the origin from the request if available
		if (request) {
			const origin = request.headers.get("origin");
			if (origin) {
				try {
					const url = new URL(origin);
					const hostname = url.hostname;

					// Allow localhost subdomains
					if (hostname.endsWith(".localhost")) {
						origins.push(origin);
					}

					// Allow kdence.xyz subdomains
					if (hostname.endsWith(".kdence.xyz") || hostname === "kdence.xyz") {
						origins.push(origin);
					}
				} catch {
					// Invalid origin, skip
				}
			}
		}

		return origins;
	},
	advanced: {
		// Enable cross-subdomain cookies for production domain
		// This allows cookies to be shared across subdomains (e.g., nrgschool.kdence.xyz and kdence.xyz)
		// For localhost, we disable this since browsers don't support .localhost domain
		crossSubDomainCookies: {
			enabled: process.env.NODE_ENV === "production",
			domain: process.env.NODE_ENV === "production" ? "kdence.xyz" : undefined,
		},
	},
	plugins: [
		organization({
			// Organization plugin configuration
			// This enables multi-tenancy support
		}),
	],
});
