import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getCookieCache, getSessionCookie } from "better-auth/cookies";
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
	// Note: Cookie cache (session_data) expires after 5 minutes (maxAge), but the session_token
	// cookie itself remains valid. When cache expires, getCookieCache will fail, but we can
	// check if session_token exists as a fallback to know the user might still be authenticated.
	let session = null;
	let hasSessionToken = false;

	// Always check for session_token cookie as a fallback
	try {
		const sessionToken = getSessionCookie(request);
		hasSessionToken = !!sessionToken;
	} catch {
		// No session token found
		hasSessionToken = false;
	}

	try {
		session = await getCookieCache(request);
	} catch (error) {
		// Cookie cache failed - this could mean:
		// 1. Cookie cache expired (but session_token might still be valid) - we already checked above
		// 2. User is not authenticated
		// 3. Cookie is invalid/expired
		// hasSessionToken is already set above
	}

	// Extract tenant from subdomain
	const tenantSlug = resolveTenantFromSubdomain(hostname);

	if (tenantSlug && (session?.user?.id || hasSessionToken)) {
		// User is authenticated and subdomain is present
		// Check both session from cache and session_token as fallback
		const locale = pathname.split("/")[1] || "es";
		const isRootPage = pathname === `/${locale}` || pathname === "/";
		const isSignInPage =
			pathname === `/${locale}/signin` || pathname === "/signin";
		const isSignUpPage =
			pathname === `/${locale}/signup` || pathname === "/signup";

		// If authenticated user tries to access root, sign-in, or sign-up, redirect to dashboard
		if (isRootPage || isSignInPage || isSignUpPage) {
			const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
			return NextResponse.redirect(dashboardUrl);
		}

		// If we only have session_token but no session cache, we can't verify membership yet
		// Allow through and let client-side handle it
		if (!session?.user?.id && hasSessionToken) {
			const response = intlMiddleware(request);
			response.headers.set("x-tenant-slug", tenantSlug);
			response.headers.set("x-session-token-present", "true");
			return response;
		}

		// Resolve tenant and verify membership
		// At this point, we know session?.user?.id exists (from the condition check)
		if (!session?.user?.id) {
			// This shouldn't happen, but TypeScript needs this check
			const response = intlMiddleware(request);
			response.headers.set("x-tenant-slug", tenantSlug);
			return response;
		}

		const tenantInfo = await resolveTenantWithMembership(
			hostname,
			session.user.id,
		);

		if (tenantInfo) {
			// User is a member of the organization
			const currentOrgId = session.session?.activeOrganizationId;

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
		// Subdomain found but no session detected from cookie cache
		// If hasSessionToken is true, the cache expired but session_token is still valid
		// Allow the request through - intlMiddleware will handle locale routing
		// Client-side will check session via API (which validates session_token) and refresh cache
		const locale = pathname.split("/")[1] || "es";

		// If session_token exists but cache expired, allow through - session is still valid
		// The API will validate the token and refresh the cache automatically
		if (hasSessionToken) {
			// If user has session token but is trying to access root, sign-in, or sign-up, redirect to dashboard
			const isRootPage = pathname === `/${locale}` || pathname === "/";
			const isSignInPage =
				pathname === `/${locale}/signin` || pathname === "/signin";
			const isSignUpPage =
				pathname === `/${locale}/signup` || pathname === "/signup";

			if (isRootPage || isSignInPage || isSignUpPage) {
				const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
				return NextResponse.redirect(dashboardUrl);
			}

			const response = intlMiddleware(request);
			response.headers.set("x-tenant-slug", tenantSlug);
			response.headers.set("x-session-token-present", "true");
			return response;
		}

		// Allow public access to registration routes
		const isRegisterPage = pathname === `/${locale}/register` || pathname === "/register";
		const isRegisterSuccessPage = pathname === `/${locale}/register/success` || pathname === "/register/success";

		if (isRegisterPage || isRegisterSuccessPage) {
			// Verify organization exists for registration routes
			const org = await getOrganizationBySlug(tenantSlug);
			if (!org && isRegisterPage) {
				// Organization doesn't exist, but let the page handle the error
				// This allows the registration page to show a proper error message
			}
			// Allow access to registration routes
			return intlMiddleware(request);
		}

		// Check if already on signin page with correct tenant parameter
		const isSignInPage =
			pathname === `/${locale}/signin` || pathname === "/signin";
		const urlTenant = request.nextUrl.searchParams.get("tenant");

		// If already on signin page with correct tenant, don't redirect
		if (isSignInPage && urlTenant === tenantSlug) {
			return intlMiddleware(request);
		}

		// For other routes, allow through - intlMiddleware will handle locale routing
		// Client-side components will check session and handle authentication
		const response = intlMiddleware(request);
		response.headers.set("x-tenant-slug", tenantSlug);
		return response;
	} else if (!tenantSlug && session?.user?.id) {
		// No subdomain but user is authenticated
		// Extract active organization from session cookie cache and add to headers
		const locale = pathname.split("/")[1] || "es";
		const isRootPage = pathname === `/${locale}` || pathname === "/";
		const isSignInPage =
			pathname === `/${locale}/signin` || pathname === "/signin";
		const isSignUpPage =
			pathname === `/${locale}/signup` || pathname === "/signup";

		// If authenticated user tries to access root, sign-in, or sign-up, redirect to dashboard
		if (isRootPage || isSignInPage || isSignUpPage) {
			const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
			return NextResponse.redirect(dashboardUrl);
		}

		const activeOrgId = session.session?.activeOrganizationId || null;
		if (activeOrgId) {
			const response = intlMiddleware(request);
			response.headers.set("x-tenant-organization-id", activeOrgId);
			return response;
		}
	} else if (!tenantSlug && !session?.user?.id && hasSessionToken) {
		// No subdomain, no cache, but session_token exists
		// User is authenticated but cache expired
		// If trying to access root, sign-in, or sign-up, redirect to dashboard
		const locale = pathname.split("/")[1] || "es";
		const isRootPage = pathname === `/${locale}` || pathname === "/";
		const isSignInPage =
			pathname === `/${locale}/signin` || pathname === "/signin";
		const isSignUpPage =
			pathname === `/${locale}/signup` || pathname === "/signup";

		if (isRootPage || isSignInPage || isSignUpPage) {
			const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
			return NextResponse.redirect(dashboardUrl);
		}
	}

	// Default: just run the intl middleware
	return intlMiddleware(request);
}

export const config = {
	// Match only internationalized pathnames
	matcher: ["/", "/(es|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};

