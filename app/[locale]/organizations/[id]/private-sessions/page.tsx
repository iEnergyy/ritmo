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
	Plus,
	Pencil,
	Trash2,
	Eye,
	CheckCircle,
	XCircle,
	Clock,
	CalendarIcon,
	Filter,
	X,
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
	userId?: string | null;
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

export default function PrivateSessionsPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const t = useTranslations("PrivateSessions");
	const organizationId = params.id as string;

	const [sessions, setSessions] = useState<PrivateSession[]>([]);
	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [studentsList, setStudentsList] = useState<Student[]>([]);
	const [venues, setVenues] = useState<Venue[]>([]);
	const [loading, setLoading] = useState(true);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedSession, setSelectedSession] = useState<PrivateSession | null>(
		null,
	);

	const [teacherFilter, setTeacherFilter] = useState<string>("all");
	const [studentFilter, setStudentFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
	const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
	const [showFilters, setShowFilters] = useState(false);

	const createForm = useForm<PrivateSessionFormData>({
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
			loadSessions();
			loadTeachers();
			loadStudents();
			loadVenues();
		}
	}, [
		session,
		sessionLoading,
		organizationId,
		teacherFilter,
		studentFilter,
		statusFilter,
		dateFrom,
		dateTo,
	]);

	const loadTeachers = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/teachers`,
			);
			if (response.ok) {
				const data = await response.json();
				setTeachers(data.teachers || []);
			}
		} catch (error) {
			console.error("Failed to load teachers:", error);
		}
	};

	const loadStudents = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/students`,
			);
			if (response.ok) {
				const data = await response.json();
				setStudentsList(data.students || []);
			}
		} catch (error) {
			console.error("Failed to load students:", error);
		}
	};

	const loadVenues = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/venues`,
			);
			if (response.ok) {
				const data = await response.json();
				setVenues(data.venues || []);
			}
		} catch (error) {
			console.error("Failed to load venues:", error);
		}
	};

	const loadSessions = async () => {
		try {
			setLoading(true);
			const url = new URL(
				`/api/organizations/${organizationId}/private-sessions`,
				window.location.origin,
			);
			if (teacherFilter !== "all") {
				url.searchParams.set("teacherId", teacherFilter);
			}
			if (studentFilter !== "all") {
				url.searchParams.set("studentId", studentFilter);
			}
			if (statusFilter !== "all") {
				url.searchParams.set("status", statusFilter);
			}
			if (dateFrom) {
				url.searchParams.set("dateFrom", dateFrom.toISOString().split("T")[0]);
			}
			if (dateTo) {
				url.searchParams.set("dateTo", dateTo.toISOString().split("T")[0]);
			}
			const response = await fetch(url.toString());
			if (response.ok) {
				const data = await response.json();
				setSessions(data.sessions || []);
			}
		} catch (error) {
			console.error("Failed to load private sessions:", error);
			toast.error("Failed to load private sessions");
		} finally {
			setLoading(false);
		}
	};

	const handleCreate = async (data: PrivateSessionFormData) => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/private-sessions`,
				{
					method: "POST",
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
				toast.error(errorData.error || "Failed to create private session");
				return;
			}
			toast.success("Private session created");
			setIsCreateDialogOpen(false);
			createForm.reset({
				date: "",
				teacherId: "",
				venueId: null,
				durationMinutes: 60,
				status: "scheduled",
				studentIds: [],
			});
			await loadSessions();
		} catch (error) {
			console.error("Create private session error:", error);
			toast.error("An error occurred while creating the private session");
		}
	};

	const handleEdit = (s: PrivateSession) => {
		setSelectedSession(s);
		const dateStr = typeof s.date === "string" ? s.date.split("T")[0] : s.date;
		editForm.reset({
			date: dateStr,
			teacherId: s.teacherId,
			venueId: s.venueId || null,
			durationMinutes: s.durationMinutes,
			status: s.status,
			studentIds: s.students.map((st) => st.id),
		});
		setIsEditDialogOpen(true);
	};

	const handleUpdate = async (data: PrivateSessionFormData) => {
		if (!selectedSession) return;
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/private-sessions/${selectedSession.id}`,
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
			setSelectedSession(null);
			await loadSessions();
		} catch (error) {
			console.error("Update private session error:", error);
			toast.error("An error occurred while updating the private session");
		}
	};

	const handleDeleteClick = (s: PrivateSession) => {
		setSelectedSession(s);
		setIsDeleteDialogOpen(true);
	};

	const handleDelete = async () => {
		if (!selectedSession) return;
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/private-sessions/${selectedSession.id}`,
				{ method: "DELETE" },
			);
			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to delete private session");
				return;
			}
			toast.success("Private session deleted");
			setIsDeleteDialogOpen(false);
			setSelectedSession(null);
			await loadSessions();
		} catch (error) {
			console.error("Delete private session error:", error);
			toast.error("An error occurred while deleting the private session");
		}
	};

	const clearFilters = () => {
		setTeacherFilter("all");
		setStudentFilter("all");
		setStatusFilter("all");
		setDateFrom(undefined);
		setDateTo(undefined);
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
				return <Clock className="h-3 w-3" />;
			case "held":
				return <CheckCircle className="h-3 w-3" />;
			case "cancelled":
				return <XCircle className="h-3 w-3" />;
			default:
				return null;
		}
	};

	const formatDate = (dateStr: string) => {
		try {
			return format(new Date(dateStr + "T12:00:00"), "PPP");
		} catch {
			return dateStr;
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
						<p className="mt-2 text-sm text-gray-600">{t("subtitle")}</p>
					</div>
					<div className="flex gap-2">
						{(() => {
							const myTeacherId = session?.user?.id
								? teachers.find((t) => t.userId === session.user.id)?.id
								: undefined;
							return myTeacherId ? (
								<Button
									variant={
										teacherFilter === myTeacherId ? "default" : "outline"
									}
									onClick={() =>
										setTeacherFilter(
											teacherFilter === myTeacherId ? "all" : myTeacherId,
										)
									}
								>
									{t("myPrivateSessions")}
								</Button>
							) : null;
						})()}
						<Button
							variant="outline"
							onClick={() => setShowFilters(!showFilters)}
						>
							<Filter className="mr-2 h-4 w-4" />
							{t("filters.title")}
						</Button>
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
							<DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
								<DialogHeader>
									<DialogTitle>{t("createTitle")}</DialogTitle>
									<DialogDescription>
										{t("createDescription")}
									</DialogDescription>
								</DialogHeader>
								<form onSubmit={createForm.handleSubmit(handleCreate)}>
									<FieldGroup>
										<Controller
											name="date"
											control={createForm.control}
											render={({ field, fieldState }) => (
												<Field data-invalid={fieldState.invalid}>
													<FieldLabel>{t("date")}</FieldLabel>
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
																	? format(
																			new Date(field.value + "T12:00:00"),
																			"PPP",
																		)
																	: t("pickDate")}
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
																	field.onChange(
																		d ? format(d, "yyyy-MM-dd") : "",
																	)
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
											control={createForm.control}
											render={({ field, fieldState }) => (
												<Field data-invalid={fieldState.invalid}>
													<FieldLabel>{t("students")}</FieldLabel>
													<Popover>
														<PopoverTrigger asChild>
															<Button
																variant="outline"
																className={cn(
																	"w-full justify-between font-normal",
																	!field.value?.length &&
																		"text-muted-foreground",
																)}
															>
																{field.value?.length
																	? `${field.value.length} ${t("students")}`
																	: t("selectStudents")}
																<ChevronDown className="h-4 w-4 opacity-50" />
															</Button>
														</PopoverTrigger>
														<PopoverContent
															className="w-full p-2"
															align="start"
														>
															<div className="max-h-60 overflow-auto space-y-2">
																{studentsList.map((student) => (
																	<label
																		key={student.id}
																		className="flex items-center gap-2 cursor-pointer"
																	>
																		<Checkbox
																			checked={field.value?.includes(
																				student.id,
																			)}
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
											control={createForm.control}
											render={({ field, fieldState }) => (
												<Field data-invalid={fieldState.invalid}>
													<FieldLabel>{t("teacher")}</FieldLabel>
													<Select
														value={field.value}
														onValueChange={field.onChange}
													>
														<SelectTrigger>
															<SelectValue placeholder={t("selectTeacher")} />
														</SelectTrigger>
														<SelectContent>
															{teachers.map((teacher) => (
																<SelectItem key={teacher.id} value={teacher.id}>
																	{teacher.fullName}
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
											control={createForm.control}
											render={({ field }) => (
												<Field>
													<FieldLabel>{t("venue")}</FieldLabel>
													<Select
														value={field.value || "__none__"}
														onValueChange={(v) =>
															field.onChange(v === "__none__" ? null : v)
														}
													>
														<SelectTrigger>
															<SelectValue placeholder={t("selectVenue")} />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="__none__">
																{t("noVenue")}
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
											control={createForm.control}
											render={({ field, fieldState }) => (
												<Field data-invalid={fieldState.invalid}>
													<FieldLabel>{t("durationMinutes")}</FieldLabel>
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
											control={createForm.control}
											render={({ field }) => (
												<Field>
													<FieldLabel>{t("status")}</FieldLabel>
													<Select
														value={field.value}
														onValueChange={field.onChange}
													>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="scheduled">
																{t("scheduled")}
															</SelectItem>
															<SelectItem value="held">{t("held")}</SelectItem>
															<SelectItem value="cancelled">
																{t("cancelled")}
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
				</div>

				{showFilters && (
					<div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50 space-y-4">
						<div className="flex justify-between items-center">
							<h3 className="font-semibold">{t("filters.title")}</h3>
							<Button variant="ghost" size="sm" onClick={clearFilters}>
								<X className="h-4 w-4 mr-2" />
								{t("filters.clear")}
							</Button>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<Field>
								<FieldLabel>{t("filters.teacher")}</FieldLabel>
								<Select value={teacherFilter} onValueChange={setTeacherFilter}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">{t("filters.all")}</SelectItem>
										{teachers.map((tch) => (
											<SelectItem key={tch.id} value={tch.id}>
												{tch.fullName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel>{t("filters.student")}</FieldLabel>
								<Select value={studentFilter} onValueChange={setStudentFilter}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">{t("filters.all")}</SelectItem>
										{studentsList.map((stu) => (
											<SelectItem key={stu.id} value={stu.id}>
												{stu.fullName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel>{t("filters.status")}</FieldLabel>
								<Select value={statusFilter} onValueChange={setStatusFilter}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">{t("filters.all")}</SelectItem>
										<SelectItem value="scheduled">{t("scheduled")}</SelectItem>
										<SelectItem value="held">{t("held")}</SelectItem>
										<SelectItem value="cancelled">{t("cancelled")}</SelectItem>
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel>{t("filters.dateFrom")}</FieldLabel>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"w-full justify-start text-left font-normal",
												!dateFrom && "text-muted-foreground",
											)}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{dateFrom ? format(dateFrom, "PPP") : t("pickDate")}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0">
										<Calendar
											mode="single"
											selected={dateFrom}
											onSelect={setDateFrom}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</Field>
							<Field>
								<FieldLabel>{t("filters.dateTo")}</FieldLabel>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"w-full justify-start text-left font-normal",
												!dateTo && "text-muted-foreground",
											)}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{dateTo ? format(dateTo, "PPP") : t("pickDate")}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0">
										<Calendar
											mode="single"
											selected={dateTo}
											onSelect={setDateTo}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</Field>
						</div>
					</div>
				)}

				{loading ? (
					<div className="flex items-center justify-center min-h-[200px]">
						<div className="text-muted-foreground">Loading...</div>
					</div>
				) : (
					<div className="border rounded-lg">
						{sessions.length === 0 ? (
							<div className="p-12 text-center text-muted-foreground">
								{t("noSessions")}
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t("date")}</TableHead>
										<TableHead>{t("teacher")}</TableHead>
										<TableHead>{t("students")}</TableHead>
										<TableHead className="hidden sm:table-cell">
											{t("venue")}
										</TableHead>
										<TableHead className="hidden sm:table-cell">
											{t("durationMinutes")}
										</TableHead>
										<TableHead>{t("status")}</TableHead>
										<TableHead className="w-[120px]">{t("actions")}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{sessions.map((s) => (
										<TableRow key={s.id}>
											<TableCell>{formatDate(s.date)}</TableCell>
											<TableCell>{s.teacher.fullName}</TableCell>
											<TableCell>
												{s.students.length > 2
													? `${s.students
															.map((st) => st.fullName)
															.slice(0, 2)
															.join(", ")} +${s.students.length - 2}`
													: s.students.map((st) => st.fullName).join(", ")}
											</TableCell>
											<TableCell className="hidden sm:table-cell">
												{s.venue?.name ?? "—"}
											</TableCell>
											<TableCell className="hidden sm:table-cell">
												{s.durationMinutes} min
											</TableCell>
											<TableCell>
												<Badge variant={getStatusBadgeVariant(s.status)}>
													{getStatusIcon(s.status)}
													<span className="ml-1">{t(s.status)}</span>
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Button variant="ghost" size="icon" asChild>
														<Link
															href={`/organizations/${organizationId}/private-sessions/${s.id}`}
														>
															<Eye className="h-4 w-4" />
														</Link>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEdit(s)}
													>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleDeleteClick(s)}
													>
														<Trash2 className="h-4 w-4 text-destructive" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</div>
				)}
			</div>

			{/* Edit dialog - same form as create */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{t("editTitle")}</DialogTitle>
						<DialogDescription>{t("editDescription")}</DialogDescription>
					</DialogHeader>
					<form onSubmit={editForm.handleSubmit(handleUpdate)}>
						<FieldGroup>
							<Controller
								name="date"
								control={editForm.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{t("date")}</FieldLabel>
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
														: t("pickDate")}
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
										<FieldLabel>{t("students")}</FieldLabel>
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
														? `${field.value.length} ${t("students")}`
														: t("selectStudents")}
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
										<FieldLabel>{t("teacher")}</FieldLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger>
												<SelectValue placeholder={t("selectTeacher")} />
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
										<FieldLabel>{t("venue")}</FieldLabel>
										<Select
											value={field.value || "__none__"}
											onValueChange={(v) =>
												field.onChange(v === "__none__" ? null : v)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder={t("selectVenue")} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="__none__">{t("noVenue")}</SelectItem>
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
										<FieldLabel>{t("durationMinutes")}</FieldLabel>
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
										<FieldLabel>{t("status")}</FieldLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="scheduled">
													{t("scheduled")}
												</SelectItem>
												<SelectItem value="held">{t("held")}</SelectItem>
												<SelectItem value="cancelled">
													{t("cancelled")}
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
								{t("cancel")}
							</Button>
							<Button type="submit">{t("update")}</Button>
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
						<AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("deleteDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground"
						>
							{t("delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</AppLayout>
	);
}
