import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
	// This will typically be called from the proxy
	// with a locale determined by the URL or other logic
	let locale = await requestLocale;

	// Ensure that a valid locale is used
	if (!locale || !["es", "en"].includes(locale)) {
		locale = "es"; // Default to Spanish
	}

	return {
		locale,
		messages: (await import(`../messages/${locale}.json`)).default,
	};
});
