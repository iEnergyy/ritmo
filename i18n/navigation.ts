import { createNavigation } from "next-intl/navigation";

export const locales = ["es", "en"] as const;

export const { Link, redirect, usePathname, useRouter } = createNavigation({
	locales,
	defaultLocale: "es",
});
