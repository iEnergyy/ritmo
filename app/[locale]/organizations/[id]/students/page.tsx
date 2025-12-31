"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldError,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useForm } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Controller } from "react-hook-form";
import { Search, Plus, Pencil, Trash2, Copy, Check, Link as LinkIcon } from "lucide-react";

interface Student {
	id: string;
	fullName: string;
	email: string | null;
	phone: string | null;
	createdAt: Date;
}

const studentSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	email: z.string().email("Invalid email").optional().or(z.literal("")),
	phone: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

export default function StudentsPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const t = useTranslations("Students");
	const organizationId = params.id as string;

	const [students, setStudents] = useState<Student[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
	const [organizationSlug, setOrganizationSlug] = useState<string | null>(null);
	const [registrationUrl, setRegistrationUrl] = useState<string>("");
	const [copied, setCopied] = useState(false);

	const createForm = useForm<StudentFormData>({
		resolver: zodResolver(studentSchema),
		defaultValues: {
			fullName: "",
			email: "",
			phone: "",
		},
	});

	const editForm = useForm<StudentFormData>({
		resolver: zodResolver(studentSchema),
		defaultValues: {
			fullName: "",
			email: "",
			phone: "",
		},
	});

	useEffect(() => {
		if (session?.user && !sessionLoading) {
			loadStudents();
			loadOrganizationInfo();
		}
	}, [session, sessionLoading, organizationId, searchQuery]);

	const loadOrganizationInfo = async () => {
		try {
			const response = await fetch(`/api/organizations/${organizationId}/info`);
			if (response.ok) {
				const data = await response.json();
				const slug = data.organization?.slug;
				if (slug) {
					setOrganizationSlug(slug);
					// Build registration URL based on current hostname
					const hostname = window.location.hostname;
					const protocol = window.location.protocol;
					const port = window.location.port ? `:${window.location.port}` : "";
					const locale = window.location.pathname.split("/")[1] || "es";
					
					// Extract base domain (remove current subdomain if any)
					let baseDomain = hostname;
					if (hostname.includes("localhost")) {
						// For localhost, use the slug as subdomain
						baseDomain = `${slug}.localhost`;
					} else {
						// For production, extract base domain and prepend slug
						const parts = hostname.split(".");
						if (parts.length >= 2) {
							// Remove first part (current subdomain) and add new one
							const domainParts = parts.slice(1);
							baseDomain = `${slug}.${domainParts.join(".")}`;
						}
					}
					
					setRegistrationUrl(`${protocol}//${baseDomain}${port}/${locale}/register`);
				}
			}
		} catch (error) {
			console.error("Failed to load organization info:", error);
		}
	};

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(registrationUrl);
			setCopied(true);
			toast.success(t("linkCopied"));
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error("Failed to copy link:", error);
			toast.error(t("copyFailed"));
		}
	};

	const loadStudents = async () => {
		try {
			setLoading(true);
			const url = searchQuery
				? `/api/organizations/${organizationId}/students?search=${encodeURIComponent(searchQuery)}`
				: `/api/organizations/${organizationId}/students`;
			const response = await fetch(url);
			if (response.ok) {
				const data = await response.json();
				setStudents(data.students || []);
			}
		} catch (error) {
			console.error("Failed to load students:", error);
			toast.error("Failed to load students");
		} finally {
			setLoading(false);
		}
	};

	const handleCreate = async (data: StudentFormData) => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/students`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						fullName: data.fullName,
						email: data.email || null,
						phone: data.phone || null,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to create student");
				return;
			}

			toast.success("Student created successfully");
			setIsCreateDialogOpen(false);
			createForm.reset();
			await loadStudents();
		} catch (error) {
			console.error("Create student error:", error);
			toast.error("An error occurred while creating the student");
		}
	};

	const handleEdit = (student: Student) => {
		setSelectedStudent(student);
		editForm.reset({
			fullName: student.fullName,
			email: student.email || "",
			phone: student.phone || "",
		});
		setIsEditDialogOpen(true);
	};

	const handleUpdate = async (data: StudentFormData) => {
		if (!selectedStudent) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/students/${selectedStudent.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						fullName: data.fullName,
						email: data.email || null,
						phone: data.phone || null,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to update student");
				return;
			}

			toast.success("Student updated successfully");
			setIsEditDialogOpen(false);
			setSelectedStudent(null);
			await loadStudents();
		} catch (error) {
			console.error("Update student error:", error);
			toast.error("An error occurred while updating the student");
		}
	};

	const handleDeleteClick = (student: Student) => {
		setSelectedStudent(student);
		setIsDeleteDialogOpen(true);
	};

	const handleDelete = async () => {
		if (!selectedStudent) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/students/${selectedStudent.id}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to delete student");
				return;
			}

			toast.success("Student deleted successfully");
			setIsDeleteDialogOpen(false);
			setSelectedStudent(null);
			await loadStudents();
		} catch (error) {
			console.error("Delete student error:", error);
			toast.error("An error occurred while deleting the student");
		}
	};

	if (sessionLoading) {
		return (
			<AppLayout organizationId={organizationId}>
				<div className="flex items-center justify-center min-h-[400px]">
					<div className="text-lg">Loading...</div>
				</div>
			</AppLayout>
		);
	}

	if (!session?.user) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-4">Not Authenticated</h1>
					<Link
						href="/signin"
						className="text-blue-600 hover:text-blue-500 underline"
					>
						Sign In
					</Link>
				</div>
			</div>
		);
	}

	return (
		<AppLayout organizationId={organizationId}>
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
						<p className="mt-2 text-sm text-gray-600">
							Manage students in your organization
						</p>
					</div>
					<Dialog
						open={isCreateDialogOpen}
						onOpenChange={setIsCreateDialogOpen}
					>
						<DialogTrigger asChild>
							<Button>
								<Plus className="mr-2 h-4 w-4" />
								{t("createButton")}
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{t("createTitle")}</DialogTitle>
								<DialogDescription>{t("createDescription")}</DialogDescription>
							</DialogHeader>
							<form onSubmit={createForm.handleSubmit(handleCreate)}>
								<FieldGroup className="mb-2">
									<Controller
										name="fullName"
										control={createForm.control}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel>{t("fullName")}</FieldLabel>
												<Input {...field} />
												{fieldState.invalid && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>
									<Controller
										name="email"
										control={createForm.control}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel>{t("email")}</FieldLabel>
												<Input type="email" {...field} />
												{fieldState.invalid && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>
									<Controller
										name="phone"
										control={createForm.control}
										render={({ field }) => (
											<Field>
												<FieldLabel>{t("phone")}</FieldLabel>
												<Input {...field} />
											</Field>
										)}
									/>
								</FieldGroup>
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsCreateDialogOpen(false)}
									>
										{t("cancel")}
									</Button>
									<Button type="submit">{t("create")}</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>

				{/* Registration Link Card */}
				{organizationSlug && registrationUrl && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<LinkIcon className="h-5 w-5" />
								{t("registrationLink")}
							</CardTitle>
							<CardDescription>
								{t("registrationLinkDescription")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-2">
								<Input
									value={registrationUrl}
									readOnly
									className="flex-1 font-mono text-sm"
								/>
								<Button
									onClick={handleCopyLink}
									variant="outline"
									size="icon"
									title={t("copyLink")}
								>
									{copied ? (
										<Check className="h-4 w-4 text-green-600" />
									) : (
										<Copy className="h-4 w-4" />
									)}
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Search */}
				<div className="mb-6">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<Input
							type="text"
							placeholder={t("searchPlaceholder")}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
				</div>

				{/* Students Table */}
				<div className="bg-white shadow rounded-lg">
					{loading ? (
						<div className="p-6 space-y-4">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					) : students.length === 0 ? (
						<div className="p-6 text-center text-gray-500">
							{t("noStudents")}
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("fullName")}</TableHead>
									<TableHead>{t("email")}</TableHead>
									<TableHead>{t("phone")}</TableHead>
									<TableHead>{t("createdAt")}</TableHead>
									<TableHead className="text-right">{t("actions")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{students.map((student) => (
									<TableRow key={student.id}>
										<TableCell className="font-medium">
											{student.fullName}
										</TableCell>
										<TableCell>{student.email || "-"}</TableCell>
										<TableCell>{student.phone || "-"}</TableCell>
										<TableCell>
											{new Date(student.createdAt).toLocaleDateString()}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleEdit(student)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDeleteClick(student)}
												>
													<Trash2 className="h-4 w-4 text-red-600" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>

				{/* Edit Dialog */}
				<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t("editTitle")}</DialogTitle>
							<DialogDescription>{t("editDescription")}</DialogDescription>
						</DialogHeader>
						<form onSubmit={editForm.handleSubmit(handleUpdate)}>
							<FieldGroup>
								<Controller
									name="fullName"
									control={editForm.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel>{t("fullName")}</FieldLabel>
											<Input {...field} />
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
								<Controller
									name="email"
									control={editForm.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel>{t("email")}</FieldLabel>
											<Input type="email" {...field} />
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
								<Controller
									name="phone"
									control={editForm.control}
									render={({ field }) => (
										<Field>
											<FieldLabel>{t("phone")}</FieldLabel>
											<Input {...field} />
										</Field>
									)}
								/>
							</FieldGroup>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsEditDialogOpen(false)}
								>
									{t("cancel")}
								</Button>
								<Button type="submit">{t("update")}</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>

				{/* Delete Confirmation Dialog */}
				<AlertDialog
					open={isDeleteDialogOpen}
					onOpenChange={setIsDeleteDialogOpen}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
							<AlertDialogDescription>
								{t("deleteDescription", {
									name: selectedStudent?.fullName ?? "",
								})}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
							<AlertDialogAction onClick={handleDelete}>
								{t("delete")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</AppLayout>
	);
}
