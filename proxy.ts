import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getCookieCache } from "better-auth/cookies";
import {
	resolveTenantFromSubdomain,
	getOrganizationBySlug,
	resolveTenantWithMembership,
} from "@/lib/tenant-resolver";

const intlMiddleware = createIntlMiddleware({
	// A list of all locales that are supported
	locales: ["es", "en"],

	// Used when no locale matches
	defaultLocale: "es",
});

export default async function proxy(request: NextRequest) {
	const { pathname, search } = request.nextUrl;
	const hostname = request.headers.get("host") || "";

	// Skip tenant resolution for API routes, static files, and Next.js internals
	if (
		pathname.startsWith("/api/") ||
		pathname.startsWith("/_next/") ||
		pathname.startsWith("/_vercel/") ||
		pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/)
	) {
		return intlMiddleware(request);
	}

	// Get session from cookie cache (works in Edge runtime without database queries)
	// This is safe for proxy as it validates the signed cookie
	let session = null;
	try {
		session = await getCookieCache(request);
	} catch (error) {
		// Session check failed, continue without tenant resolution
		// This is expected for unauthenticated users, so we don't log it
	}

	// Extract tenant from subdomain
	const tenantSlug = resolveTenantFromSubdomain(hostname);

	if (tenantSlug && session?.user?.id) {
		// User is authenticated and subdomain is present
		// Resolve tenant and verify membership
		const tenantInfo = await resolveTenantWithMembership(
			hostname,
			session.user.id,
		);

		if (tenantInfo) {
			// User is a member of the organization
			const currentOrgId = session.organization?.id;

			// If the active organization doesn't match the subdomain, we need to set it
			// However, we can't directly modify the session in proxy
			// BetterAuth handles this via API calls, so we'll add a header
			// and let the client-side handle the organization switch if needed
			if (currentOrgId !== tenantInfo.organizationId) {
				// Add header to indicate organization should be switched
				const response = intlMiddleware(request);
				response.headers.set(
					"x-tenant-organization-id",
					tenantInfo.organizationId,
				);
				response.headers.set("x-tenant-slug", tenantInfo.slug);
				return response;
			}

			// Organization matches, add tenant context to headers
			const response = intlMiddleware(request);
			response.headers.set(
				"x-tenant-organization-id",
				tenantInfo.organizationId,
			);
			response.headers.set("x-tenant-slug", tenantInfo.slug);
			return response;
		} else {
			// Subdomain found but user is not a member or organization doesn't exist
			// Check if organization exists but user is not a member
			const org = await getOrganizationBySlug(tenantSlug);
			const locale = pathname.split("/")[1] || "es";

			if (org) {
				// Organization exists but user is not a member
				const signInUrl = new URL(`/${locale}/signin`, request.url);
				signInUrl.searchParams.set("error", "tenant_access_denied");
				signInUrl.searchParams.set("tenant", tenantSlug);
				return NextResponse.redirect(signInUrl);
			} else {
				// Organization doesn't exist
				const signInUrl = new URL(`/${locale}/signin`, request.url);
				signInUrl.searchParams.set("error", "tenant_not_found");
				signInUrl.searchParams.set("tenant", tenantSlug);
				return NextResponse.redirect(signInUrl);
			}
		}
	} else if (tenantSlug && !session?.user?.id) {
		// Subdomain found but user is not authenticated
		// Check if already on signin page with correct tenant parameter
		const locale = pathname.split("/")[1] || "es";
		const isSignInPage =
			pathname === `/${locale}/signin` || pathname === "/signin";
		const urlTenant = request.nextUrl.searchParams.get("tenant");

		// If already on signin page with correct tenant, don't redirect
		if (isSignInPage && urlTenant === tenantSlug) {
			return intlMiddleware(request);
		}

		// Redirect to sign-in with tenant parameter
		const signInUrl = new URL(`/${locale}/signin`, request.url);
		signInUrl.searchParams.set("tenant", tenantSlug);
		return NextResponse.redirect(signInUrl);
	} else if (!tenantSlug && session?.user?.id) {
		// No subdomain but user is authenticated
		// Extract active organization from session cookie cache and add to headers
		const activeOrgId = session.organization?.id || null;
		if (activeOrgId) {
			const response = intlMiddleware(request);
			response.headers.set("x-tenant-organization-id", activeOrgId);
			return response;
		}
	}

	// Default: just run the intl middleware
	return intlMiddleware(request);
}

export const config = {
	// Match only internationalized pathnames
	matcher: ["/", "/(es|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};

