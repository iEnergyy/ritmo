"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { useForm } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Controller } from "react-hook-form";
import {
	ArrowLeft,
	Pencil,
	Trash2,
	CheckCircle,
	XCircle,
	Clock,
	CalendarIcon,
	ChevronDown,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PrivateSessionStudent {
	id: string;
	fullName: string;
}

interface PrivateSession {
	id: string;
	date: string;
	durationMinutes: number;
	teacherId: string;
	venueId: string | null;
	status: "scheduled" | "held" | "cancelled";
	createdAt: string;
	teacher: { id: string; fullName: string };
	venue: { id: string; name: string } | null;
	students: PrivateSessionStudent[];
}

interface Teacher {
	id: string;
	fullName: string;
}

interface Student {
	id: string;
	fullName: string;
}

interface Venue {
	id: string;
	name: string;
}

const privateSessionSchema = z.object({
	date: z.string().min(1, "Date is required"),
	teacherId: z.string().min(1, "Teacher is required"),
	venueId: z.string().optional().nullable(),
	durationMinutes: z.number().min(1, "Duration must be at least 1"),
	status: z.enum(["scheduled", "held", "cancelled"]),
	studentIds: z.array(z.string()).min(1, "At least one student is required"),
});

type PrivateSessionFormData = z.infer<typeof privateSessionSchema>;

export default function PrivateSessionDetailPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const router = useRouter();
	const t = useTranslations("PrivateSessionDetail");
	const tList = useTranslations("PrivateSessions");
	const organizationId = params.id as string;
	const sessionId = params.sessionId as string;

	const [privateSession, setPrivateSession] = useState<PrivateSession | null>(
		null,
	);
	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [studentsList, setStudentsList] = useState<Student[]>([]);
	const [venues, setVenues] = useState<Venue[]>([]);
	const [loading, setLoading] = useState(true);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [newStatus, setNewStatus] = useState<
		"scheduled" | "held" | "cancelled" | null
	>(null);

	const editForm = useForm<PrivateSessionFormData>({
		resolver: zodResolver(privateSessionSchema),
		defaultValues: {
			date: "",
			teacherId: "",
			venueId: null,
			durationMinutes: 60,
			status: "scheduled",
			studentIds: [],
		},
	});

	useEffect(() => {
		if (session?.user && !sessionLoading) {
			loadSession();
			loadTeachers();
			loadStudents();
			loadVenues();
		}
	}, [session, sessionLoading, organizationId, sessionId]);

	const loadSession = async () => {
		try {
			setLoading(true);
			const response = await fetch(
				`/api/organizations/${organizationId}/private-sessions/${sessionId}`,
			);
			if (response.ok) {
				const data = await response.json();
				setPrivateSession(data.session);
			} else {
				toast.error("Failed to load private session");
				router.push(`/organizations/${organizationId}/private-sessions`);
			}
		} catch (error) {
			console.error("Failed to load private session:", error);
			toast.error("Failed to load private session");
			router.push(`/organizations/${organizationId}/private-sessions`);
		} finally {
			setLoading(false);
		}
	};

	const loadTeachers = async () => {
		try {
			const res = await fetch(`/api/organizations/${organizationId}/teachers`);
			if (res.ok) {
				const data = await res.json();
				setTeachers(data.teachers || []);
			}
		} catch (error) {
			console.error("Failed to load teachers:", error);
		}
	};

	const loadStudents = async () => {
		try {
			const res = await fetch(`/api/organizations/${organizationId}/students`);
			if (res.ok) {
				const data = await res.json();
				setStudentsList(data.students || []);
			}
		} catch (error) {
			console.error("Failed to load students:", error);
		}
	};

	const loadVenues = async () => {
		try {
			const res = await fetch(`/api/organizations/${organizationId}/venues`);
			if (res.ok) {
				const data = await res.json();
				setVenues(data.venues || []);
			}
		} catch (error) {
			console.error("Failed to load venues:", error);
		}
	};

	const handleStatusChangeClick = (
		status: "scheduled" | "held" | "cancelled",
	) => {
		setNewStatus(status);
		setIsStatusDialogOpen(true);
	};

	const handleStatusChange = async () => {
		if (!newStatus) return;
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/private-sessions/${sessionId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status: newStatus }),
				},
			);
			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to update status");
				return;
			}
			toast.success("Status updated");
			setIsStatusDialogOpen(false);
			setNewStatus(null);
			await loadSession();
		} catch (error) {
			console.error("Status change error:", error);
			toast.error("Failed to update status");
		}
	};

	const handleEdit = () => {
		if (!privateSession) return;
		const dateStr =
			typeof privateSession.date === "string"
				? privateSession.date.split("T")[0]
				: privateSession.date;
		editForm.reset({
			date: dateStr,
			teacherId: privateSession.teacherId,
			venueId: privateSession.venueId || null,
			durationMinutes: privateSession.durationMinutes,
			status: privateSession.status,
			studentIds: privateSession.students.map((st) => st.id),
		});
		setIsEditDialogOpen(true);
	};

	const handleUpdate = async (data: PrivateSessionFormData) => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/private-sessions/${sessionId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						...data,
						date: data.date,
						venueId: data.venueId || null,
					}),
				},
			);
			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to update private session");
				return;
			}
			toast.success("Private session updated");
			setIsEditDialogOpen(false);
			await loadSession();
		} catch (error) {
			console.error("Update error:", error);
			toast.error("Failed to update private session");
		}
	};

	const handleDelete = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/private-sessions/${sessionId}`,
				{ method: "DELETE" },
			);
			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to delete private session");
				return;
			}
			toast.success("Private session deleted");
			router.push(`/organizations/${organizationId}/private-sessions`);
		} catch (error) {
			console.error("Delete error:", error);
			toast.error("Failed to delete private session");
		}
	};

	const formatDate = (dateStr: string) => {
		try {
			return format(new Date(dateStr + "T12:00:00"), "PPP");
		} catch {
			return dateStr;
		}
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "scheduled":
				return "default";
			case "held":
				return "default";
			case "cancelled":
				return "secondary";
			default:
				return "outline";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "scheduled":
				return <Clock className="h-4 w-4" />;
			case "held":
				return <CheckCircle className="h-4 w-4" />;
			case "cancelled":
				return <XCircle className="h-4 w-4" />;
			default:
				return null;
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

	if (loading || !privateSession) {
		return (
			<AppLayout organizationId={organizationId}>
				<div className="flex items-center justify-center min-h-[400px]">
					<div className="text-muted-foreground">Loading...</div>
				</div>
			</AppLayout>
		);
	}

	return (
		<AppLayout organizationId={organizationId}>
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" asChild>
						<Link href={`/organizations/${organizationId}/private-sessions`}>
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div>
						<h1 className="text-3xl font-bold">{t("title")}</h1>
						<p className="text-muted-foreground">
							{formatDate(privateSession.date)} ·{" "}
							{privateSession.durationMinutes} min
						</p>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>{t("sessionInfo")}</CardTitle>
						<CardDescription>
							{privateSession.teacher.fullName} ·{" "}
							{privateSession.students.map((s) => s.fullName).join(", ")}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-2 text-sm">
							<div className="flex gap-2">
								<span className="font-medium text-muted-foreground w-24">
									{t("date")}:
								</span>
								<span>{formatDate(privateSession.date)}</span>
							</div>
							<div className="flex gap-2">
								<span className="font-medium text-muted-foreground w-24">
									{t("teacher")}:
								</span>
								<span>{privateSession.teacher.fullName}</span>
							</div>
							<div className="flex gap-2">
								<span className="font-medium text-muted-foreground w-24">
									{t("students")}:
								</span>
								<span>
									{privateSession.students.map((s) => s.fullName).join(", ")}
								</span>
							</div>
							<div className="flex gap-2">
								<span className="font-medium text-muted-foreground w-24">
									{t("venue")}:
								</span>
								<span>{privateSession.venue?.name ?? "—"}</span>
							</div>
							<div className="flex gap-2">
								<span className="font-medium text-muted-foreground w-24">
									{t("duration")}:
								</span>
								<span>{privateSession.durationMinutes} min</span>
							</div>
							<div className="flex gap-2 items-center">
								<span className="font-medium text-muted-foreground w-24">
									{t("status")}:
								</span>
								<span
									className={cn(
										"inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
										getStatusBadgeVariant(privateSession.status) ===
											"default" && "bg-primary text-primary-foreground",
										getStatusBadgeVariant(privateSession.status) ===
											"secondary" && "bg-secondary text-secondary-foreground",
									)}
								>
									{getStatusIcon(privateSession.status)}
									{tList(privateSession.status)}
								</span>
							</div>
							{privateSession.status === "held" && (
								<div className="flex gap-2 text-muted-foreground">
									<span className="font-medium w-24" />
									<span>{t("allStudentsPresent")}</span>
								</div>
							)}
						</div>

						<div className="flex flex-wrap gap-2 pt-4">
							{privateSession.status !== "cancelled" && (
								<>
									{privateSession.status !== "held" && (
										<Button
											variant="default"
											onClick={() => handleStatusChangeClick("held")}
										>
											<CheckCircle className="mr-2 h-4 w-4" />
											{t("markAsHeld")}
										</Button>
									)}
									<Button
										variant="outline"
										onClick={() => handleStatusChangeClick("cancelled")}
									>
										<XCircle className="mr-2 h-4 w-4" />
										{t("cancelSession")}
									</Button>
								</>
							)}
							<Button variant="outline" onClick={handleEdit}>
								<Pencil className="mr-2 h-4 w-4" />
								{t("editSession")}
							</Button>
							<Button
								variant="outline"
								className="text-destructive hover:text-destructive"
								onClick={() => setIsDeleteDialogOpen(true)}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								{t("deleteSession")}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Status change confirmation */}
			<AlertDialog
				open={isStatusDialogOpen}
				onOpenChange={setIsStatusDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{tList("status")}</AlertDialogTitle>
						<AlertDialogDescription>
							{newStatus
								? `Set status to ${tList(newStatus)}?`
								: "Choose a status"}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleStatusChange}>
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Edit dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>{tList("editTitle")}</DialogTitle>
						<DialogDescription>{tList("editDescription")}</DialogDescription>
					</DialogHeader>
					<form onSubmit={editForm.handleSubmit(handleUpdate)}>
						<FieldGroup>
							<Controller
								name="date"
								control={editForm.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{tList("date")}</FieldLabel>
										<Popover>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal",
														!field.value && "text-muted-foreground",
													)}
												>
													<CalendarIcon className="mr-2 h-4 w-4" />
													{field.value
														? format(new Date(field.value + "T12:00:00"), "PPP")
														: tList("pickDate")}
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0">
												<Calendar
													mode="single"
													selected={
														field.value
															? new Date(field.value + "T12:00:00")
															: undefined
													}
													onSelect={(d) =>
														field.onChange(d ? format(d, "yyyy-MM-dd") : "")
													}
													initialFocus
												/>
											</PopoverContent>
										</Popover>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
							<Controller
								name="studentIds"
								control={editForm.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{tList("students")}</FieldLabel>
										<Popover>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className={cn(
														"w-full justify-between font-normal",
														!field.value?.length && "text-muted-foreground",
													)}
												>
													{field.value?.length
														? `${field.value.length} ${tList("students")}`
														: tList("selectStudents")}
													<ChevronDown className="h-4 w-4 opacity-50" />
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-full p-2" align="start">
												<div className="max-h-60 overflow-auto space-y-2">
													{studentsList.map((student) => (
														<label
															key={student.id}
															className="flex items-center gap-2 cursor-pointer"
														>
															<Checkbox
																checked={field.value?.includes(student.id)}
																onCheckedChange={(checked) => {
																	const next = checked
																		? [...(field.value || []), student.id]
																		: (field.value || []).filter(
																				(id) => id !== student.id,
																			);
																	field.onChange(next);
																}}
															/>
															<span className="text-sm">
																{student.fullName}
															</span>
														</label>
													))}
												</div>
												{fieldState.invalid && (
													<FieldError errors={[fieldState.error]} />
												)}
											</PopoverContent>
										</Popover>
									</Field>
								)}
							/>
							<Controller
								name="teacherId"
								control={editForm.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{tList("teacher")}</FieldLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger>
												<SelectValue placeholder={tList("selectTeacher")} />
											</SelectTrigger>
											<SelectContent>
												{teachers.map((tch) => (
													<SelectItem key={tch.id} value={tch.id}>
														{tch.fullName}
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
								name="venueId"
								control={editForm.control}
								render={({ field }) => (
									<Field>
										<FieldLabel>{tList("venue")}</FieldLabel>
										<Select
											value={field.value || "__none__"}
											onValueChange={(v) =>
												field.onChange(v === "__none__" ? null : v)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder={tList("selectVenue")} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="__none__">
													{tList("noVenue")}
												</SelectItem>
												{venues.map((venue) => (
													<SelectItem key={venue.id} value={venue.id}>
														{venue.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
								)}
							/>
							<Controller
								name="durationMinutes"
								control={editForm.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{tList("durationMinutes")}</FieldLabel>
										<Input
											type="number"
											min={1}
											{...field}
											onChange={(e) =>
												field.onChange(e.target.valueAsNumber || 0)
											}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
							<Controller
								name="status"
								control={editForm.control}
								render={({ field }) => (
									<Field>
										<FieldLabel>{tList("status")}</FieldLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="scheduled">
													{tList("scheduled")}
												</SelectItem>
												<SelectItem value="held">{tList("held")}</SelectItem>
												<SelectItem value="cancelled">
													{tList("cancelled")}
												</SelectItem>
											</SelectContent>
										</Select>
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
								{tList("cancel")}
							</Button>
							<Button type="submit">{tList("update")}</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{tList("deleteTitle")}</AlertDialogTitle>
						<AlertDialogDescription>
							{tList("deleteDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{tList("cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground"
						>
							{tList("delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</AppLayout>
	);
}
