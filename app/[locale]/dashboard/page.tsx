"use client";

import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Plus, Building2 } from "lucide-react";

export default function DashboardPage() {
	const { data: session, isPending } = useSession();
	const router = useRouter();
	const t = useTranslations("Dashboard");
	const [organizations, setOrganizations] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (session?.user && !isPending) {
			loadOrganizations();
		}
	}, [session, isPending]);

	// Auto-redirect to organization dashboard if user has an active org
	useEffect(() => {
		if (
			session?.user &&
			!isPending &&
			organizations.length > 0 &&
			session.session?.activeOrganizationId
		) {
			router.push(`/organizations/${session.session.activeOrganizationId}`);
		} else if (
			session?.user &&
			!isPending &&
			organizations.length > 0 &&
			!session.session?.activeOrganizationId
		) {
			// Auto-set first organization and redirect
			const firstOrg = organizations[0];
			authClient.organization
				.setActive({
					organizationId: firstOrg.id,
				})
				.then(() => {
					router.push(`/organizations/${firstOrg.id}`);
				})
				.catch((error) => {
					console.error("Error auto-setting active organization:", error);
				});
		}
	}, [session, isPending, organizations, router]);

	const loadOrganizations = async () => {
		try {
			setLoading(true);
			const result = await authClient.organization.list();
			if (result.data) {
				setOrganizations(result.data);
			}
		} catch (error) {
			console.error("Failed to load organizations:", error);
		} finally {
			setLoading(false);
		}
	};

	if (isPending || loading) {
		return (
			<AppLayout>
				<div className="min-h-screen flex items-center justify-center">
					<div className="text-lg">{t("loadingText")}</div>
				</div>
			</AppLayout>
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

	return (
		<AppLayout>
			<div className="max-w-4xl mx-auto">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						Welcome to Cadence
					</h1>
					<p className="text-gray-600">
						Manage your dance schools and teaching organizations
					</p>
				</div>

				{organizations.length === 0 ? (
					<Card className="p-8 text-center">
						<Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							No organizations yet
						</h2>
						<p className="text-gray-600 mb-6">
							Create your first organization to get started
						</p>
						<Link href="/organizations/create">
							<Button>
								<Plus className="mr-2 h-4 w-4" />
								{t("createOrganization")}
							</Button>
						</Link>
					</Card>
				) : (
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<h2 className="text-xl font-semibold text-gray-900">
								Your Organizations
							</h2>
							<Link href="/organizations/create">
								<Button variant="outline" size="sm">
									<Plus className="mr-2 h-4 w-4" />
									Create Organization
								</Button>
							</Link>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{organizations.map((org) => (
								<Link key={org.id} href={`/organizations/${org.id}`}>
									<Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
										<div className="flex items-start justify-between">
											<div>
												<h3 className="text-lg font-semibold text-gray-900">
													{org.name}
												</h3>
												<p className="text-sm text-gray-500 mt-1">{org.slug}</p>
											</div>
											<Building2 className="h-5 w-5 text-gray-400" />
										</div>
									</Card>
								</Link>
							))}
						</div>
					</div>
				)}
			</div>
		</AppLayout>
	);
}
