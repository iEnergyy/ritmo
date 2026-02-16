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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, ClipboardCheck } from "lucide-react";

interface AttendanceRecord {
	id: string;
	classSessionId: string;
	studentId: string;
	status: "present" | "absent" | "excused" | "late";
	markedAt: string;
	session: {
		id: string;
		date: string;
		group: { id: string; name: string } | null;
	};
	student: { id: string; fullName: string };
}

interface SessionWithMissing {
	id: string;
	date: string;
	status: string;
	group: { id: string; name: string } | null;
}

export default function AttendancePage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const router = useRouter();
	const t = useTranslations("Attendance");
	const tNav = useTranslations("Navigation");
	const tSession = useTranslations("SessionDetail");
	const organizationId = params.id as string;

	const [records, setRecords] = useState<AttendanceRecord[]>([]);
	const [missingSessions, setMissingSessions] = useState<SessionWithMissing[]>(
		[],
	);
	const [loading, setLoading] = useState(true);
	const [missingLoading, setMissingLoading] = useState(true);
	const [dateFrom, setDateFrom] = useState<string>("");
	const [dateTo, setDateTo] = useState<string>("");
	const [statusFilter, setStatusFilter] = useState<string>("all");

	useEffect(() => {
		if (session?.user && !sessionLoading && organizationId) {
			loadRecords();
		}
	}, [session, sessionLoading, organizationId, dateFrom, dateTo, statusFilter]);

	useEffect(() => {
		if (session?.user && !sessionLoading && organizationId) {
			loadMissing();
		}
	}, [session, sessionLoading, organizationId]);

	async function loadRecords() {
		try {
			setLoading(true);
			const url = new URL(
				`/api/organizations/${organizationId}/attendance`,
				window.location.origin,
			);
			if (dateFrom) url.searchParams.set("dateFrom", dateFrom);
			if (dateTo) url.searchParams.set("dateTo", dateTo);
			if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
			const res = await fetch(url.toString());
			if (res.ok) {
				const data = await res.json();
				setRecords(data.records ?? []);
			}
		} catch (e) {
			console.error("Failed to load attendance:", e);
			toast.error("Failed to load attendance");
		} finally {
			setLoading(false);
		}
	}

	async function loadMissing() {
		try {
			setMissingLoading(true);
			const res = await fetch(
				`/api/organizations/${organizationId}/attendance/missing`,
			);
			if (res.ok) {
				const data = await res.json();
				setMissingSessions(data.sessions ?? []);
			}
		} catch (e) {
			console.error("Failed to load missing attendance:", e);
		} finally {
			setMissingLoading(false);
		}
	}

	function getStatusBadgeVariant(
		status: string,
	): "default" | "secondary" | "destructive" | "outline" {
		switch (status) {
			case "present":
				return "default";
			case "absent":
				return "destructive";
			case "excused":
				return "secondary";
			case "late":
				return "outline";
			default:
				return "outline";
		}
	}

	if (!session?.user && !sessionLoading) {
		router.push("/signin");
		return null;
	}

	if (sessionLoading) {
		return (
			<AppLayout organizationId={organizationId}>
				<div className="flex items-center justify-center p-8">
					<Skeleton className="h-8 w-48" />
				</div>
			</AppLayout>
		);
	}

	return (
		<AppLayout organizationId={organizationId}>
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						{tNav("attendance")}
					</h1>
					<p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
				</div>

				{/* Missing attendance */}
				<Card>
					<CardHeader>
						<CardTitle>{t("missingAttendanceTitle")}</CardTitle>
						<CardDescription>
							{t("missingAttendanceDescription")}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{missingLoading ? (
							<Skeleton className="h-24 w-full" />
						) : missingSessions.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{t("noSessionsWithMissing")}
							</p>
						) : (
							<ul className="space-y-2">
								{missingSessions.map((s) => (
									<li key={s.id}>
										<Link
											href={`/organizations/${organizationId}/sessions/${s.id}`}
											className="flex items-center gap-2 text-blue-600 hover:text-blue-500"
										>
											<CalendarIcon className="h-4 w-4" />
											{format(new Date(s.date), "PPP")}
											{s.group && (
												<span className="text-gray-500">— {s.group.name}</span>
											)}
										</Link>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				{/* Filters */}
				<Card>
					<CardHeader>
						<CardTitle>{t("title")}</CardTitle>
						<CardDescription>{t("subtitle")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap gap-4">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium">{t("dateFrom")}</label>
								<Input
									type="date"
									value={dateFrom}
									onChange={(e) => setDateFrom(e.target.value)}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium">{t("dateTo")}</label>
								<Input
									type="date"
									value={dateTo}
									onChange={(e) => setDateTo(e.target.value)}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium">{t("status")}</label>
								<Select value={statusFilter} onValueChange={setStatusFilter}>
									<SelectTrigger className="w-[140px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">{t("all")}</SelectItem>
										<SelectItem value="present">
											{tSession("statusPresent")}
										</SelectItem>
										<SelectItem value="absent">
											{tSession("statusAbsent")}
										</SelectItem>
										<SelectItem value="excused">
											{tSession("statusExcused")}
										</SelectItem>
										<SelectItem value="late">
											{tSession("statusLate")}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Table */}
				<Card>
					<CardContent className="pt-6">
						{loading ? (
							<Skeleton className="h-64 w-full" />
						) : records.length === 0 ? (
							<p className="text-sm text-muted-foreground">{t("noRecords")}</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t("date")}</TableHead>
										<TableHead>{t("session")}</TableHead>
										<TableHead>{t("student")}</TableHead>
										<TableHead>{t("status")}</TableHead>
										<TableHead>{t("markedAt")}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{records.map((r) => (
										<TableRow key={r.id}>
											<TableCell>
												{format(new Date(r.session.date), "PPP")}
											</TableCell>
											<TableCell>
												<Link
													href={`/organizations/${organizationId}/sessions/${r.classSessionId}`}
													className="text-blue-600 hover:text-blue-500"
												>
													{r.session.group?.name ?? "—"}
												</Link>
											</TableCell>
											<TableCell>
												<Link
													href={`/organizations/${organizationId}/students/${r.studentId}`}
													className="text-blue-600 hover:text-blue-500"
												>
													{r.student.fullName}
												</Link>
											</TableCell>
											<TableCell>
												<Badge variant={getStatusBadgeVariant(r.status)}>
													{r.status}
												</Badge>
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{format(new Date(r.markedAt), "PPp")}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}
