import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignInPage from "@/app/[locale]/signin/page";

// Mock auth client
vi.mock("@/lib/auth-client", () => ({
	authClient: {
		signIn: {
			email: vi.fn(),
		},
		organization: {
			list: vi.fn(),
			setActive: vi.fn(),
		},
	},
}));

// Mock next-intl
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => "es",
}));

// Mock navigation
vi.mock("@/i18n/navigation", () => ({
	Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

// Mock window.location
const mockLocation = {
	href: "",
	hostname: "localhost",
	origin: "http://localhost:3000",
};

Object.defineProperty(window, "location", {
	writable: true,
	value: mockLocation,
});

Object.defineProperty(globalThis, "location", {
	writable: true,
	value: mockLocation,
});

describe("SignInPage - Subdomain Handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockLocation.href = "";
		mockLocation.hostname = "localhost";
		mockLocation.origin = "http://localhost:3000";
	});

	it("uses responsive padding on the form container for mobile-first layout", () => {
		render(<SignInPage />);
		const formContainer = document.querySelector(".max-w-md.bg-white");
		expect(formContainer).toBeInTheDocument();
		expect(formContainer?.className).toMatch(/\bp-4\b/);
		expect(formContainer?.className).toMatch(/\bsm:p-6\b/);
		expect(formContainer?.className).toMatch(/\blg:p-8\b/);
	});

	it("should set active organization based on subdomain after login", async () => {
		const user = userEvent.setup();
		const { authClient } = await import("@/lib/auth-client");
		const org = {
			id: "org-123",
			slug: "nrgschool",
			name: "NRG School",
		};

		// Set subdomain
		mockLocation.hostname = "nrgschool.localhost";
		mockLocation.origin = "http://nrgschool.localhost:3000";

		vi.mocked(authClient.signIn.email).mockResolvedValue({
			data: {
				user: {
					id: "user-123",
					email: "test@example.com",
					name: "Test User",
				},
			},
			error: null,
		});

		vi.mocked(authClient.organization.list).mockResolvedValue({
			data: [org],
			error: null,
		});

		vi.mocked(authClient.organization.setActive).mockResolvedValue({
			data: undefined,
			error: null,
		});

		render(<SignInPage />);

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole("button", { name: /signin/i });

		await user.type(emailInput, "test@example.com");
		await user.type(passwordInput, "password123");
		await user.click(submitButton);

		await waitFor(() => {
			expect(authClient.signIn.email).toHaveBeenCalledWith({
				email: "test@example.com",
				password: "password123",
			});
		});

		await waitFor(() => {
			expect(authClient.organization.list).toHaveBeenCalled();
		});

		await waitFor(() => {
			expect(authClient.organization.setActive).toHaveBeenCalledWith({
				organizationId: org.id,
			});
		});
	});

	it("should not set organization if no subdomain", async () => {
		const user = userEvent.setup();
		const { authClient } = await import("@/lib/auth-client");

		// No subdomain
		mockLocation.hostname = "localhost";
		mockLocation.origin = "http://localhost:3000";

		vi.mocked(authClient.signIn.email).mockResolvedValue({
			data: {
				user: {
					id: "user-123",
					email: "test@example.com",
					name: "Test User",
				},
			},
			error: null,
		});

		render(<SignInPage />);

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole("button", { name: /signin/i });

		await user.type(emailInput, "test@example.com");
		await user.type(passwordInput, "password123");
		await user.click(submitButton);

		await waitFor(() => {
			expect(authClient.signIn.email).toHaveBeenCalled();
		});

		// Should not call organization methods when no subdomain
		expect(authClient.organization.list).not.toHaveBeenCalled();
		expect(authClient.organization.setActive).not.toHaveBeenCalled();
	});

	it("should handle organization not found gracefully", async () => {
		const user = userEvent.setup();
		const { authClient } = await import("@/lib/auth-client");

		// Set subdomain
		mockLocation.hostname = "nonexistent.localhost";
		mockLocation.origin = "http://nonexistent.localhost:3000";

		vi.mocked(authClient.signIn.email).mockResolvedValue({
			data: {
				user: {
					id: "user-123",
					email: "test@example.com",
					name: "Test User",
				},
			},
			error: null,
		});

		vi.mocked(authClient.organization.list).mockResolvedValue({
			data: [],
			error: null,
		});

		render(<SignInPage />);

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole("button", { name: /signin/i });

		await user.type(emailInput, "test@example.com");
		await user.type(passwordInput, "password123");
		await user.click(submitButton);

		await waitFor(() => {
			expect(authClient.signIn.email).toHaveBeenCalled();
		});

		await waitFor(() => {
			expect(authClient.organization.list).toHaveBeenCalled();
		});

		// Should not call setActive if organization not found
		expect(authClient.organization.setActive).not.toHaveBeenCalled();
	});

	it("should continue with redirect even if organization setting fails", async () => {
		const user = userEvent.setup();
		const { authClient } = await import("@/lib/auth-client");
		const org = {
			id: "org-123",
			slug: "nrgschool",
			name: "NRG School",
		};

		// Set subdomain
		mockLocation.hostname = "nrgschool.localhost";
		mockLocation.origin = "http://nrgschool.localhost:3000";

		vi.mocked(authClient.signIn.email).mockResolvedValue({
			data: {
				user: {
					id: "user-123",
					email: "test@example.com",
					name: "Test User",
				},
			},
			error: null,
		});

		vi.mocked(authClient.organization.list).mockResolvedValue({
			data: [org],
			error: null,
		});

		vi.mocked(authClient.organization.setActive).mockRejectedValue(
			new Error("Failed to set organization"),
		);

		render(<SignInPage />);

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole("button", { name: /signin/i });

		await user.type(emailInput, "test@example.com");
		await user.type(passwordInput, "password123");
		await user.click(submitButton);

		await waitFor(() => {
			expect(authClient.signIn.email).toHaveBeenCalled();
		});

		// Should still redirect even if setActive fails
		await waitFor(
			() => {
				expect(mockLocation.href).toBe("/es/dashboard");
			},
			{ timeout: 3000 },
		);
	});
});
