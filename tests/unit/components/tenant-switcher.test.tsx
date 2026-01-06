import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { TenantSwitcher } from "@/components/tenant-switcher";

// Mock auth client
vi.mock("@/lib/auth-client", () => ({
	authClient: {
		organization: {
			list: vi.fn(),
			setActive: vi.fn(),
		},
	},
	useSession: vi.fn(),
}));

// Mock window.location
const mockLocation = {
	href: "",
	hostname: "localhost",
	reload: vi.fn(),
};

Object.defineProperty(window, "location", {
	writable: true,
	value: mockLocation,
});

describe("TenantSwitcher", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockLocation.hostname = "localhost";
		mockLocation.reload = vi.fn();
	});

	it("should switch organization when subdomain matches different org", async () => {
		const { useSession } = await import("@/lib/auth-client");
		const { authClient } = await import("@/lib/auth-client");

		const org1 = { id: "org-1", slug: "org1", name: "Org 1" };
		const org2 = { id: "org-2", slug: "nrgschool", name: "NRG School" };

		// Set subdomain
		mockLocation.hostname = "nrgschool.localhost";

		vi.mocked(useSession).mockReturnValue({
			data: {
				user: { id: "user-123", email: "test@example.com" },
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: org1.id, // Currently active org is different
				},
			},
			isPending: false,
		});

		vi.mocked(authClient.organization.list).mockResolvedValue({
			data: [org1, org2],
			error: null,
		});

		vi.mocked(authClient.organization.setActive).mockResolvedValue({
			data: undefined,
			error: null,
		});

		render(<TenantSwitcher />);

		// Wait for async operations
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(authClient.organization.list).toHaveBeenCalled();
		expect(authClient.organization.setActive).toHaveBeenCalledWith({
			organizationId: org2.id,
		});
		expect(mockLocation.reload).toHaveBeenCalled();
	});

	it("should not switch if organization already matches", async () => {
		const { useSession } = await import("@/lib/auth-client");
		const { authClient } = await import("@/lib/auth-client");

		const org = { id: "org-123", slug: "nrgschool", name: "NRG School" };

		// Set subdomain
		mockLocation.hostname = "nrgschool.localhost";

		vi.mocked(useSession).mockReturnValue({
			data: {
				user: { id: "user-123", email: "test@example.com" },
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: org.id, // Already matches
				},
			},
			isPending: false,
		});

		vi.mocked(authClient.organization.list).mockResolvedValue({
			data: [org],
			error: null,
		});

		render(<TenantSwitcher />);

		// Wait for async operations
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(authClient.organization.list).toHaveBeenCalled();
		// Should not call setActive if already matches
		expect(authClient.organization.setActive).not.toHaveBeenCalled();
		expect(mockLocation.reload).not.toHaveBeenCalled();
	});

	it("should set organization if no active organization is set", async () => {
		const { useSession } = await import("@/lib/auth-client");
		const { authClient } = await import("@/lib/auth-client");

		const org = { id: "org-123", slug: "nrgschool", name: "NRG School" };

		// Set subdomain
		mockLocation.hostname = "nrgschool.localhost";

		vi.mocked(useSession).mockReturnValue({
			data: {
				user: { id: "user-123", email: "test@example.com" },
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: undefined, // No active org
				},
			},
			isPending: false,
		});

		vi.mocked(authClient.organization.list).mockResolvedValue({
			data: [org],
			error: null,
		});

		vi.mocked(authClient.organization.setActive).mockResolvedValue({
			data: undefined,
			error: null,
		});

		render(<TenantSwitcher />);

		// Wait for async operations
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(authClient.organization.list).toHaveBeenCalled();
		expect(authClient.organization.setActive).toHaveBeenCalledWith({
			organizationId: org.id,
		});
		expect(mockLocation.reload).toHaveBeenCalled();
	});

	it("should not do anything if no subdomain", async () => {
		const { useSession } = await import("@/lib/auth-client");
		const { authClient } = await import("@/lib/auth-client");

		// No subdomain
		mockLocation.hostname = "localhost";

		vi.mocked(useSession).mockReturnValue({
			data: {
				user: { id: "user-123", email: "test@example.com" },
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: "org-123",
				},
			},
			isPending: false,
		});

		render(<TenantSwitcher />);

		// Wait for async operations
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Should not call any organization methods
		expect(authClient.organization.list).not.toHaveBeenCalled();
		expect(authClient.organization.setActive).not.toHaveBeenCalled();
	});

	it("should not do anything if session is pending", async () => {
		const { useSession } = await import("@/lib/auth-client");
		const { authClient } = await import("@/lib/auth-client");

		mockLocation.hostname = "nrgschool.localhost";

		vi.mocked(useSession).mockReturnValue({
			data: null,
			isPending: true,
		});

		render(<TenantSwitcher />);

		// Wait for async operations
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Should not call any organization methods
		expect(authClient.organization.list).not.toHaveBeenCalled();
		expect(authClient.organization.setActive).not.toHaveBeenCalled();
	});

	it("should handle organization not found gracefully", async () => {
		const { useSession } = await import("@/lib/auth-client");
		const { authClient } = await import("@/lib/auth-client");

		mockLocation.hostname = "nonexistent.localhost";

		vi.mocked(useSession).mockReturnValue({
			data: {
				user: { id: "user-123", email: "test@example.com" },
				session: {
					id: "session-123",
					expiresAt: new Date(),
					activeOrganizationId: "org-123",
				},
			},
			isPending: false,
		});

		vi.mocked(authClient.organization.list).mockResolvedValue({
			data: [],
			error: null,
		});

		render(<TenantSwitcher />);

		// Wait for async operations
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(authClient.organization.list).toHaveBeenCalled();
		// Should not call setActive if organization not found
		expect(authClient.organization.setActive).not.toHaveBeenCalled();
		expect(mockLocation.reload).not.toHaveBeenCalled();
	});
});
