"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function SignInPage() {
	const locale = useLocale();
	const t = useTranslations("SignIn");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		console.log("=== SIGNIN FORM SUBMITTED ===");
		console.log("Email:", email);
		console.log("Locale:", locale);
		
		setError(null);
		setLoading(true);

		try {
			console.log("Calling authClient.signIn.email...");
			const { data, error } = await authClient.signIn.email(
				{
					email,
					password,
				},
				{
					onRequest: () => {
						console.log("✓ onRequest callback fired");
					},
					onSuccess: (ctx) => {
						console.log("✓ onSuccess callback fired");
						console.log("Success context:", ctx);
						// Redirect to dashboard after successful sign in
						const redirectUrl = `/${locale}/dashboard`;
						console.log("Redirecting to:", redirectUrl);
						globalThis.location.href = redirectUrl;
					},
					onError: (ctx) => {
						console.error("✗ onError callback fired");
						console.error("Error context:", ctx.error);
						setError(ctx.error.message || t("error"));
						setLoading(false);
					},
				},
			);

			console.log("=== SIGNIN RESPONSE ===");
			console.log("Data:", data);
			console.log("Error:", error);

			// Fallback check if callbacks don't fire
			if (error) {
				console.error("Fallback error handling triggered");
				setError(error.message || t("error"));
				setLoading(false);
			} else if (data) {
				console.log("Fallback success handling triggered");
				console.log("Sign in data received:", data);
				// Only redirect here if onSuccess didn't fire
				const currentPath = globalThis.location.pathname;
				console.log("Current path:", currentPath);
				if (currentPath.includes("/signin")) {
					const redirectUrl = `/${locale}/dashboard`;
					console.log("Fallback redirect to:", redirectUrl);
					globalThis.location.href = redirectUrl;
				}
			} else {
				console.warn("No data and no error - unexpected state");
			}
		} catch (err) {
			console.error("=== SIGNIN EXCEPTION ===");
			console.error("Exception:", err);
			setError(err instanceof Error ? err.message : "An error occurred");
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
						{t("or")}{" "}
						<Link
							href="/signup"
							className="font-medium text-blue-600 hover:text-blue-500"
						>
							{t("createAccount")}
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
								htmlFor="email"
								className="block text-sm font-medium text-gray-700"
							>
								{t("email")}
							</label>
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
								placeholder={t("emailPlaceholder")}
							/>
						</div>
						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-700"
							>
								{t("password")}
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
								placeholder={t("passwordPlaceholder")}
							/>
						</div>
					</div>

					<div>
						<button
							type="submit"
							disabled={loading}
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? t("signingIn") : t("signIn")}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
