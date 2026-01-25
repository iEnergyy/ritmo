import { describe, it, expect } from "vitest";
import { formatTime12h } from "@/lib/format-time";

describe("lib/format-time", () => {
	describe("formatTime12h", () => {
		it("returns empty string for null", () => {
			expect(formatTime12h(null)).toBe("");
		});

		it("returns empty string for empty string", () => {
			expect(formatTime12h("")).toBe("");
		});

		it("formats HH:mm as 12-hour in en", () => {
			expect(formatTime12h("09:00", "en")).toMatch(/9:00\s*AM/i);
			expect(formatTime12h("14:30", "en")).toMatch(/2:30\s*PM/i);
			expect(formatTime12h("00:00", "en")).toMatch(/12:00\s*AM/i);
			expect(formatTime12h("12:00", "en")).toMatch(/12:00\s*PM/i);
		});

		it("formats HH:mm:ss by using first two parts", () => {
			const out = formatTime12h("14:30:00", "en");
			expect(out).toMatch(/2:30\s*PM/i);
		});

		it("uses locale for AM/PM", () => {
			const en = formatTime12h("14:00", "en");
			const es = formatTime12h("14:00", "es");
			expect(en).toMatch(/PM/i);
			expect(es).toMatch(/p\.?\s*m\.?/i);
		});
	});
});
