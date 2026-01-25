/**
 * Format a time string (HH:mm or HH:mm:ss) as 12-hour clock for UI display.
 * Storage and inputs remain 24-hour; use this only for display.
 *
 * @param time - "HH:mm" or "HH:mm:ss" or null
 * @param locale - BCP 47 locale (e.g. "en", "es") for AM/PM and grouping
 * @returns e.g. "2:30 PM" or "9:00 AM"; "" when time is null/empty
 */
export function formatTime12h(time: string | null, locale = "en"): string {
	if (!time || !String(time).trim()) return "";
	const parts = String(time).trim().split(":");
	const h = Number.parseInt(parts[0], 10);
	const m = Number.parseInt(parts[1], 10) || 0;
	if (!Number.isFinite(h)) return time;
	const d = new Date(2000, 0, 1, h, m, 0);
	return d.toLocaleTimeString(locale, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}
