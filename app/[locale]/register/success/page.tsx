"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function RegisterSuccessPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const t = useTranslations("RegisterSuccess");
	const tRegister = useTranslations("Register");

	const studentName = searchParams.get("name") || "";
	const organizationName = searchParams.get("org") || "";

	const handleRegisterAnother = () => {
		router.push("/register");
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<CheckCircle2 className="h-16 w-16 text-green-500" />
					</div>
					<CardTitle className="text-2xl">{t("title")}</CardTitle>
					<CardDescription className="mt-2">{t("message")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{studentName && (
						<div className="text-center">
							<div className="text-sm text-gray-600 mb-1">{t("studentName")}</div>
							<div className="text-lg font-semibold">{studentName}</div>
						</div>
					)}
					{organizationName && (
						<div className="text-center">
							<div className="text-sm text-gray-600 mb-1">{t("organizationName")}</div>
							<div className="text-lg font-semibold">{organizationName}</div>
						</div>
					)}
					<div className="text-center text-gray-600 mt-6">
						{t("thankYou")}
					</div>
					<Button
						onClick={handleRegisterAnother}
						className="w-full mt-6"
						variant="outline"
					>
						{t("registerAnother")}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

