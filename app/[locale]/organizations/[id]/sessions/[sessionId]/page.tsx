"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
	ArrowLeft,
	Pencil,
	Trash2,
	CheckCircle,
	XCircle,
	Clock,
	Info,
} from "lucide-react";
import { format } from "date-fns";
import { formatTime12h } from "@/lib/format-time";

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

export default function SessionDetailPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const router = useRouter();
	const locale = useLocale();
	const t = useTranslations("SessionDetail");
	const tSessions = useTranslations("Sessions");
	const organizationId = params.id as string;
	const sessionId = params.sessionId as string;

	const [classSession, setClassSession] = useState<ClassSession | null>(null);
	const [loading, setLoading] = useState(true);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [newStatus, setNewStatus] = useState<
		"scheduled" | "held" | "cancelled" | null
	>(null);

	useEffect(() => {
		if (session?.user && !sessionLoading) {
			loadSession();
		}
	}, [session, sessionLoading, organizationId, sessionId]);

	const loadSession = async () => {
		try {
			setLoading(true);
			const response = await fetch(
				`/api/organizations/${organizationId}/sessions/${sessionId}`,
			);
			if (response.ok) {
				const data = await response.json();
				setClassSession(data.session);
			} else {
				toast.error("Failed to load session");
				router.push(`/organizations/${organizationId}/sessions`);
			}
		} catch (error) {
			console.error("Failed to load session:", error);
			toast.error("Failed to load session");
		} finally {
			setLoading(false);
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
				`/api/organizations/${organizationId}/sessions/${sessionId}/status`,
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
			setNewStatus(null);
			await loadSession();
		} catch (error) {
			console.error("Status change error:", error);
			toast.error("An error occurred while updating the status");
		}
	};

	const handleDelete = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/sessions/${sessionId}`,
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
			router.push(`/organizations/${organizationId}/sessions`);
		} catch (error) {
			console.error("Delete session error:", error);
			toast.error("An error occurred while deleting the session");
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

	const formatTime = (time: string | null) =>
		formatTime12h(time, locale) || tSessions("noTime");

	const formatDate = (dateStr: string) => {
		try {
			const date = new Date(dateStr);
			return format(date, "PPP");
		} catch {
			return dateStr;
		}
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

	if (!classSession) {
		return (
			<AppLayout organizationId={organizationId}>
				<div className="text-center py-12">
					<p className="text-gray-500">Session not found</p>
					<Button
						variant="outline"
						onClick={() =>
							router.push(`/organizations/${organizationId}/sessions`)
						}
						className="mt-4"
					>
						{t("backToSessions")}
					</Button>
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
						size="sm"
						onClick={() =>
							router.push(`/organizations/${organizationId}/sessions`)
						}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						{t("backToSessions")}
					</Button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							{t("title")}
						</h1>
						<p className="mt-2 text-sm text-gray-600">
							Session details and management
						</p>
					</div>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					{/* Session Info Card */}
					<Card>
						<CardHeader>
							<CardTitle>{t("sessionInfo")}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<label className="text-sm font-medium text-gray-500">
									{tSessions("date")}
								</label>
								<p className="mt-1 text-lg">{formatDate(classSession.date)}</p>
							</div>
							{(classSession.startTime || classSession.endTime) && (
								<div>
									<label className="text-sm font-medium text-gray-500">
										{tSessions("time")}
									</label>
									<p className="mt-1 text-lg">
										{classSession.startTime && classSession.endTime
											? `${formatTime(classSession.startTime)} - ${formatTime(classSession.endTime)}`
											: classSession.startTime
												? formatTime(classSession.startTime)
												: tSessions("noTime")}
									</p>
								</div>
							)}
							<div>
								<label className="text-sm font-medium text-gray-500">
									{tSessions("group")}
								</label>
								<p className="mt-1 text-lg">
									{classSession.group ? (
										<Link
											href={`/organizations/${organizationId}/groups/${classSession.group.id}`}
											className="text-blue-600 hover:text-blue-500"
										>
											{classSession.group.name}
										</Link>
									) : (
										tSessions("noGroup")
									)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-500">
									{tSessions("teacher")}
								</label>
								<p className="mt-1 text-lg">
									<Link
										href={`/organizations/${organizationId}/teachers`}
										className="text-blue-600 hover:text-blue-500"
									>
										{classSession.teacher.fullName}
									</Link>
								</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-500">
									{tSessions("venue")}
								</label>
								<p className="mt-1 text-lg">
									{classSession.venue ? (
										<Link
											href={`/organizations/${organizationId}/venues`}
											className="text-blue-600 hover:text-blue-500"
										>
											{classSession.venue.name}
										</Link>
									) : (
										tSessions("noVenue")
									)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-500">
									{tSessions("status")}
								</label>
								<div className="mt-1">
									<Badge variant={getStatusBadgeVariant(classSession.status)}>
										{getStatusIcon(classSession.status)}
										<span className="ml-1">
											{tSessions(`statusOptions.${classSession.status}`)}
										</span>
									</Badge>
								</div>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-500">
									{tSessions("createdAt")}
								</label>
								<p className="mt-1 text-sm text-gray-600">
									{formatDate(classSession.createdAt)}
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Status Management Card */}
					<Card>
						<CardHeader>
							<CardTitle>{t("statusManagement")}</CardTitle>
							<CardDescription>{t("changeStatus")}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{classSession.status === "scheduled" && (
								<Button
									className="w-full"
									onClick={() => handleStatusChangeClick("held")}
								>
									<CheckCircle className="mr-2 h-4 w-4" />
									{tSessions("markAsHeld")}
								</Button>
							)}
							{classSession.status !== "cancelled" && (
								<Button
									variant="destructive"
									className="w-full"
									onClick={() => handleStatusChangeClick("cancelled")}
								>
									<XCircle className="mr-2 h-4 w-4" />
									{tSessions("cancel")}
								</Button>
							)}
							{classSession.status === "cancelled" && (
								<Button
									variant="outline"
									className="w-full"
									onClick={() => handleStatusChangeClick("scheduled")}
								>
									<Clock className="mr-2 h-4 w-4" />
									{tSessions("reschedule")}
								</Button>
							)}
							<div className="pt-4 border-t">
								<div className="flex items-start gap-2 text-sm text-gray-600">
									<Info className="h-4 w-4 mt-0.5" />
									<p>{t("immutableHistoryDescription")}</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Attendance Records Placeholder */}
				<Card>
					<CardHeader>
						<CardTitle>{t("attendanceRecords")}</CardTitle>
						<CardDescription>
							{t("attendancePlaceholder")}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-gray-500">{t("noAttendanceRecords")}</p>
					</CardContent>
				</Card>

				{/* Actions */}
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() =>
							router.push(
								`/organizations/${organizationId}/sessions/${sessionId}/edit`,
							)
						}
					>
						<Pencil className="mr-2 h-4 w-4" />
						{t("editSession")}
					</Button>
					<Button
						variant="destructive"
						onClick={() => setIsDeleteDialogOpen(true)}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						{t("deleteSession")}
					</Button>
				</div>

				{/* Delete Dialog */}
				<AlertDialog
					open={isDeleteDialogOpen}
					onOpenChange={setIsDeleteDialogOpen}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								{tSessions("deleteTitle")}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{tSessions("deleteDescription")}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{tSessions("cancelButton")}</AlertDialogCancel>
							<AlertDialogAction onClick={handleDelete}>
								{tSessions("delete")}
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
								{tSessions("statusChangeTitle")}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{tSessions("statusChangeDescription", {
									status: newStatus
										? tSessions(`statusOptions.${newStatus}`)
										: "",
								})}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{tSessions("cancelButton")}</AlertDialogCancel>
							<AlertDialogAction onClick={handleStatusChange}>
								{tSessions("changeStatus")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</AppLayout>
	);
}
