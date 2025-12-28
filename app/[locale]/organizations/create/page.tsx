"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter as useI18nRouter } from "@/i18n/navigation";

export default function CreateOrganizationPage() {
	const router = useI18nRouter();
	const t = useTranslations("CreateOrganization");
	const navT = useTranslations("Navigation");
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [type, setType] = useState<"school" | "independent_teacher">("school");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Auto-generate slug from name
	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newName = e.target.value;
		setName(newName);
		// Generate slug from name
		const generatedSlug = newName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
		setSlug(generatedSlug);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			// Create organization using Better Auth
			const result = await authClient.organization.create({
				name,
				slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
			});

			if (result.error) {
				setError(result.error.message || t("error"));
			} else if (result.data) {
				// After creating the organization, add the type metadata
				// This requires a server-side API call since we need to use the database directly
				const metadataResult = await fetch("/api/organizations/metadata", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						organizationId: result.data.id,
						type,
					}),
				});

				if (!metadataResult.ok) {
					console.warn(
						"Failed to set organization type metadata, but organization was created",
					);
				}

				// Redirect to dashboard
				router.push("/dashboard");
			}
		} catch (err) {
			console.error("Create organization error:", err);
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						{t("title")}
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						<Link
							href="/dashboard"
							className="font-medium text-blue-600 hover:text-blue-500"
						>
							{t("backToDashboard")}
						</Link>
					</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					{error && (
						<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
							{error}
						</div>
					)}
					<div className="space-y-4">
						<div>
							<label
								htmlFor="name"
								className="block text-sm font-medium text-gray-700"
							>
								{t("organizationName")}
							</label>
							<input
								id="name"
								name="name"
								type="text"
								required
								value={name}
								onChange={handleNameChange}
								className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
								placeholder={t("namePlaceholder")}
							/>
						</div>
						<div>
							<label
								htmlFor="slug"
								className="block text-sm font-medium text-gray-700"
							>
								{t("slug")}
							</label>
							<input
								id="slug"
								name="slug"
								type="text"
								required
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
								className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
								placeholder={t("slugPlaceholder")}
							/>
							<p className="mt-1 text-xs text-gray-500">{t("slugHint")}</p>
						</div>
						<div>
							<label
								htmlFor="type"
								className="block text-sm font-medium text-gray-700"
							>
								{t("organizationType")}
							</label>
							<select
								id="type"
								name="type"
								value={type}
								onChange={(e) =>
									setType(e.target.value as "school" | "independent_teacher")
								}
								className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							>
								<option value="school">{t("danceSchool")}</option>
								<option value="independent_teacher">
									{t("independentTeacher")}
								</option>
							</select>
						</div>
					</div>

					<div>
						<button
							type="submit"
							disabled={loading}
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? t("creating") : t("createOrganization")}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
