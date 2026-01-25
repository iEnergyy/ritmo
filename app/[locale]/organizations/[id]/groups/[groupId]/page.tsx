"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { useForm } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Controller } from "react-hook-form";
import {
	ArrowLeft,
	Plus,
	Pencil,
	Trash2,
	Play,
	Pause,
	X,
	CalendarIcon,
	CalendarDays,
	Clock,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { formatTime12h } from "@/lib/format-time";
import { cn } from "@/lib/utils";

interface Group {
	id: string;
	name: string;
	teacherId: string;
	venueId: string | null;
	status: "active" | "paused" | "closed";
	startedAt: Date | null;
	createdAt: Date;
	teacher?: {
		id: string;
		fullName: string;
	};
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

const sessionSchema = z.object({
	date: z.string().min(1, "Date is required"),
	startTime: z.string().optional().nullable(),
	endTime: z.string().optional().nullable(),
	teacherId: z.string().min(1, "Teacher is required"),
	venueId: z.string().optional().nullable(),
	status: z.enum(["scheduled", "held", "cancelled"]),
});

type SessionFormData = z.infer<typeof sessionSchema>;

type ScheduleItem = {
	recurrence: string;
	durationHours: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	slots: Array<{ dayOfWeek: number; startTime: string }>;
};

/** ISO day of week 1–7 (Monday=1) for local date string YYYY-MM-DD */
function getIsoDayOfWeek(dateStr: string): number {
	const d = new Date(dateStr + "T12:00:00");
	const js = d.getDay();
	return js === 0 ? 7 : js;
}

/** Add durationHours to "HH:mm" and return "HH:mm" */
function addHoursToTime(timeStr: string, durationHours: number): string {
	const [h, m] = timeStr.split(":").map(Number);
	const totalMins = h * 60 + m + Math.round(durationHours * 60);
	const outH = Math.floor(totalMins / 60) % 24;
	const outM = totalMins % 60;
	return `${String(outH).padStart(2, "0")}:${String(outM).padStart(2, "0")}`;
}

function getDefaultSessionTimes(
	dateStr: string,
	schedules: ScheduleItem[],
): { startTime: string; endTime: string } | null {
	if (schedules.length === 0) return null;
	const isoDay = getIsoDayOfWeek(dateStr);
	// Prefer a slot that matches the selected day
	for (const s of schedules) {
		if (dateStr < s.effectiveFrom) continue;
		if (s.effectiveTo != null && dateStr > s.effectiveTo) continue;
		const dur = Number(s.durationHours);
		if (!Number.isFinite(dur) || dur <= 0) continue;
		for (const slot of s.slots) {
			if (slot.dayOfWeek === isoDay) {
				return {
					startTime: slot.startTime,
					endTime: addHoursToTime(slot.startTime, dur),
				};
			}
		}
	}
	// Fallback: use first slot from first effective schedule so times are never empty
	for (const s of schedules) {
		if (dateStr < s.effectiveFrom) continue;
		if (s.effectiveTo != null && dateStr > s.effectiveTo) continue;
		const dur = Number(s.durationHours);
		if (!Number.isFinite(dur) || dur <= 0 || !s.slots.length) continue;
		const slot = s.slots[0];
		return {
			startTime: slot.startTime,
			endTime: addHoursToTime(slot.startTime, dur),
		};
	}
	return null;
}

/** Duration in hours from the schedule for the given date, or null */
function getScheduleDurationHours(
	dateStr: string,
	schedules: ScheduleItem[],
): number | null {
	for (const s of schedules) {
		if (dateStr < s.effectiveFrom) continue;
		if (s.effectiveTo != null && dateStr > s.effectiveTo) continue;
		const dur = Number(s.durationHours);
		if (Number.isFinite(dur) && dur > 0) return dur;
	}
	return null;
}

export default function GroupDetailPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const router = useRouter();
	const locale = useLocale();
	const t = useTranslations("GroupDetail");
	const tEnrollments = useTranslations("Enrollments");
	const tGroups = useTranslations("Groups");
	const tSessions = useTranslations("Sessions");
	const tGroupSchedule = useTranslations("GroupSchedule");
	const organizationId = params.id as string;
	const groupId = params.groupId as string;

	const [group, setGroup] = useState<Group | null>(null);
	const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [sessions, setSessions] = useState<any[]>([]);
	const [teachers, setTeachers] = useState<any[]>([]);
	const [venues, setVenues] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [showActiveOnly, setShowActiveOnly] = useState(true);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [isCreateSessionDialogOpen, setIsCreateSessionDialogOpen] =
		useState(false);
	const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
	const [schedules, setSchedules] = useState<
		Array<{
			recurrence: string;
			durationHours: string;
			effectiveFrom: string;
			effectiveTo: string | null;
			slots: Array<{ dayOfWeek: number; startTime: string }>;
		}>
	>([]);
	const [scheduleRecurrence, setScheduleRecurrence] = useState<
		"one_time" | "weekly" | "twice_weekly"
	>("weekly");
	const [scheduleDurationHours, setScheduleDurationHours] = useState("1");
	const [scheduleEffectiveFrom, setScheduleEffectiveFrom] = useState(
		() => new Date().toISOString().split("T")[0],
	);
	const [scheduleApplyToFutureOnly, setScheduleApplyToFutureOnly] =
		useState(false);
	const [scheduleSlots, setScheduleSlots] = useState<
		Array<{ dayOfWeek: number; startTime: string }>
	>([{ dayOfWeek: 1, startTime: "10:00" }]);
	const [scheduleSaving, setScheduleSaving] = useState(false);
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

	const sessionForm = useForm<SessionFormData>({
		resolver: zodResolver(sessionSchema),
		defaultValues: {
			date: new Date().toISOString().split("T")[0],
			startTime: null,
			endTime: null,
			teacherId: group?.teacherId || "",
			venueId: group?.venueId || null,
			status: "scheduled",
		},
	});

	// When create-session dialog opens or schedules load: default date and start/end from schedule
	const prevCreateSessionOpen = useRef(false);
	useEffect(() => {
		if (!group || !isCreateSessionDialogOpen) {
			prevCreateSessionOpen.current = isCreateSessionDialogOpen;
			return;
		}
		const today = new Date().toISOString().split("T")[0];
		const justOpened = !prevCreateSessionOpen.current;
		prevCreateSessionOpen.current = true;
		const dateToUse = justOpened
			? today
			: sessionForm.getValues("date") || today;
		const defaults = getDefaultSessionTimes(dateToUse, schedules);
		sessionForm.reset({
			date: dateToUse,
			startTime: defaults?.startTime ?? null,
			endTime: defaults?.endTime ?? null,
			teacherId: group.teacherId,
			venueId: group.venueId || null,
			status: "scheduled",
		});
	}, [group, isCreateSessionDialogOpen, schedules]);

	useEffect(() => {
		if (session?.user && !sessionLoading) {
			loadGroup();
			loadEnrollments();
			loadStudents();
			loadSessions();
			loadTeachers();
			loadVenues();
			loadSchedule();
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

	const loadSessions = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups/${groupId}/sessions`,
			);
			if (response.ok) {
				const data = await response.json();
				setSessions(data.sessions || []);
			}
		} catch (error) {
			console.error("Failed to load sessions:", error);
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

	const loadSchedule = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups/${groupId}/schedule`,
			);
			if (response.ok) {
				const data = await response.json();
				const list = (data.schedules || []).map(
					(s: {
						recurrence: string;
						durationHours: string;
						effectiveFrom: string;
						effectiveTo: string | null;
						slots: Array<{ dayOfWeek: number; startTime: string }>;
					}) => ({
						recurrence: s.recurrence,
						durationHours: s.durationHours,
						effectiveFrom: s.effectiveFrom,
						effectiveTo: s.effectiveTo ?? null,
						slots: s.slots || [],
					}),
				);
				setSchedules(list);
			}
		} catch (error) {
			console.error("Failed to load schedule:", error);
		}
	};

	const openScheduleDialog = (edit?: boolean) => {
		if (edit && schedules.length > 0) {
			const s = schedules[0];
			setScheduleRecurrence(
				s.recurrence as "one_time" | "weekly" | "twice_weekly",
			);
			setScheduleDurationHours(String(s.durationHours));
			setScheduleEffectiveFrom(s.effectiveFrom);
			setScheduleSlots(
				s.slots.length
					? s.slots.map((x) => ({
							dayOfWeek: x.dayOfWeek,
							startTime: x.startTime,
						}))
					: [{ dayOfWeek: 1, startTime: "10:00" }],
			);
			setScheduleApplyToFutureOnly(true);
		} else {
			setScheduleRecurrence("weekly");
			setScheduleDurationHours("1");
			setScheduleEffectiveFrom(new Date().toISOString().split("T")[0]);
			setScheduleApplyToFutureOnly(false);
			setScheduleSlots([{ dayOfWeek: 1, startTime: "10:00" }]);
		}
		setIsScheduleDialogOpen(true);
	};

	const handleSaveSchedule = async () => {
		const duration = Number.parseFloat(scheduleDurationHours);
		if (!Number.isFinite(duration) || duration <= 0) {
			toast.error(tGroupSchedule("durationHours") + " must be positive");
			return;
		}
		const slotCount = scheduleRecurrence === "twice_weekly" ? 2 : 1;
		const slots = Array.from(
			{ length: slotCount },
			(_, i) => scheduleSlots[i] ?? { dayOfWeek: 1, startTime: "10:00" },
		).map((s, i) => ({
			dayOfWeek: s.dayOfWeek,
			startTime: s.startTime,
			sortOrder: i,
		}));
		setScheduleSaving(true);
		try {
			const res = await fetch(
				`/api/organizations/${organizationId}/groups/${groupId}/schedule`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						recurrence: scheduleRecurrence,
						durationHours: duration,
						effectiveFrom: scheduleEffectiveFrom,
						applyToFutureOnly: scheduleApplyToFutureOnly,
						slots,
					}),
				},
			);
			if (!res.ok) {
				const err = await res.json();
				toast.error(err.error || "Failed to save schedule");
				return;
			}
			toast.success("Schedule saved");
			setIsScheduleDialogOpen(false);
			await loadSchedule();
		} catch (e) {
			console.error("Save schedule error:", e);
			toast.error("Failed to save schedule");
		} finally {
			setScheduleSaving(false);
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

	const handleCreateSession = async (data: SessionFormData) => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups/${groupId}/sessions`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						...data,
						groupId,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to create session");
				return;
			}

			toast.success("Session created successfully");
			setIsCreateSessionDialogOpen(false);
			sessionForm.reset();
			await loadSessions();
		} catch (error) {
			console.error("Create session error:", error);
			toast.error("An error occurred while creating the session");
		}
	};

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
							<strong>Teacher:</strong> {group.teacher?.fullName || "-"}
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
							{group.startedAt
								? new Date(group.startedAt).toLocaleDateString()
								: "-"}
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

				{/* Group Schedule */}
				<Card>
					<CardHeader>
						<div className="flex justify-between items-center">
							<div>
								<CardTitle>{tGroupSchedule("title")}</CardTitle>
								<CardDescription>
									{tGroupSchedule("description")}
								</CardDescription>
							</div>
							<Button
								variant={schedules.length ? "outline" : "default"}
								size="sm"
								onClick={() => openScheduleDialog(schedules.length > 0)}
							>
								<CalendarDays className="mr-2 h-4 w-4" />
								{schedules.length
									? tGroupSchedule("editSchedule")
									: tGroupSchedule("addSchedule")}
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{schedules.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{tGroupSchedule("noSchedule")}
							</p>
						) : (
							<div className="space-y-3">
								{schedules.map((s, i) => (
									<div
										key={i}
										className="rounded-lg border p-3 text-sm space-y-1"
									>
										<div>
											{tGroupSchedule("recurring")}:{" "}
											{s.recurrence === "one_time"
												? tGroupSchedule("oneTime")
												: s.recurrence === "twice_weekly"
													? tGroupSchedule("twiceWeekly")
													: tGroupSchedule("weekly")}
										</div>
										<div>
											{tGroupSchedule("durationHours")}: {s.durationHours}h
										</div>
										<div>
											{tGroupSchedule("effectiveFrom")}: {s.effectiveFrom}
											{s.effectiveTo ? ` – ${s.effectiveTo}` : ""}
										</div>
										{s.slots.length > 0 && (
											<div>
												{s.slots.map((slot, j) => (
													<span key={j} className="mr-3">
														{tGroupSchedule(`days.${slot.dayOfWeek}`)}{" "}
														{formatTime12h(slot.startTime, locale)}
													</span>
												))}
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Sessions */}
				<Card>
					<CardHeader>
						<div className="flex justify-between items-center">
							<div>
								<CardTitle>Sessions</CardTitle>
								<CardDescription>Class sessions for this group</CardDescription>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										router.push(
											`/organizations/${organizationId}/sessions?groupId=${groupId}`,
										)
									}
								>
									View All
								</Button>
								<Dialog
									open={isCreateSessionDialogOpen}
									onOpenChange={setIsCreateSessionDialogOpen}
								>
									<DialogTrigger asChild>
										<Button>
											<Plus className="mr-2 h-4 w-4" />
											Create Session
										</Button>
									</DialogTrigger>
									<DialogContent className="max-w-2xl">
										<DialogHeader>
											<DialogTitle>{tSessions("createTitle")}</DialogTitle>
											<DialogDescription>
												{tSessions("createDescription")}
											</DialogDescription>
										</DialogHeader>
										<form
											onSubmit={sessionForm.handleSubmit(handleCreateSession)}
										>
											<FieldGroup>
												<Controller
													name="date"
													control={sessionForm.control}
													render={({ field, fieldState }) => (
														<Field data-invalid={fieldState.invalid}>
															<FieldLabel>{tSessions("date")}</FieldLabel>
															<Popover>
																<PopoverTrigger asChild>
																	<Button
																		variant="outline"
																		type="button"
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
																			: tSessions("pickDate")}
																	</Button>
																</PopoverTrigger>
																<PopoverContent
																	className="w-auto p-0"
																	align="start"
																>
																	<Calendar
																		mode="single"
																		selected={
																			field.value
																				? new Date(field.value + "T12:00:00")
																				: undefined
																		}
																		onSelect={(d) => {
																			const dateStr = d
																				? format(d, "yyyy-MM-dd")
																				: "";
																			field.onChange(dateStr);
																			if (dateStr) {
																				const defaults = getDefaultSessionTimes(
																					dateStr,
																					schedules,
																				);
																				if (defaults) {
																					sessionForm.setValue(
																						"startTime",
																						defaults.startTime,
																					);
																					sessionForm.setValue(
																						"endTime",
																						defaults.endTime,
																					);
																				}
																			}
																		}}
																	/>
																</PopoverContent>
															</Popover>
															{fieldState.invalid && (
																<FieldError errors={[fieldState.error]} />
															)}
														</Field>
													)}
												/>
												<div className="grid grid-cols-2 gap-4">
													<Controller
														name="startTime"
														control={sessionForm.control}
														render={({ field }) => {
															const formDate =
																sessionForm.getValues("date") ||
																new Date().toISOString().split("T")[0];
															const durationHours = getScheduleDurationHours(
																formDate,
																schedules,
															);
															return (
																<Field>
																	<FieldLabel>
																		{tSessions("startTime")}
																	</FieldLabel>
																	<div className="relative">
																		<Clock className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
																		<Input
																			type="time"
																			{...field}
																			value={field.value || ""}
																			className="pl-8 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
																			onChange={(e) => {
																				const v = e.target.value || null;
																				field.onChange(v);
																				if (
																					v &&
																					durationHours != null &&
																					durationHours > 0
																				) {
																					sessionForm.setValue(
																						"endTime",
																						addHoursToTime(v, durationHours),
																					);
																				}
																			}}
																		/>
																	</div>
																</Field>
															);
														}}
													/>
													<Controller
														name="endTime"
														control={sessionForm.control}
														render={({ field }) => (
															<Field>
																<FieldLabel>{tSessions("endTime")}</FieldLabel>
																<div className="relative">
																	<Clock className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
																	<Input
																		type="time"
																		{...field}
																		value={field.value || ""}
																		className="pl-8 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
																	/>
																</div>
															</Field>
														)}
													/>
												</div>
												<Controller
													name="teacherId"
													control={sessionForm.control}
													render={({ field, fieldState }) => (
														<Field data-invalid={fieldState.invalid}>
															<FieldLabel>{tSessions("teacher")}</FieldLabel>
															<Select
																value={field.value}
																onValueChange={field.onChange}
															>
																<SelectTrigger>
																	<SelectValue
																		placeholder={tSessions("selectTeacher")}
																	/>
																</SelectTrigger>
																<SelectContent>
																	{teachers.map((teacher) => (
																		<SelectItem
																			key={teacher.id}
																			value={teacher.id}
																		>
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
													control={sessionForm.control}
													render={({ field }) => (
														<Field>
															<FieldLabel>{tSessions("venue")}</FieldLabel>
															<Select
																value={field.value || "__none__"}
																onValueChange={(value) =>
																	field.onChange(
																		value === "__none__" ? null : value,
																	)
																}
															>
																<SelectTrigger>
																	<SelectValue
																		placeholder={tSessions("selectVenue")}
																	/>
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="__none__">
																		{tSessions("noVenue")}
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
													control={sessionForm.control}
													render={({ field }) => (
														<Field>
															<FieldLabel>{tSessions("status")}</FieldLabel>
															<Select
																value={field.value}
																onValueChange={field.onChange}
															>
																<SelectTrigger>
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="scheduled">
																		{tSessions("statusOptions.scheduled")}
																	</SelectItem>
																	<SelectItem value="held">
																		{tSessions("statusOptions.held")}
																	</SelectItem>
																	<SelectItem value="cancelled">
																		{tSessions("statusOptions.cancelled")}
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
													onClick={() => setIsCreateSessionDialogOpen(false)}
												>
													{tSessions("cancelButton")}
												</Button>
												<Button type="submit">{tSessions("create")}</Button>
											</DialogFooter>
										</form>
									</DialogContent>
								</Dialog>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{sessions.length === 0 ? (
							<p className="text-sm text-gray-500">
								No sessions for this group yet.
							</p>
						) : (
							<div className="space-y-2">
								{sessions.slice(0, 5).map((session) => (
									<div
										key={session.id}
										className="flex items-center justify-between p-3 border rounded-lg"
									>
										<div>
											<div className="font-medium">
												{format(new Date(session.date), "PPP")}
											</div>
											<div className="text-sm text-gray-500">
												{session.teacher.fullName}
												{session.startTime &&
													` • ${formatTime12h(session.startTime, locale)}${session.endTime ? ` - ${formatTime12h(session.endTime, locale)}` : ""}`}
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Badge
												variant={
													session.status === "held"
														? "default"
														: session.status === "cancelled"
															? "secondary"
															: "outline"
												}
											>
												{tSessions(`statusOptions.${session.status}`)}
											</Badge>
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													router.push(
														`/organizations/${organizationId}/sessions/${session.id}`,
													)
												}
											>
												View
											</Button>
										</div>
									</div>
								))}
								{sessions.length > 5 && (
									<Button
										variant="outline"
										className="w-full"
										onClick={() =>
											router.push(
												`/organizations/${organizationId}/sessions?groupId=${groupId}`,
											)
										}
									>
										View All {sessions.length} Sessions
									</Button>
								)}
							</div>
						)}
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
													render={({ field, fieldState }) => {
														// Parse date string to local date (avoid timezone issues)
														const dateValue = field.value
															? (() => {
																	const [year, month, day] = field.value
																		.split("-")
																		.map(Number);
																	return new Date(year, month - 1, day);
																})()
															: undefined;
														return (
															<Field data-invalid={fieldState.invalid}>
																<FieldLabel>
																	{tEnrollments("startDate")}
																</FieldLabel>
																<Popover>
																	<PopoverTrigger asChild>
																		<Button
																			variant="outline"
																			className={cn(
																				"w-full justify-start text-left font-normal",
																				!dateValue && "text-muted-foreground",
																			)}
																		>
																			<CalendarIcon className="mr-2 h-4 w-4" />
																			{dateValue ? (
																				format(dateValue, "PPP")
																			) : (
																				<span>Pick a date</span>
																			)}
																		</Button>
																	</PopoverTrigger>
																	<PopoverContent
																		className="w-auto p-0"
																		align="start"
																	>
																		<Calendar
																			mode="single"
																			selected={dateValue}
																			onSelect={(date) => {
																				if (date) {
																					// Format as YYYY-MM-DD in local timezone
																					const year = date.getFullYear();
																					const month = String(
																						date.getMonth() + 1,
																					).padStart(2, "0");
																					const day = String(
																						date.getDate(),
																					).padStart(2, "0");
																					field.onChange(
																						`${year}-${month}-${day}`,
																					);
																				} else {
																					field.onChange("");
																				}
																			}}
																		/>
																	</PopoverContent>
																</Popover>
																{fieldState.invalid && (
																	<FieldError errors={[fieldState.error]} />
																)}
															</Field>
														);
													}}
												/>
												<Controller
													name="endDate"
													control={enrollmentForm.control}
													render={({ field }) => {
														// Parse date string to local date (avoid timezone issues)
														const dateValue = field.value
															? (() => {
																	const [year, month, day] = field.value
																		.split("-")
																		.map(Number);
																	return new Date(year, month - 1, day);
																})()
															: undefined;
														return (
															<Field>
																<FieldLabel>
																	{tEnrollments("endDateOptional")}
																</FieldLabel>
																<Popover>
																	<PopoverTrigger asChild>
																		<Button
																			variant="outline"
																			className={cn(
																				"w-full justify-start text-left font-normal",
																				!dateValue && "text-muted-foreground",
																			)}
																		>
																			<CalendarIcon className="mr-2 h-4 w-4" />
																			{dateValue ? (
																				format(dateValue, "PPP")
																			) : (
																				<span>Pick a date</span>
																			)}
																		</Button>
																	</PopoverTrigger>
																	<PopoverContent
																		className="w-auto p-0"
																		align="start"
																	>
																		<Calendar
																			mode="single"
																			selected={dateValue}
																			onSelect={(date) => {
																				if (date) {
																					// Format as YYYY-MM-DD in local timezone
																					const year = date.getFullYear();
																					const month = String(
																						date.getMonth() + 1,
																					).padStart(2, "0");
																					const day = String(
																						date.getDate(),
																					).padStart(2, "0");
																					field.onChange(
																						`${year}-${month}-${day}`,
																					);
																				} else {
																					field.onChange(null);
																				}
																			}}
																		/>
																	</PopoverContent>
																</Popover>
															</Field>
														);
													}}
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
									render={({ field, fieldState }) => {
										// Parse date string to local date (avoid timezone issues)
										const dateValue = field.value
											? (() => {
													const [year, month, day] = field.value
														.split("-")
														.map(Number);
													return new Date(year, month - 1, day);
												})()
											: undefined;
										return (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel>{tEnrollments("startDate")}</FieldLabel>
												<Popover>
													<PopoverTrigger asChild>
														<Button
															variant="outline"
															className={cn(
																"w-full justify-start text-left font-normal",
																!dateValue && "text-muted-foreground",
															)}
														>
															<CalendarIcon className="mr-2 h-4 w-4" />
															{dateValue ? (
																format(dateValue, "PPP")
															) : (
																<span>Pick a date</span>
															)}
														</Button>
													</PopoverTrigger>
													<PopoverContent className="w-auto p-0" align="start">
														<Calendar
															mode="single"
															selected={dateValue}
															onSelect={(date) => {
																if (date) {
																	// Format as YYYY-MM-DD in local timezone
																	const year = date.getFullYear();
																	const month = String(
																		date.getMonth() + 1,
																	).padStart(2, "0");
																	const day = String(date.getDate()).padStart(
																		2,
																		"0",
																	);
																	field.onChange(`${year}-${month}-${day}`);
																} else {
																	field.onChange("");
																}
															}}
														/>
													</PopoverContent>
												</Popover>
												{fieldState.invalid && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										);
									}}
								/>
								<Controller
									name="endDate"
									control={editEnrollmentForm.control}
									render={({ field }) => {
										// Parse date string to local date (avoid timezone issues)
										const dateValue = field.value
											? (() => {
													const [year, month, day] = field.value
														.split("-")
														.map(Number);
													return new Date(year, month - 1, day);
												})()
											: undefined;
										return (
											<Field>
												<FieldLabel>
													{tEnrollments("endDateOptional")}
												</FieldLabel>
												<Popover>
													<PopoverTrigger asChild>
														<Button
															variant="outline"
															className={cn(
																"w-full justify-start text-left font-normal",
																!dateValue && "text-muted-foreground",
															)}
														>
															<CalendarIcon className="mr-2 h-4 w-4" />
															{dateValue ? (
																format(dateValue, "PPP")
															) : (
																<span>Pick a date</span>
															)}
														</Button>
													</PopoverTrigger>
													<PopoverContent className="w-auto p-0" align="start">
														<Calendar
															mode="single"
															selected={dateValue}
															onSelect={(date) => {
																if (date) {
																	// Format as YYYY-MM-DD in local timezone
																	const year = date.getFullYear();
																	const month = String(
																		date.getMonth() + 1,
																	).padStart(2, "0");
																	const day = String(date.getDate()).padStart(
																		2,
																		"0",
																	);
																	field.onChange(`${year}-${month}-${day}`);
																} else {
																	field.onChange(null);
																}
															}}
														/>
													</PopoverContent>
												</Popover>
											</Field>
										);
									}}
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

				{/* Group Schedule Dialog */}
				<Dialog
					open={isScheduleDialogOpen}
					onOpenChange={setIsScheduleDialogOpen}
				>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>{tGroupSchedule("title")}</DialogTitle>
							<DialogDescription>
								{tGroupSchedule("description")}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 pt-2">
							<div>
								<label className="text-sm font-medium mb-1 block">
									{tGroupSchedule("recurring")}
								</label>
								<Select
									value={scheduleRecurrence}
									onValueChange={(
										v: "one_time" | "weekly" | "twice_weekly",
									) => {
										setScheduleRecurrence(v);
										if (v === "twice_weekly" && scheduleSlots.length < 2) {
											setScheduleSlots((prev) =>
												[...prev, { dayOfWeek: 3, startTime: "10:00" }].slice(
													0,
													2,
												),
											);
										} else if (v !== "twice_weekly") {
											setScheduleSlots((prev) => prev.slice(0, 1));
										}
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="one_time">
											{tGroupSchedule("oneTime")}
										</SelectItem>
										<SelectItem value="weekly">
											{tGroupSchedule("weekly")}
										</SelectItem>
										<SelectItem value="twice_weekly">
											{tGroupSchedule("twiceWeekly")}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<label className="text-sm font-medium mb-1 block">
									{tGroupSchedule("durationHours")}
								</label>
								<Input
									type="number"
									min={0.25}
									step={0.25}
									placeholder={tGroupSchedule("durationHoursPlaceholder")}
									value={scheduleDurationHours}
									onChange={(e) => setScheduleDurationHours(e.target.value)}
								/>
							</div>
							<div>
								<Label className="text-sm font-medium mb-1 block">
									{tGroupSchedule("effectiveFrom")}
								</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"w-full justify-start text-left font-normal",
												!scheduleEffectiveFrom && "text-muted-foreground",
											)}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{scheduleEffectiveFrom
												? format(
														new Date(scheduleEffectiveFrom + "T12:00:00"),
														"PPP",
													)
												: tGroupSchedule("pickDate")}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0">
										<Calendar
											mode="single"
											selected={
												scheduleEffectiveFrom
													? new Date(scheduleEffectiveFrom + "T12:00:00")
													: undefined
											}
											onSelect={(d) =>
												setScheduleEffectiveFrom(
													d ? format(d, "yyyy-MM-dd") : "",
												)
											}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
							<div className="flex items-start gap-2 space-y-0">
								<Checkbox
									id="apply-future"
									checked={scheduleApplyToFutureOnly}
									onCheckedChange={(v) =>
										setScheduleApplyToFutureOnly(v === true)
									}
									className="mt-1"
									aria-describedby="apply-future-description"
								/>
								<div className="grid gap-1.5 leading-none">
									<Label
										htmlFor="apply-future"
										className="text-sm font-medium cursor-pointer"
									>
										{tGroupSchedule("applyToFutureOnly")}
									</Label>
									<p
										id="apply-future-description"
										className="text-xs text-muted-foreground"
									>
										{tGroupSchedule("applyToFutureOnlyDescription")}
									</p>
								</div>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium block">
									{tGroupSchedule("dayOfWeek")} / {tGroupSchedule("startTime")}
								</label>
								{Array.from(
									{ length: scheduleRecurrence === "twice_weekly" ? 2 : 1 },
									(_, i) =>
										scheduleSlots[i] ?? { dayOfWeek: 1, startTime: "10:00" },
								).map((slot, i) => (
									<div
										key={`schedule-slot-${i}-${slot.dayOfWeek}-${slot.startTime}`}
										className="flex gap-2 items-center"
									>
										<Select
											value={String(slot.dayOfWeek)}
											onValueChange={(v) =>
												setScheduleSlots((prev) => {
													const next = [...prev];
													while (next.length <= i)
														next.push({ dayOfWeek: 1, startTime: "10:00" });
													next[i] = { ...next[i], dayOfWeek: Number(v) };
													return next;
												})
											}
										>
											<SelectTrigger className="w-[140px]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{[1, 2, 3, 4, 5, 6, 7].map((d) => (
													<SelectItem key={d} value={String(d)}>
														{tGroupSchedule(`days.${d}`)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<div className="relative">
											<Clock className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
											<Input
												type="time"
												value={slot.startTime}
												onChange={(e) =>
													setScheduleSlots((prev) => {
														const next = [...prev];
														while (next.length <= i)
															next.push({ dayOfWeek: 1, startTime: "10:00" });
														next[i] = { ...next[i], startTime: e.target.value };
														return next;
													})
												}
												className="pl-8 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
											/>
										</div>
									</div>
								))}
							</div>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsScheduleDialogOpen(false)}
							>
								{tSessions("cancelButton")}
							</Button>
							<Button onClick={handleSaveSchedule} disabled={scheduleSaving}>
								{scheduleSaving ? "..." : tGroupSchedule("save")}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</AppLayout>
	);
}
