import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useIsMobile } from "@/hooks/use-mobile";

function TestWrapper() {
	const isMobile = useIsMobile();
	return <span data-testid="is-mobile">{String(isMobile)}</span>;
}

describe("useIsMobile", () => {
	let listener: (() => void) | null = null;

	beforeEach(() => {
		listener = null;
		vi.stubGlobal(
			"matchMedia",
			vi.fn((query: string) => ({
				matches: false,
				media: query,
				addEventListener: (_: string, fn: () => void) => {
					listener = fn;
				},
				removeEventListener: () => {
					listener = null;
				},
			})),
		);
	});

	it("returns true when window width is below 768px", async () => {
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 320,
		});

		await act(async () => {
			render(<TestWrapper />);
		});

		await act(async () => {
			listener?.();
		});

		expect(screen.getByTestId("is-mobile").textContent).toBe("true");
	});

	it("returns false when window width is 768px or above", async () => {
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 1024,
		});

		await act(async () => {
			render(<TestWrapper />);
		});

		await act(async () => {
			listener?.();
		});

		expect(screen.getByTestId("is-mobile").textContent).toBe("false");
	});

	it("returns false when window width is exactly 768px", async () => {
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 768,
		});

		await act(async () => {
			render(<TestWrapper />);
		});

		await act(async () => {
			listener?.();
		});

		expect(screen.getByTestId("is-mobile").textContent).toBe("false");
	});
});
