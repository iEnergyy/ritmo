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
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ClassSession {
	id: string;
	date: string;
	startTime: string | null;
	endTime: string | null;
	groupId: string | null;
	venueId: string | null;
	teacherId: string;
	status: "scheduled" | "held" | "cancelled";
	createdAt: string;
	group?: {
		id: string;
		name: string;
	} | null;
	teacher: {
		id: string;
		fullName: string;
	};
	venue?: {
		id: string;
		name: string;
	} | null;
}

interface Group {
	id: string;
	name: string;
}

interface Teacher {
	id: string;
	fullName: string;
}

interface Venue {
	id: string;
	name: string;
}

const sessionSchema = z.object({
	date: z.string().min(1, "Date is required"),
	startTime: z.string().optional().nullable(),
	endTime: z.string().optional().nullable(),
	groupId: z.string().optional().nullable(),
	teacherId: z.string().min(1, "Teacher is required"),
	venueId: z.string().optional().nullable(),
	status: z.enum(["scheduled", "held", "cancelled"]),
});

type SessionFormData = z.infer<typeof sessionSchema>;

export default function SessionsPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const router = useRouter();
	const t = useTranslations("Sessions");
	const organizationId = params.id as string;

	const [sessions, setSessions] = useState<ClassSession[]>([]);
	const [groups, setGroups] = useState<Group[]>([]);
	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [venues, setVenues] = useState<Venue[]>([]);
	const [loading, setLoading] = useState(true);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [selectedSession, setSelectedSession] = useState<ClassSession | null>(
		null,
	);
	const [newStatus, setNewStatus] = useState<
		"scheduled" | "held" | "cancelled" | null
	>(null);

	// Filters
	const [groupFilter, setGroupFilter] = useState<string>("all");
	const [teacherFilter, setTeacherFilter] = useState<string>("all");
	const [venueFilter, setVenueFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
	const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
	const [showFilters, setShowFilters] = useState(false);

	const createForm = useForm<SessionFormData>({
		resolver: zodResolver(sessionSchema),
		defaultValues: {
			date: "",
			startTime: null,
			endTime: null,
			groupId: null,
			teacherId: "",
			venueId: null,
			status: "scheduled",
		},
	});

	const editForm = useForm<SessionFormData>({
		resolver: zodResolver(sessionSchema),
		defaultValues: {
			date: "",
			startTime: null,
			endTime: null,
			groupId: null,
			teacherId: "",
			venueId: null,
			status: "scheduled",
		},
	});

	useEffect(() => {
		if (session?.user && !sessionLoading) {
			loadSessions();
			loadGroups();
			loadTeachers();
			loadVenues();
		}
	}, [
		session,
		sessionLoading,
		organizationId,
		groupFilter,
		teacherFilter,
		venueFilter,
		statusFilter,
		dateFrom,
		dateTo,
	]);

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
				`/api/organizations/${organizationId}/sessions`,
				window.location.origin,
			);

			if (groupFilter !== "all") {
				url.searchParams.set("groupId", groupFilter);
			}
			if (teacherFilter !== "all") {
				url.searchParams.set("teacherId", teacherFilter);
			}
			if (venueFilter !== "all") {
				url.searchParams.set("venueId", venueFilter);
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
			console.error("Failed to load sessions:", error);
			toast.error("Failed to load sessions");
		} finally {
			setLoading(false);
		}
	};

	const handleCreate = async (data: SessionFormData) => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/sessions`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						...data,
						date: data.date,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to create session");
				return;
			}

			toast.success("Session created successfully");
			setIsCreateDialogOpen(false);
			createForm.reset();
			await loadSessions();
		} catch (error) {
			console.error("Create session error:", error);
			toast.error("An error occurred while creating the session");
		}
	};

	const handleEdit = (session: ClassSession) => {
		setSelectedSession(session);
		// Format date for input
		const dateStr = session.date.split("T")[0];
		editForm.reset({
			date: dateStr,
			startTime: session.startTime || null,
			endTime: session.endTime || null,
			groupId: session.groupId || null,
			teacherId: session.teacherId,
			venueId: session.venueId || null,
			status: session.status,
		});
		setIsEditDialogOpen(true);
	};

	const handleUpdate = async (data: SessionFormData) => {
		if (!selectedSession) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/sessions/${selectedSession.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						...data,
						date: data.date,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to update session");
				return;
			}

			toast.success("Session updated successfully");
			setIsEditDialogOpen(false);
			setSelectedSession(null);
			await loadSessions();
		} catch (error) {
			console.error("Update session error:", error);
			toast.error("An error occurred while updating the session");
		}
	};

	const handleDeleteClick = (session: ClassSession) => {
		setSelectedSession(session);
		setIsDeleteDialogOpen(true);
	};

	const handleDelete = async () => {
		if (!selectedSession) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/sessions/${selectedSession.id}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to delete session");
				return;
			}

			toast.success("Session deleted successfully");
			setIsDeleteDialogOpen(false);
			setSelectedSession(null);
			await loadSessions();
		} catch (error) {
			console.error("Delete session error:", error);
			toast.error("An error occurred while deleting the session");
		}
	};

	const handleStatusChangeClick = (
		session: ClassSession,
		status: "scheduled" | "held" | "cancelled",
	) => {
		setSelectedSession(session);
		setNewStatus(status);
		setIsStatusDialogOpen(true);
	};

	const handleStatusChange = async () => {
		if (!selectedSession || !newStatus) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/sessions/${selectedSession.id}/status`,
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
				toast.error(errorData.error || "Failed to update session status");
				return;
			}

			toast.success("Session status updated successfully");
			setIsStatusDialogOpen(false);
			setSelectedSession(null);
			setNewStatus(null);
			await loadSessions();
		} catch (error) {
			console.error("Status change error:", error);
			toast.error("An error occurred while updating the status");
		}
	};

	const clearFilters = () => {
		setGroupFilter("all");
		setTeacherFilter("all");
		setVenueFilter("all");
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

	const formatTime = (time: string | null) => {
		if (!time) return t("noTime");
		// Time is in HH:mm format, just return it
		return time;
	};

	const formatDate = (dateStr: string) => {
		try {
			const date = new Date(dateStr);
			return format(date, "PPP");
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
						<h1 className="text-3xl font-bold text-gray-900">
							{t("title")}
						</h1>
						<p className="mt-2 text-sm text-gray-600">
							Manage class sessions in your organization
						</p>
					</div>
					<div className="flex gap-2">
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
							<DialogContent className="max-w-2xl">
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
													<Input type="date" {...field} />
													{fieldState.invalid && (
														<FieldError errors={[fieldState.error]} />
													)}
												</Field>
											)}
										/>
										<div className="grid grid-cols-2 gap-4">
											<Controller
												name="startTime"
												control={createForm.control}
												render={({ field }) => (
													<Field>
														<FieldLabel>{t("startTime")}</FieldLabel>
														<Input type="time" {...field} value={field.value || ""} />
													</Field>
												)}
											/>
											<Controller
												name="endTime"
												control={createForm.control}
												render={({ field }) => (
													<Field>
														<FieldLabel>{t("endTime")}</FieldLabel>
														<Input type="time" {...field} value={field.value || ""} />
													</Field>
												)}
											/>
										</div>
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
											name="groupId"
											control={createForm.control}
											render={({ field }) => (
												<Field>
													<FieldLabel>{t("group")}</FieldLabel>
													<Select
														value={field.value || "__none__"}
														onValueChange={(value) =>
															field.onChange(value === "__none__" ? null : value)
														}
													>
														<SelectTrigger>
															<SelectValue placeholder={t("selectGroup")} />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="__none__">
																{t("noGroup")}
															</SelectItem>
															{groups.map((group) => (
																<SelectItem key={group.id} value={group.id}>
																	{group.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
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
														onValueChange={(value) =>
															field.onChange(value === "__none__" ? null : value)
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
																{t("statusOptions.scheduled")}
															</SelectItem>
															<SelectItem value="held">
																{t("statusOptions.held")}
															</SelectItem>
															<SelectItem value="cancelled">
																{t("statusOptions.cancelled")}
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
											{t("cancelButton")}
										</Button>
										<Button type="submit">{t("create")}</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				{showFilters && (
					<div className="p-4 border rounded-lg bg-gray-50 space-y-4">
						<div className="flex justify-between items-center">
							<h3 className="font-semibold">{t("filters.title")}</h3>
							<Button variant="ghost" size="sm" onClick={clearFilters}>
								<X className="h-4 w-4 mr-2" />
								{t("filters.clear")}
							</Button>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<Field>
								<FieldLabel>{t("filters.group")}</FieldLabel>
								<Select value={groupFilter} onValueChange={setGroupFilter}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">{t("filters.all")}</SelectItem>
										{groups.map((group) => (
											<SelectItem key={group.id} value={group.id}>
												{group.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel>{t("filters.teacher")}</FieldLabel>
								<Select value={teacherFilter} onValueChange={setTeacherFilter}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">{t("filters.all")}</SelectItem>
										{teachers.map((teacher) => (
											<SelectItem key={teacher.id} value={teacher.id}>
												{teacher.fullName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel>{t("filters.venue")}</FieldLabel>
								<Select value={venueFilter} onValueChange={setVenueFilter}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">{t("filters.all")}</SelectItem>
										{venues.map((venue) => (
											<SelectItem key={venue.id} value={venue.id}>
												{venue.name}
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
										<SelectItem value="scheduled">
											{t("statusOptions.scheduled")}
										</SelectItem>
										<SelectItem value="held">
											{t("statusOptions.held")}
										</SelectItem>
										<SelectItem value="cancelled">
											{t("statusOptions.cancelled")}
										</SelectItem>
									</SelectContent>
								</Select>
							</Field>
						</div>
						<div className="grid grid-cols-2 gap-4">
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
											{dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
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
											{dateTo ? format(dateTo, "PPP") : "Pick a date"}
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
					<div className="space-y-2">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
					</div>
				) : sessions.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-gray-500">{t("noSessions")}</p>
					</div>
				) : (
					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("date")}</TableHead>
									<TableHead>{t("time")}</TableHead>
									<TableHead>{t("group")}</TableHead>
									<TableHead>{t("teacher")}</TableHead>
									<TableHead>{t("venue")}</TableHead>
									<TableHead>{t("status")}</TableHead>
									<TableHead>{t("actions")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sessions.map((session) => (
									<TableRow key={session.id}>
										<TableCell>{formatDate(session.date)}</TableCell>
										<TableCell>
											{session.startTime && session.endTime
												? `${formatTime(session.startTime)} - ${formatTime(session.endTime)}`
												: session.startTime
													? formatTime(session.startTime)
													: t("noTime")}
										</TableCell>
										<TableCell>
											{session.group ? (
												<Link
													href={`/organizations/${organizationId}/groups/${session.group.id}`}
													className="text-blue-600 hover:text-blue-500"
												>
													{session.group.name}
												</Link>
											) : (
												t("noGroup")
											)}
										</TableCell>
										<TableCell>
											<Link
												href={`/organizations/${organizationId}/teachers`}
												className="text-blue-600 hover:text-blue-500"
											>
												{session.teacher.fullName}
											</Link>
										</TableCell>
										<TableCell>
											{session.venue ? (
												<Link
													href={`/organizations/${organizationId}/venues`}
													className="text-blue-600 hover:text-blue-500"
												>
													{session.venue.name}
												</Link>
											) : (
												t("noVenue")
											)}
										</TableCell>
										<TableCell>
											<Badge variant={getStatusBadgeVariant(session.status)}>
												{getStatusIcon(session.status)}
												<span className="ml-1">
													{t(`statusOptions.${session.status}`)}
												</span>
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														router.push(
															`/organizations/${organizationId}/sessions/${session.id}`,
														)
													}
												>
													<Eye className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleEdit(session)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												{session.status === "scheduled" && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															handleStatusChangeClick(session, "held")
														}
														title={t("markAsHeld")}
													>
														<CheckCircle className="h-4 w-4" />
													</Button>
												)}
												{session.status !== "cancelled" && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															handleStatusChangeClick(session, "cancelled")
														}
														title={t("cancel")}
													>
														<XCircle className="h-4 w-4" />
													</Button>
												)}
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleDeleteClick(session)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}

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
									name="date"
									control={editForm.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel>{t("date")}</FieldLabel>
											<Input type="date" {...field} />
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
								<div className="grid grid-cols-2 gap-4">
									<Controller
										name="startTime"
										control={editForm.control}
										render={({ field }) => (
											<Field>
												<FieldLabel>{t("startTime")}</FieldLabel>
												<Input type="time" {...field} value={field.value || ""} />
											</Field>
										)}
									/>
									<Controller
										name="endTime"
										control={editForm.control}
										render={({ field }) => (
											<Field>
												<FieldLabel>{t("endTime")}</FieldLabel>
												<Input type="time" {...field} value={field.value || ""} />
											</Field>
										)}
									/>
								</div>
								<Controller
									name="teacherId"
									control={editForm.control}
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
									name="groupId"
									control={editForm.control}
									render={({ field }) => (
										<Field>
											<FieldLabel>{t("group")}</FieldLabel>
											<Select
												value={field.value || "__none__"}
												onValueChange={(value) =>
													field.onChange(value === "__none__" ? null : value)
												}
											>
												<SelectTrigger>
													<SelectValue placeholder={t("selectGroup")} />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="__none__">
														{t("noGroup")}
													</SelectItem>
													{groups.map((group) => (
														<SelectItem key={group.id} value={group.id}>
															{group.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
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
												onValueChange={(value) =>
													field.onChange(value === "__none__" ? null : value)
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
							</FieldGroup>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsEditDialogOpen(false)}
								>
									{t("cancelButton")}
								</Button>
								<Button type="submit">{t("update")}</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>

				{/* Delete Dialog */}
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
							<AlertDialogCancel>{t("cancelButton")}</AlertDialogCancel>
							<AlertDialogAction onClick={handleDelete}>
								{t("delete")}
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
							<AlertDialogTitle>{t("statusChangeTitle")}</AlertDialogTitle>
							<AlertDialogDescription>
								{t("statusChangeDescription", {
									status: newStatus
										? t(`statusOptions.${newStatus}`)
										: "",
								})}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t("cancelButton")}</AlertDialogCancel>
							<AlertDialogAction onClick={handleStatusChange}>
								{t("changeStatus")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</AppLayout>
	);
}
