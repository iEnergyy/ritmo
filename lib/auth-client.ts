"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
	baseURL:
		process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
		(typeof window !== "undefined"
			? window.location.origin
			: "http://localhost:3000"),
	basePath: "/api/auth",
	plugins: [organizationClient()],
});

// Note: NEXT_PUBLIC_BETTER_AUTH_URL is accessed directly here because
// it's a client-side file and needs to use process.env for Next.js to
// properly inject the public env variable at build time

// Export commonly used methods for convenience
export const { signIn, signUp, signOut, useSession } = authClient;
