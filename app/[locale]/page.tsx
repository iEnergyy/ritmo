import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getLocale } from "next-intl/server";

export default async function Home() {
	const t = await getTranslations("HomePage");
	const locale = await getLocale();

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="text-center">
				<h1 className="text-4xl font-bold mb-8">{t("title")}</h1>
				<div className="space-x-4">
					<Link
						href={`/${locale}/signup`}
						className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
					>
						{t("signUp")}
					</Link>
					<Link
						href={`/${locale}/signin`}
						className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
					>
						{t("signIn")}
					</Link>
					<Link
						href={`/${locale}/dashboard`}
						className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
					>
						{t("dashboard")}
					</Link>
				</div>
			</div>
		</div>
	);
}
