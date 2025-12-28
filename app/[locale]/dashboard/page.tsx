"use client";

import { useSession } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
	const { data: session, isPending } = useSession();
	const router = useRouter();
	const locale = useLocale();
	const t = useTranslations("Dashboard");
	const navT = useTranslations("Navigation");
	const langT = useTranslations("LanguageSwitcher");
	const pathname = usePathname();
	const [organizations, setOrganizations] = useState<any[]>([]);
	const [organizationTypes, setOrganizationTypes] = useState<
		Record<string, string>
	>({});
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (session?.user && !isPending) {
			loadOrganizations();
		}
	}, [session, isPending]);

	const loadOrganizations = async () => {
		try {
			setLoading(true);
			const result = await authClient.organization.list();
			if (result.data) {
				setOrganizations(result.data);

				// Load organization types
				const orgIds = result.data.map((org: any) => org.id).join(",");
				if (orgIds) {
					const typesResponse = await fetch(
						`/api/organizations/metadata?ids=${orgIds}`,
					);
					if (typesResponse.ok) {
						const typesData = await typesResponse.json();
						setOrganizationTypes(typesData.types || {});
					}
				}
			}
		} catch (error) {
			console.error("Failed to load organizations:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/");
	};

	const switchLocale = (newLocale: string) => {
		window.location.href = `/${newLocale}${pathname}`;
	};

	if (isPending) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-lg">{t("loadingText")}</div>
			</div>
		);
	}

	if (!session?.user) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-4">{t("notAuthenticated")}</h1>
					<Link
						href="/signin"
						className="text-blue-600 hover:text-blue-500 underline"
					>
						{t("signIn")}
					</Link>
				</div>
			</div>
		);
	}

	const activeOrg = session.session?.activeOrganizationId
		? organizations.find(
				(org) => org.id === session.session.activeOrganizationId,
			)
		: null;

	return (
		<div className="min-h-screen bg-gray-50">
			<nav className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between h-16">
						<div className="flex items-center">
							<h1 className="text-xl font-semibold">{t("title")}</h1>
						</div>
						<div className="flex items-center space-x-4">
							<Link
								href="/"
								className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
							>
								{navT("home")}
							</Link>
							<button
								onClick={() =>
									switchLocale(locale === "es" ? "en" : "es")
								}
								className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium border border-gray-300 rounded-md"
								title={
									locale === "es"
										? `${langT("switchTo")} ${langT("english")}`
										: `${langT("switchTo")} ${langT("spanish")}`
								}
							>
								{locale === "es" ? "EN" : "ES"}
							</button>
							<button
								onClick={handleSignOut}
								className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
							>
								{navT("signOut")}
							</button>
						</div>
					</div>
				</div>
			</nav>

			<main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				<div className="px-4 py-6 sm:px-0">
					<div className="bg-white shadow rounded-lg p-6 mb-6">
						<h2 className="text-2xl font-bold mb-4">{t("userInfo")}</h2>
						<div className="space-y-2">
							<div>
								<span className="font-semibold">{t("userId")}:</span>{" "}
								<code className="bg-gray-100 px-2 py-1 rounded text-sm">
									{session.user.id}
								</code>
							</div>
							<div>
								<span className="font-semibold">{t("name")}:</span>{" "}
								{session.user.name || "N/A"}
							</div>
							<div>
								<span className="font-semibold">{t("email")}:</span>{" "}
								{session.user.email}
							</div>
							<div>
								<span className="font-semibold">{t("emailVerified")}:</span>{" "}
								{session.user.emailVerified ? t("yes") : t("no")}
							</div>
						</div>
					</div>

					<div className="bg-white shadow rounded-lg p-6 mb-6">
						<h2 className="text-2xl font-bold mb-4">{t("sessionInfo")}</h2>
						<div className="space-y-2">
							<div>
								<span className="font-semibold">{t("sessionId")}:</span>{" "}
								<code className="bg-gray-100 px-2 py-1 rounded text-sm">
									{session.session?.id || "N/A"}
								</code>
							</div>
							<div>
								<span className="font-semibold">{t("activeOrganizationId")}:</span>{" "}
								<code className="bg-gray-100 px-2 py-1 rounded text-sm">
									{session.session?.activeOrganizationId || t("none")}
								</code>
							</div>
							<div>
								<span className="font-semibold">{t("expiresAt")}:</span>{" "}
								{session.session?.expiresAt
									? new Date(session.session.expiresAt).toLocaleString()
									: "N/A"}
							</div>
						</div>
					</div>

					<div className="bg-white shadow rounded-lg p-6 mb-6">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-2xl font-bold">{t("organizations")}</h2>
							<Link
								href="/organizations/create"
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
							>
								{t("createOrganization")}
							</Link>
						</div>
						{loading ? (
							<div>{t("loading")}</div>
						) : organizations.length === 0 ? (
							<div className="text-gray-500">{t("noOrganizations")}</div>
						) : (
							<div className="space-y-4">
								{organizations.map((org) => (
									<div
										key={org.id}
										className={`border rounded-lg p-4 ${
											activeOrg?.id === org.id
												? "border-blue-500 bg-blue-50"
												: ""
										}`}
									>
										<div className="flex justify-between items-start">
											<div>
												<h3 className="font-semibold text-lg">{org.name}</h3>
												<p className="text-sm text-gray-600">
													{t("slug")}:{" "}
													<code className="bg-gray-100 px-1 rounded">
														{org.slug}
													</code>
												</p>
												{organizationTypes[org.id] && (
													<p className="text-sm text-gray-600">
														{t("type")}:{" "}
														<span className="font-medium capitalize">
															{organizationTypes[org.id].replace("_", " ")}
														</span>
													</p>
												)}
												<p className="text-sm text-gray-600">
													{t("id")}:{" "}
													<code className="bg-gray-100 px-1 rounded text-xs">
														{org.id}
													</code>
												</p>
												{activeOrg?.id === org.id && (
													<span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
														{t("activeOrganization")}
													</span>
												)}
											</div>
											<button
												onClick={async () => {
													await authClient.organization.setActive({
														organizationId: org.id,
													});
													window.location.reload();
												}}
												className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
												disabled={activeOrg?.id === org.id}
											>
												{activeOrg?.id === org.id ? t("active") : t("setActive")}
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="bg-white shadow rounded-lg p-6">
						<h2 className="text-2xl font-bold mb-4">{t("rawSessionData")}</h2>
						<pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
							{JSON.stringify(session, null, 2)}
						</pre>
					</div>
				</div>
			</main>
		</div>
	);
}
