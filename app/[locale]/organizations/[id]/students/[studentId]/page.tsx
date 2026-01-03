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
import { ArrowLeft, Plus } from "lucide-react";

interface Student {
	id: string;
	fullName: string;
	email: string | null;
	phone: string | null;
	createdAt: Date;
}

interface Enrollment {
	id: string;
	studentId: string;
	groupId: string;
	startDate: string;
	endDate: string | null;
	createdAt: Date;
	group: {
		id: string;
		name: string;
		status: "active" | "paused" | "closed";
		venueId: string | null;
	};
}

interface Group {
	id: string;
	name: string;
	status: "active" | "paused" | "closed";
}

const enrollmentSchema = z.object({
	groupId: z.string().min(1, "Group is required"),
	startDate: z.string().min(1, "Start date is required"),
	endDate: z.string().optional().nullable(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

export default function StudentDetailPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const router = useRouter();
	const t = useTranslations("StudentDetail");
	const tEnrollments = useTranslations("Enrollments");
	const tGroups = useTranslations("Groups");
	const organizationId = params.id as string;
	const studentId = params.studentId as string;

	const [student, setStudent] = useState<Student | null>(null);
	const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

	const enrollmentForm = useForm<EnrollmentFormData>({
		resolver: zodResolver(enrollmentSchema),
		defaultValues: {
			groupId: "",
			startDate: new Date().toISOString().split("T")[0],
			endDate: null,
		},
	});

	useEffect(() => {
		if (session?.user && !sessionLoading) {
			loadStudent();
			loadEnrollments();
			loadGroups();
		}
	}, [session, sessionLoading, organizationId, studentId]);

	const loadStudent = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/students/${studentId}`,
			);
			if (response.ok) {
				const data = await response.json();
				setStudent(data.student);
			} else if (response.status === 404) {
				toast.error("Student not found");
				router.push(`/organizations/${organizationId}/students`);
			}
		} catch (error) {
			console.error("Failed to load student:", error);
			toast.error("Failed to load student");
		}
	};

	const loadEnrollments = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/students/${studentId}/enrollments`,
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

	const loadGroups = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups`,
			);
			if (response.ok) {
				const data = await response.json();
				setGroups(data.groups || []);
			}
		} catch (error) {
			console.error("Failed to load groups:", error);
		}
	};

	const handleAddToGroup = async (data: EnrollmentFormData) => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/students/${studentId}/enrollments`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						groupId: data.groupId,
						startDate: data.startDate,
						endDate: data.endDate || null,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to add student to group");
				return;
			}

			toast.success("Student added to group successfully");
			setIsAddDialogOpen(false);
			enrollmentForm.reset({
				groupId: "",
				startDate: new Date().toISOString().split("T")[0],
				endDate: null,
			});
			await loadEnrollments();
		} catch (error) {
			console.error("Add to group error:", error);
			toast.error("An error occurred while adding the student to group");
		}
	};

	const isEnrollmentActive = (enrollment: Enrollment) => {
		if (!enrollment.endDate) return true;
		const endDate = new Date(enrollment.endDate);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return endDate >= today;
	};

	const currentEnrollments = enrollments.filter(isEnrollmentActive);
	const pastEnrollments = enrollments.filter((e) => !isEnrollmentActive(e));

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

	if (!student) {
		return (
			<AppLayout organizationId={organizationId}>
				<div className="text-center">
					<p>Student not found</p>
					<Link
						href={`/organizations/${organizationId}/students`}
						className="text-blue-600 hover:text-blue-500 underline"
					>
						Back to Students
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
							router.push(`/organizations/${organizationId}/students`)
						}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div className="flex-1">
						<h1 className="text-3xl font-bold text-gray-900">
							{student.fullName}
						</h1>
						<p className="mt-2 text-sm text-gray-600">{t("title")}</p>
					</div>
				</div>

				{/* Student Info Card */}
				<Card>
					<CardHeader>
						<CardTitle>{t("studentInfo")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<strong>Full Name:</strong> {student.fullName}
						</div>
						{student.email && (
							<div>
								<strong>Email:</strong> {student.email}
							</div>
						)}
						{student.phone && (
							<div>
								<strong>Phone:</strong> {student.phone}
							</div>
						)}
						<div>
							<strong>Created:</strong>{" "}
							{new Date(student.createdAt).toLocaleDateString()}
						</div>
					</CardContent>
				</Card>

				{/* Current Groups */}
				<Card>
					<CardHeader>
						<div className="flex justify-between items-center">
							<div>
								<CardTitle>{t("currentGroups")}</CardTitle>
								<CardDescription>
									Groups this student is currently enrolled in
								</CardDescription>
							</div>
							<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
								<DialogTrigger asChild>
									<Button>
										<Plus className="mr-2 h-4 w-4" />
										{t("addToGroup")}
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>{tEnrollments("addStudentTitle")}</DialogTitle>
										<DialogDescription>
											{tEnrollments("addStudentDescription")}
										</DialogDescription>
									</DialogHeader>
									<form
										onSubmit={enrollmentForm.handleSubmit(handleAddToGroup)}
									>
										<FieldGroup>
											<Controller
												name="groupId"
												control={enrollmentForm.control}
												render={({ field, fieldState }) => (
													<Field data-invalid={fieldState.invalid}>
														<FieldLabel>{tEnrollments("toGroup")}</FieldLabel>
														<Select
															value={field.value}
															onValueChange={field.onChange}
														>
															<SelectTrigger>
																<SelectValue
																	placeholder={tEnrollments("selectToGroup")}
																/>
															</SelectTrigger>
															<SelectContent>
																{groups.map((group) => (
																	<SelectItem key={group.id} value={group.id}>
																		{group.name}
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
					</CardHeader>
					<CardContent>
						{currentEnrollments.length === 0 ? (
							<div className="text-center text-gray-500 py-8">
								{t("noGroups")}
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Group</TableHead>
										<TableHead>{tEnrollments("dateRange")}</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{currentEnrollments.map((enrollment) => (
										<TableRow key={enrollment.id}>
											<TableCell className="font-medium">
												<Link
													href={`/organizations/${organizationId}/groups/${enrollment.groupId}`}
													className="hover:underline"
												>
													{enrollment.group.name}
												</Link>
											</TableCell>
											<TableCell>
												{formatDateRange(
													enrollment.startDate,
													enrollment.endDate,
												)}
											</TableCell>
											<TableCell>
												{tGroups(`statusOptions.${enrollment.group.status}`)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>

				{/* Past Groups */}
				{pastEnrollments.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>{t("pastGroups")}</CardTitle>
							<CardDescription>
								Groups this student was previously enrolled in
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Group</TableHead>
										<TableHead>{tEnrollments("dateRange")}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{pastEnrollments.map((enrollment) => (
										<TableRow key={enrollment.id}>
											<TableCell className="font-medium">
												<Link
													href={`/organizations/${organizationId}/groups/${enrollment.groupId}`}
													className="hover:underline"
												>
													{enrollment.group.name}
												</Link>
											</TableCell>
											<TableCell>
												{formatDateRange(
													enrollment.startDate,
													enrollment.endDate,
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				)}
			</div>
		</AppLayout>
	);
}
