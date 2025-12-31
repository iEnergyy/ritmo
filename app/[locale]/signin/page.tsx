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
		setError(null);
		setLoading(true);

		try {
			const { data, error } = await authClient.signIn.email({
				email,
				password,
			});

			if (error) {
				setError(error.message || t("error"));
				setLoading(false);
				return;
			}

			if (data?.user) {
				// Wait for cookies to be set before redirecting
				// This ensures the middleware can read the session
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				// Use window.location.href for full page reload to ensure cookies are available
				// Next.js router.push() doesn't guarantee middleware will see new cookies
				// eslint-disable-next-line no-restricted-globals
				globalThis.location.href = `/${locale}/dashboard`;
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : t("error"));
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
