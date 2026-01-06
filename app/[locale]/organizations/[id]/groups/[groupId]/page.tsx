"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useParams, useRouter } from "next/navigation";
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
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldError,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useForm } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Controller } from "react-hook-form";
import { ArrowLeft, Plus, Pencil, Trash2, Play, Pause, X } from "lucide-react";

interface Group {
	id: string;
	name: string;
	venueId: string | null;
	status: "active" | "paused" | "closed";
	createdAt: Date;
	venue?: {
		id: string;
		name: string;
		address: string | null;
	} | null;
}

interface Enrollment {
	id: string;
	studentId: string;
	groupId: string;
	startDate: string;
	endDate: string | null;
	createdAt: Date;
	student: {
		id: string;
		fullName: string;
		email: string | null;
		phone: string | null;
	};
}

interface Student {
	id: string;
	fullName: string;
	email: string | null;
	phone: string | null;
}

const enrollmentSchema = z.object({
	studentId: z.string().min(1, "Student is required"),
	startDate: z.string().min(1, "Start date is required"),
	endDate: z.string().optional().nullable(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

export default function GroupDetailPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const router = useRouter();
	const t = useTranslations("GroupDetail");
	const tEnrollments = useTranslations("Enrollments");
	const tGroups = useTranslations("Groups");
	const organizationId = params.id as string;
	const groupId = params.groupId as string;

	const [group, setGroup] = useState<Group | null>(null);
	const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [loading, setLoading] = useState(true);
	const [showActiveOnly, setShowActiveOnly] = useState(true);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [selectedEnrollment, setSelectedEnrollment] =
		useState<Enrollment | null>(null);
	const [newStatus, setNewStatus] = useState<
		"active" | "paused" | "closed" | null
	>(null);

	const enrollmentForm = useForm<EnrollmentFormData>({
		resolver: zodResolver(enrollmentSchema),
		defaultValues: {
			studentId: "",
			startDate: new Date().toISOString().split("T")[0],
			endDate: null,
		},
	});

	const editEnrollmentForm = useForm<EnrollmentFormData>({
		resolver: zodResolver(enrollmentSchema),
		defaultValues: {
			studentId: "",
			startDate: "",
			endDate: null,
		},
	});

	useEffect(() => {
		if (session?.user && !sessionLoading) {
			loadGroup();
			loadEnrollments();
			loadStudents();
		}
	}, [session, sessionLoading, organizationId, groupId]);

	const loadGroup = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups/${groupId}`,
			);
			if (response.ok) {
				const data = await response.json();
				setGroup(data.group);
			} else if (response.status === 404) {
				toast.error("Group not found");
				router.push(`/organizations/${organizationId}/groups`);
			}
		} catch (error) {
			console.error("Failed to load group:", error);
			toast.error("Failed to load group");
		}
	};

	const loadEnrollments = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups/${groupId}/enrollments`,
			);
			if (response.ok) {
				const data = await response.json();
				setEnrollments(data.enrollments || []);
			}
		} catch (error) {
			console.error("Failed to load enrollments:", error);
			toast.error("Failed to load enrollments");
		} finally {
			setLoading(false);
		}
	};

	const loadStudents = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/students`,
			);
			if (response.ok) {
				const data = await response.json();
				setStudents(data.students || []);
			}
		} catch (error) {
			console.error("Failed to load students:", error);
		}
	};

	const handleAddStudent = async (data: EnrollmentFormData) => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups/${groupId}/enrollments`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						studentId: data.studentId,
						startDate: data.startDate,
						endDate: data.endDate || null,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to add student");
				return;
			}

			toast.success("Student added successfully");
			setIsAddDialogOpen(false);
			enrollmentForm.reset({
				studentId: "",
				startDate: new Date().toISOString().split("T")[0],
				endDate: null,
			});
			await loadEnrollments();
		} catch (error) {
			console.error("Add student error:", error);
			toast.error("An error occurred while adding the student");
		}
	};

	const handleEditEnrollment = (enrollment: Enrollment) => {
		setSelectedEnrollment(enrollment);
		editEnrollmentForm.reset({
			studentId: enrollment.studentId,
			startDate: enrollment.startDate,
			endDate: enrollment.endDate || null,
		});
		setIsEditDialogOpen(true);
	};

	const handleUpdateEnrollment = async (data: EnrollmentFormData) => {
		if (!selectedEnrollment) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups/${groupId}/enrollments/${selectedEnrollment.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						startDate: data.startDate,
						endDate: data.endDate || null,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to update enrollment");
				return;
			}

			toast.success("Enrollment updated successfully");
			setIsEditDialogOpen(false);
			setSelectedEnrollment(null);
			await loadEnrollments();
		} catch (error) {
			console.error("Update enrollment error:", error);
			toast.error("An error occurred while updating the enrollment");
		}
	};

	const handleRemoveClick = (enrollment: Enrollment) => {
		setSelectedEnrollment(enrollment);
		setIsRemoveDialogOpen(true);
	};

	const handleRemove = async () => {
		if (!selectedEnrollment) return;

		try {
			const endDate = new Date().toISOString().split("T")[0];
			const response = await fetch(
				`/api/organizations/${organizationId}/groups/${groupId}/enrollments/${selectedEnrollment.id}?endDate=${endDate}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to remove student");
				return;
			}

			toast.success("Student removed successfully");
			setIsRemoveDialogOpen(false);
			setSelectedEnrollment(null);
			await loadEnrollments();
		} catch (error) {
			console.error("Remove student error:", error);
			toast.error("An error occurred while removing the student");
		}
	};

	const handleStatusChangeClick = (status: "active" | "paused" | "closed") => {
		setNewStatus(status);
		setIsStatusDialogOpen(true);
	};

	const handleStatusChange = async () => {
		if (!group || !newStatus) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups/${groupId}/status`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ status: newStatus }),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to update group status");
				return;
			}

			toast.success("Group status updated successfully");
			setIsStatusDialogOpen(false);
			setNewStatus(null);
			await loadGroup();
		} catch (error) {
			console.error("Status change error:", error);
			toast.error("An error occurred while updating the status");
		}
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "active":
				return "default";
			case "paused":
				return "secondary";
			case "closed":
				return "outline";
			default:
				return "outline";
		}
	};

	const isEnrollmentActive = (enrollment: Enrollment) => {
		if (!enrollment.endDate) return true;
		const endDate = new Date(enrollment.endDate);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return endDate >= today;
	};

	const filteredEnrollments = showActiveOnly
		? enrollments.filter(isEnrollmentActive)
		: enrollments;

	const formatDateRange = (startDate: string, endDate: string | null) => {
		const start = new Date(startDate).toLocaleDateString();
		if (!endDate) {
			return `${start} - ${tEnrollments("present")}`;
		}
		const end = new Date(endDate).toLocaleDateString();
		return `${start} - ${end}`;
	};

	if (sessionLoading || loading) {
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

	if (!group) {
		return (
			<AppLayout organizationId={organizationId}>
				<div className="text-center">
					<p>Group not found</p>
					<Link
						href={`/organizations/${organizationId}/groups`}
						className="text-blue-600 hover:text-blue-500 underline"
					>
						Back to Groups
					</Link>
				</div>
			</AppLayout>
		);
	}

	return (
		<AppLayout organizationId={organizationId}>
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() =>
							router.push(`/organizations/${organizationId}/groups`)
						}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div className="flex-1">
						<h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
						<p className="mt-2 text-sm text-gray-600">{t("title")}</p>
					</div>
				</div>

				{/* Group Info Card */}
				<Card>
					<CardHeader>
						<CardTitle>{t("groupInfo")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<strong>{tGroups("name")}:</strong> {group.name}
						</div>
						<div>
							<strong>{tGroups("venue")}:</strong>{" "}
							{group.venue?.name || tGroups("noVenue")}
						</div>
						<div>
							<strong>{tGroups("status")}:</strong>{" "}
							<Badge variant={getStatusBadgeVariant(group.status)}>
								{tGroups(`statusOptions.${group.status}`)}
							</Badge>
						</div>
						<div>
							<strong>{tGroups("createdAt")}:</strong>{" "}
							{new Date(group.createdAt).toLocaleDateString()}
						</div>
					</CardContent>
				</Card>

				{/* Status Management */}
				<Card>
					<CardHeader>
						<CardTitle>{t("statusManagement")}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex gap-2">
							{group.status !== "active" && (
								<Button
									variant="outline"
									onClick={() => handleStatusChangeClick("active")}
								>
									<Play className="mr-2 h-4 w-4" />
									{tGroups("activate")}
								</Button>
							)}
							{group.status !== "paused" && (
								<Button
									variant="outline"
									onClick={() => handleStatusChangeClick("paused")}
								>
									<Pause className="mr-2 h-4 w-4" />
									{tGroups("pause")}
								</Button>
							)}
							{group.status !== "closed" && (
								<Button
									variant="outline"
									onClick={() => handleStatusChangeClick("closed")}
								>
									<X className="mr-2 h-4 w-4" />
									{tGroups("close")}
								</Button>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Enrolled Students */}
				<Card>
					<CardHeader>
						<div className="flex justify-between items-center">
							<div>
								<CardTitle>{t("enrolledStudents")}</CardTitle>
								<CardDescription>
									{showActiveOnly
										? t("activeEnrollments")
										: t("allEnrollments")}
								</CardDescription>
							</div>
							<div className="flex gap-2">
								<Button
									variant={showActiveOnly ? "default" : "outline"}
									size="sm"
									onClick={() => setShowActiveOnly(true)}
								>
									{t("activeEnrollments")}
								</Button>
								<Button
									variant={!showActiveOnly ? "default" : "outline"}
									size="sm"
									onClick={() => setShowActiveOnly(false)}
								>
									{t("allEnrollments")}
								</Button>
								<Dialog
									open={isAddDialogOpen}
									onOpenChange={setIsAddDialogOpen}
								>
									<DialogTrigger asChild>
										<Button>
											<Plus className="mr-2 h-4 w-4" />
											{tEnrollments("addStudent")}
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>
												{tEnrollments("addStudentTitle")}
											</DialogTitle>
											<DialogDescription>
												{tEnrollments("addStudentDescription")}
											</DialogDescription>
										</DialogHeader>
										<form
											onSubmit={enrollmentForm.handleSubmit(handleAddStudent)}
										>
											<FieldGroup>
												<Controller
													name="studentId"
													control={enrollmentForm.control}
													render={({ field, fieldState }) => (
														<Field data-invalid={fieldState.invalid}>
															<FieldLabel>
																{tEnrollments("selectStudent")}
															</FieldLabel>
															<Select
																value={field.value}
																onValueChange={field.onChange}
															>
																<SelectTrigger>
																	<SelectValue
																		placeholder={tEnrollments("selectStudent")}
																	/>
																</SelectTrigger>
																<SelectContent>
																	{students.map((student) => (
																		<SelectItem
																			key={student.id}
																			value={student.id}
																		>
																			{student.fullName}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
															{fieldState.invalid && (
																<FieldError errors={[fieldState.error]} />
															)}
														</Field>
													)}
												/>
												<Controller
													name="startDate"
													control={enrollmentForm.control}
													render={({ field, fieldState }) => (
														<Field data-invalid={fieldState.invalid}>
															<FieldLabel>
																{tEnrollments("startDate")}
															</FieldLabel>
															<Input type="date" {...field} />
															{fieldState.invalid && (
																<FieldError errors={[fieldState.error]} />
															)}
														</Field>
													)}
												/>
												<Controller
													name="endDate"
													control={enrollmentForm.control}
													render={({ field }) => (
														<Field>
															<FieldLabel>
																{tEnrollments("endDateOptional")}
															</FieldLabel>
															<Input
																type="date"
																{...field}
																value={field.value || ""}
															/>
														</Field>
													)}
												/>
											</FieldGroup>
											<DialogFooter>
												<Button
													type="button"
													variant="outline"
													onClick={() => setIsAddDialogOpen(false)}
												>
													{tEnrollments("cancel")}
												</Button>
												<Button type="submit">{tEnrollments("add")}</Button>
											</DialogFooter>
										</form>
									</DialogContent>
								</Dialog>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{filteredEnrollments.length === 0 ? (
							<div className="text-center text-gray-500 py-8">
								{t("noEnrollments")}
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Student</TableHead>
										<TableHead>{tEnrollments("dateRange")}</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredEnrollments.map((enrollment) => (
										<TableRow key={enrollment.id}>
											<TableCell className="font-medium">
												<Link
													href={`/organizations/${organizationId}/students/${enrollment.studentId}`}
													className="hover:underline"
												>
													{enrollment.student.fullName}
												</Link>
											</TableCell>
											<TableCell>
												{formatDateRange(
													enrollment.startDate,
													enrollment.endDate,
												)}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													{isEnrollmentActive(enrollment) && (
														<>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => handleEditEnrollment(enrollment)}
															>
																<Pencil className="h-4 w-4" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => handleRemoveClick(enrollment)}
															>
																<Trash2 className="h-4 w-4 text-red-600" />
															</Button>
														</>
													)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>

				{/* Edit Enrollment Dialog */}
				<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{tEnrollments("editEnrollmentTitle")}</DialogTitle>
							<DialogDescription>
								{tEnrollments("editEnrollmentDescription")}
							</DialogDescription>
						</DialogHeader>
						<form
							onSubmit={editEnrollmentForm.handleSubmit(handleUpdateEnrollment)}
						>
							<FieldGroup>
								<Controller
									name="startDate"
									control={editEnrollmentForm.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel>{tEnrollments("startDate")}</FieldLabel>
											<Input type="date" {...field} />
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
								<Controller
									name="endDate"
									control={editEnrollmentForm.control}
									render={({ field }) => (
										<Field>
											<FieldLabel>{tEnrollments("endDateOptional")}</FieldLabel>
											<Input type="date" {...field} value={field.value || ""} />
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
									{tEnrollments("cancel")}
								</Button>
								<Button type="submit">{tEnrollments("update")}</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>

				{/* Remove Student Dialog */}
				<AlertDialog
					open={isRemoveDialogOpen}
					onOpenChange={setIsRemoveDialogOpen}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								{tEnrollments("removeStudentTitle")}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{tEnrollments("removeStudentDescription", {
									name: selectedEnrollment?.student.fullName ?? "",
								})}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{tEnrollments("cancel")}</AlertDialogCancel>
							<AlertDialogAction onClick={handleRemove}>
								{tEnrollments("remove")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{/* Status Change Dialog */}
				<AlertDialog
					open={isStatusDialogOpen}
					onOpenChange={setIsStatusDialogOpen}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								{tGroups("statusChangeTitle")}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{tGroups("statusChangeDescription", {
									name: group.name,
									status: newStatus
										? tGroups(`statusOptions.${newStatus}`)
										: "",
								})}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{tGroups("cancel")}</AlertDialogCancel>
							<AlertDialogAction onClick={handleStatusChange}>
								{tGroups("changeStatus")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</AppLayout>
	);
}
