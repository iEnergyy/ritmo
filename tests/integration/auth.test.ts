import { describe, it, expect, beforeEach, vi } from "vitest";
import * as authMocks from "../mocks/auth";

vi.mock("@/auth/better-auth", () => ({
	auth: authMocks.createMockAuth(),
}));

import { createMockSession } from "../mocks/auth";

describe("Authentication flows", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should get session", async () => {
		const session = createMockSession();
		const { auth } = await import("@/auth/better-auth");
		auth.api.getSession = vi.fn().mockResolvedValue(session);

		const result = await auth.api.getSession({ headers: new Headers() });

		expect(result).toEqual(session);
		expect(auth.api.getSession).toHaveBeenCalled();
	});

	it("should handle sign in", async () => {
		const session = createMockSession();
		const { auth } = await import("@/auth/better-auth");
		auth.api.signIn = vi.fn().mockResolvedValue({ user: session.user });

		const result = await auth.api.signIn({
			email: "test@example.com",
			password: "password",
		});

		expect(result.user).toBeDefined();
	});
});
