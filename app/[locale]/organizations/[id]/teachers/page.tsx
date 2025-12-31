"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useForm } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Controller } from "react-hook-form";
import { Plus, Pencil, Trash2, Link as LinkIcon, Unlink } from "lucide-react";

interface User {
	id: string;
	email: string;
	name: string | null;
}

interface Teacher {
	id: string;
	organizationId: string;
	userId: string | null;
	fullName: string;
	paymentType: "fixed_monthly" | "per_head" | "per_class";
	monthlyRate: string | null;
	ratePerHead: string | null;
	ratePerClass: string | null;
	createdAt: Date;
	userEmail: string | null;
	userName: string | null;
}

const teacherSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	userId: z.string().optional(),
	paymentType: z.enum(["fixed_monthly", "per_head", "per_class"]),
	monthlyRate: z.string().optional(),
	ratePerHead: z.string().optional(),
	ratePerClass: z.string().optional(),
}).refine((data) => {
	if (data.paymentType === "fixed_monthly") {
		return !!data.monthlyRate && parseFloat(data.monthlyRate) > 0;
	}
	if (data.paymentType === "per_head") {
		return !!data.ratePerHead && parseFloat(data.ratePerHead) > 0;
	}
	if (data.paymentType === "per_class") {
		return !!data.ratePerClass && parseFloat(data.ratePerClass) > 0;
	}
	return true;
}, {
	message: "Rate is required for the selected payment type",
	path: ["monthlyRate"],
});

type TeacherFormData = z.infer<typeof teacherSchema>;

export default function TeachersPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const t = useTranslations("Teachers");
	const organizationId = params.id as string;

	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
	const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

	const createForm = useForm<TeacherFormData>({
		resolver: zodResolver(teacherSchema),
		defaultValues: {
			fullName: "",
			userId: "",
			paymentType: "fixed_monthly",
			monthlyRate: "",
			ratePerHead: "",
			ratePerClass: "",
		},
	});

	const editForm = useForm<TeacherFormData>({
		resolver: zodResolver(teacherSchema),
		defaultValues: {
			fullName: "",
			userId: "",
			paymentType: "fixed_monthly",
			monthlyRate: "",
			ratePerHead: "",
			ratePerClass: "",
		},
	});

	const paymentType = createForm.watch("paymentType");
	const editPaymentType = editForm.watch("paymentType");

	useEffect(() => {
		if (session?.user && !sessionLoading) {
			loadTeachers();
			loadUsers();
		}
	}, [session, sessionLoading, organizationId]);

	const loadTeachers = async () => {
		try {
			setLoading(true);
			const response = await fetch(
				`/api/organizations/${organizationId}/teachers`,
			);
			if (response.ok) {
				const data = await response.json();
				setTeachers(data.teachers || []);
			}
		} catch (error) {
			console.error("Failed to load teachers:", error);
			toast.error("Failed to load teachers");
		} finally {
			setLoading(false);
		}
	};

	const loadUsers = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/users`,
			);
			if (response.ok) {
				const data = await response.json();
				setUsers(data.users || []);
			}
		} catch (error) {
			console.error("Failed to load users:", error);
		}
	};

	const handleCreate = async (data: TeacherFormData) => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/teachers`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						fullName: data.fullName,
						userId: data.userId || null,
						paymentType: data.paymentType,
						monthlyRate: data.paymentType === "fixed_monthly" ? data.monthlyRate : null,
						ratePerHead: data.paymentType === "per_head" ? data.ratePerHead : null,
						ratePerClass: data.paymentType === "per_class" ? data.ratePerClass : null,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to create teacher");
				return;
			}

			toast.success("Teacher created successfully");
			setIsCreateDialogOpen(false);
			createForm.reset();
			await loadTeachers();
		} catch (error) {
			console.error("Create teacher error:", error);
			toast.error("An error occurred while creating the teacher");
		}
	};

	const handleEdit = (teacher: Teacher) => {
		setSelectedTeacher(teacher);
		editForm.reset({
			fullName: teacher.fullName,
			userId: teacher.userId || "",
			paymentType: teacher.paymentType,
			monthlyRate: teacher.monthlyRate || "",
			ratePerHead: teacher.ratePerHead || "",
			ratePerClass: teacher.ratePerClass || "",
		});
		setIsEditDialogOpen(true);
	};

	const handleUpdate = async (data: TeacherFormData) => {
		if (!selectedTeacher) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/teachers/${selectedTeacher.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						fullName: data.fullName,
						userId: data.userId || null,
						paymentType: data.paymentType,
						monthlyRate: data.paymentType === "fixed_monthly" ? data.monthlyRate : null,
						ratePerHead: data.paymentType === "per_head" ? data.ratePerHead : null,
						ratePerClass: data.paymentType === "per_class" ? data.ratePerClass : null,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to update teacher");
				return;
			}

			toast.success("Teacher updated successfully");
			setIsEditDialogOpen(false);
			setSelectedTeacher(null);
			await loadTeachers();
		} catch (error) {
			console.error("Update teacher error:", error);
			toast.error("An error occurred while updating the teacher");
		}
	};

	const handleDeleteClick = (teacher: Teacher) => {
		setSelectedTeacher(teacher);
		setIsDeleteDialogOpen(true);
	};

	const handleDelete = async () => {
		if (!selectedTeacher) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/teachers/${selectedTeacher.id}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to delete teacher");
				return;
			}

			toast.success("Teacher deleted successfully");
			setIsDeleteDialogOpen(false);
			setSelectedTeacher(null);
			await loadTeachers();
		} catch (error) {
			console.error("Delete teacher error:", error);
			toast.error("An error occurred while deleting the teacher");
		}
	};

	const handleLinkClick = (teacher: Teacher) => {
		setSelectedTeacher(teacher);
		setIsLinkDialogOpen(true);
	};

	const handleLinkUser = async (userId: string | null) => {
		if (!selectedTeacher) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/teachers/${selectedTeacher.id}/link-user`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ userId }),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to link/unlink user");
				return;
			}

			toast.success(userId ? "User linked successfully" : "User unlinked successfully");
			setIsLinkDialogOpen(false);
			setSelectedTeacher(null);
			await loadTeachers();
		} catch (error) {
			console.error("Link user error:", error);
			toast.error("An error occurred while linking/unlinking user");
		}
	};

	const getPaymentTypeBadge = (type: string) => {
		const variants: Record<string, "default" | "secondary" | "outline"> = {
			fixed_monthly: "default",
			per_head: "secondary",
			per_class: "outline",
		};
		return variants[type] || "default";
	};

	const getPaymentTypeLabel = (type: string) => {
		const labels: Record<string, string> = {
			fixed_monthly: t("paymentTypeOptions.fixedMonthly"),
			per_head: t("paymentTypeOptions.perHead"),
			per_class: t("paymentTypeOptions.perClass"),
		};
		return labels[type] || type;
	};

	const getRateDisplay = (teacher: Teacher) => {
		if (teacher.paymentType === "fixed_monthly" && teacher.monthlyRate) {
			return `${teacher.monthlyRate} ${t("ratePerMonth")}`;
		}
		if (teacher.paymentType === "per_head" && teacher.ratePerHead) {
			return `${teacher.ratePerHead} ${t("ratePerHead")}`;
		}
		if (teacher.paymentType === "per_class" && teacher.ratePerClass) {
			return `${teacher.ratePerClass} ${t("ratePerClass")}`;
		}
		return "-";
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
								Manage teachers in your organization
							</p>
						</div>
						<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
							<DialogTrigger asChild>
								<Button>
									<Plus className="mr-2 h-4 w-4" />
									{t("createButton")}
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-2xl">
								<DialogHeader>
									<DialogTitle>{t("createTitle")}</DialogTitle>
									<DialogDescription>{t("createDescription")}</DialogDescription>
								</DialogHeader>
								<form onSubmit={createForm.handleSubmit(handleCreate)}>
									<FieldGroup>
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
											name="userId"
											control={createForm.control}
											render={({ field }) => (
												<Field>
													<FieldLabel>{t("linkUser")}</FieldLabel>
													<Select
														value={field.value || "__none__"}
														onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
													>
														<SelectTrigger>
															<SelectValue placeholder={t("selectUser")} />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="__none__">{t("noUser")}</SelectItem>
															{users.map((user) => (
																<SelectItem key={user.id} value={user.id}>
																	{user.name || user.email}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</Field>
											)}
										/>
										<Controller
											name="paymentType"
											control={createForm.control}
											render={({ field }) => (
												<Field>
													<FieldLabel>{t("paymentType")}</FieldLabel>
													<Select
														value={field.value}
														onValueChange={field.onChange}
													>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="fixed_monthly">
																{t("paymentTypeOptions.fixedMonthly")}
															</SelectItem>
															<SelectItem value="per_head">
																{t("paymentTypeOptions.perHead")}
															</SelectItem>
															<SelectItem value="per_class">
																{t("paymentTypeOptions.perClass")}
															</SelectItem>
														</SelectContent>
													</Select>
												</Field>
											)}
										/>
										{paymentType === "fixed_monthly" && (
											<Controller
												name="monthlyRate"
												control={createForm.control}
												render={({ field, fieldState }) => (
													<Field data-invalid={fieldState.invalid}>
														<FieldLabel>{t("monthlyRate")}</FieldLabel>
														<Input type="number" step="0.01" {...field} />
														{fieldState.invalid && (
															<FieldError errors={[fieldState.error]} />
														)}
													</Field>
												)}
											/>
										)}
										{paymentType === "per_head" && (
											<Controller
												name="ratePerHead"
												control={createForm.control}
												render={({ field, fieldState }) => (
													<Field data-invalid={fieldState.invalid}>
														<FieldLabel>{t("ratePerHead")}</FieldLabel>
														<Input type="number" step="0.01" {...field} />
														{fieldState.invalid && (
															<FieldError errors={[fieldState.error]} />
														)}
													</Field>
												)}
											/>
										)}
										{paymentType === "per_class" && (
											<Controller
												name="ratePerClass"
												control={createForm.control}
												render={({ field, fieldState }) => (
													<Field data-invalid={fieldState.invalid}>
														<FieldLabel>{t("ratePerClass")}</FieldLabel>
														<Input type="number" step="0.01" {...field} />
														{fieldState.invalid && (
															<FieldError errors={[fieldState.error]} />
														)}
													</Field>
												)}
											/>
										)}
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

					{/* Teachers Table */}
					<div className="bg-white shadow rounded-lg">
						{loading ? (
							<div className="p-6 space-y-4">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						) : teachers.length === 0 ? (
							<div className="p-6 text-center text-gray-500">
								{t("noTeachers")}
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t("fullName")}</TableHead>
										<TableHead>{t("paymentType")}</TableHead>
										<TableHead>{t("rate")}</TableHead>
										<TableHead>{t("userAccount")}</TableHead>
										<TableHead>{t("createdAt")}</TableHead>
										<TableHead className="text-right">{t("actions")}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{teachers.map((teacher) => (
										<TableRow key={teacher.id}>
											<TableCell className="font-medium">
												{teacher.fullName}
											</TableCell>
											<TableCell>
												<Badge variant={getPaymentTypeBadge(teacher.paymentType)}>
													{getPaymentTypeLabel(teacher.paymentType)}
												</Badge>
											</TableCell>
											<TableCell>{getRateDisplay(teacher)}</TableCell>
											<TableCell>
												{teacher.userEmail ? (
													<span className="text-sm">
														{teacher.userName || teacher.userEmail}
													</span>
												) : (
													<span className="text-sm text-gray-400">
														{t("notLinked")}
													</span>
												)}
											</TableCell>
											<TableCell>
												{new Date(teacher.createdAt).toLocaleDateString()}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEdit(teacher)}
													>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleLinkClick(teacher)}
													>
														{teacher.userId ? (
															<Unlink className="h-4 w-4" />
														) : (
															<LinkIcon className="h-4 w-4" />
														)}
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleDeleteClick(teacher)}
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
						<DialogContent className="max-w-2xl">
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
										name="userId"
										control={editForm.control}
										render={({ field }) => (
											<Field>
												<FieldLabel>{t("linkUser")}</FieldLabel>
												<Select
													value={field.value || "__none__"}
													onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
												>
													<SelectTrigger>
														<SelectValue placeholder={t("selectUser")} />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="__none__">{t("noUser")}</SelectItem>
														{users.map((user) => (
															<SelectItem key={user.id} value={user.id}>
																{user.name || user.email}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</Field>
										)}
									/>
									<Controller
										name="paymentType"
										control={editForm.control}
										render={({ field }) => (
											<Field>
												<FieldLabel>{t("paymentType")}</FieldLabel>
												<Select
													value={field.value}
													onValueChange={field.onChange}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
														<SelectContent>
															<SelectItem value="fixed_monthly">
																{t("paymentTypeOptions.fixedMonthly")}
															</SelectItem>
															<SelectItem value="per_head">
																{t("paymentTypeOptions.perHead")}
															</SelectItem>
															<SelectItem value="per_class">
																{t("paymentTypeOptions.perClass")}
															</SelectItem>
														</SelectContent>
												</Select>
											</Field>
										)}
									/>
									{editPaymentType === "fixed_monthly" && (
										<Controller
											name="monthlyRate"
											control={editForm.control}
											render={({ field, fieldState }) => (
												<Field data-invalid={fieldState.invalid}>
													<FieldLabel>{t("monthlyRate")}</FieldLabel>
													<Input type="number" step="0.01" {...field} />
													{fieldState.invalid && (
														<FieldError errors={[fieldState.error]} />
													)}
												</Field>
											)}
										/>
									)}
									{editPaymentType === "per_head" && (
										<Controller
											name="ratePerHead"
											control={editForm.control}
											render={({ field, fieldState }) => (
												<Field data-invalid={fieldState.invalid}>
													<FieldLabel>{t("ratePerHead")}</FieldLabel>
													<Input type="number" step="0.01" {...field} />
													{fieldState.invalid && (
														<FieldError errors={[fieldState.error]} />
													)}
												</Field>
											)}
										/>
									)}
									{editPaymentType === "per_class" && (
										<Controller
											name="ratePerClass"
											control={editForm.control}
											render={({ field, fieldState }) => (
												<Field data-invalid={fieldState.invalid}>
													<FieldLabel>{t("ratePerClass")}</FieldLabel>
													<Input type="number" step="0.01" {...field} />
													{fieldState.invalid && (
														<FieldError errors={[fieldState.error]} />
													)}
												</Field>
											)}
										/>
									)}
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

					{/* Link User Dialog */}
					<Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{selectedTeacher?.userId ? t("unlinkUser") : t("linkUser")}
								</DialogTitle>
								<DialogDescription>
									{selectedTeacher?.userId
										? t("unlinkUserDescription")
										: t("linkUserDescription")}
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4">
								<Select
									value={selectedTeacher?.userId || "__none__"}
									onValueChange={(value) => handleLinkUser(value === "__none__" ? null : value)}
								>
									<SelectTrigger>
										<SelectValue placeholder={t("selectUser")} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__none__">{t("noUser")}</SelectItem>
										{users.map((user) => (
											<SelectItem key={user.id} value={user.id}>
												{user.name || user.email}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsLinkDialogOpen(false)}
								>
									{t("cancel")}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Delete Confirmation Dialog */}
					<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
								<AlertDialogDescription>
									{t("deleteDescription", {
										name: selectedTeacher?.fullName,
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

