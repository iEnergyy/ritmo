"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldError,
} from "@/components/ui/field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useForm } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Controller } from "react-hook-form";
// Client-side function to extract tenant slug from subdomain
function resolveTenantFromSubdomain(hostname: string): string | null {
	if (!hostname) {
		return null;
	}

	// Remove port if present
	const hostWithoutPort = hostname.split(":")[0];

	// Split by dots
	const parts = hostWithoutPort.split(".");

	// If we have at least 2 parts and the last part is not "localhost" or a TLD,
	// we might have a subdomain. But for localhost, we want to extract the subdomain.
	if (parts.length >= 2) {
		// For localhost: "tenant.localhost" -> ["tenant", "localhost"]
		if (parts[parts.length - 1] === "localhost") {
			return parts[0] || null;
		}

		// For production domains: "tenant.yourdomain.com" -> ["tenant", "yourdomain", "com"]
		// We assume the first part is the subdomain if there are 3+ parts
		if (parts.length >= 3) {
			return parts[0] || null;
		}
	}

	// No subdomain found
	return null;
}

const studentSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	email: z.string().email("Invalid email").optional().or(z.literal("")),
	phone: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface OrganizationInfo {
	name: string;
	slug: string;
}

export default function RegisterPage() {
	const router = useRouter();
	const t = useTranslations("Register");
	const [organizationSlug, setOrganizationSlug] = useState<string | null>(null);
	const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	const form = useForm<StudentFormData>({
		resolver: zodResolver(studentSchema),
		defaultValues: {
			fullName: "",
			email: "",
			phone: "",
		},
	});

	// Extract organization slug from subdomain
	useEffect(() => {
		if (typeof window !== "undefined") {
			const hostname = window.location.hostname;
			const slug = resolveTenantFromSubdomain(hostname);
			
			if (!slug) {
				toast.error(t("organizationNotFound"));
				setLoading(false);
				return;
			}

			setOrganizationSlug(slug);
			loadOrganizationInfo(slug);
		}
	}, []);

	const loadOrganizationInfo = async (slug: string) => {
		try {
			const response = await fetch(`/api/public/organizations/${slug}/public`);
			
			if (!response.ok) {
				if (response.status === 404) {
					toast.error(t("organizationNotFound"));
				} else {
					toast.error(t("errorLoading"));
				}
				setLoading(false);
				return;
			}

			const data = await response.json();
			setOrganizationInfo(data);
		} catch (error) {
			console.error("Error loading organization info:", error);
			toast.error(t("errorLoading"));
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (data: StudentFormData) => {
		if (!organizationSlug) {
			toast.error(t("organizationNotFound"));
			return;
		}

		setSubmitting(true);

		try {
			const response = await fetch(`/api/public/organizations/${organizationSlug}/register`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					fullName: data.fullName,
					email: data.email || null,
					phone: data.phone || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || t("error"));
				setSubmitting(false);
				return;
			}

			const result = await response.json();
			toast.success(t("success"));
			
			// Redirect to success page with student name
			router.push(`/register/success?name=${encodeURIComponent(result.student.fullName)}&org=${encodeURIComponent(result.organization.name)}`);
		} catch (error) {
			console.error("Registration error:", error);
			toast.error(t("error"));
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<div className="text-center">
							<div className="text-lg">{t("loading")}</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!organizationSlug || !organizationInfo) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>{t("organizationNotFound")}</CardTitle>
						<CardDescription>
							{t("organizationNotFoundDescription")}
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>{t("title")}</CardTitle>
					<CardDescription>{t("description")}</CardDescription>
					{organizationInfo && (
						<div className="mt-2 text-sm text-gray-600">
							<strong>{t("organizationLabel")}:</strong> {organizationInfo.name}
						</div>
					)}
				</CardHeader>
				<CardContent>
					<form onSubmit={form.handleSubmit(handleSubmit)}>
						<FieldGroup className="space-y-4">
							<Controller
								name="fullName"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{t("fullName")}</FieldLabel>
										<Input
											{...field}
											placeholder={t("fullNamePlaceholder")}
											disabled={submitting}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
							<Controller
								name="email"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{t("email")}</FieldLabel>
										<Input
											type="email"
											{...field}
											placeholder={t("emailPlaceholder")}
											disabled={submitting}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
							<Controller
								name="phone"
								control={form.control}
								render={({ field }) => (
									<Field>
										<FieldLabel>{t("phone")}</FieldLabel>
										<Input
											{...field}
											placeholder={t("phonePlaceholder")}
											disabled={submitting}
										/>
									</Field>
								)}
							/>
						</FieldGroup>
						<Button
							type="submit"
							className="w-full mt-6"
							disabled={submitting}
						>
							{submitting ? t("submitting") : t("submit")}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}

