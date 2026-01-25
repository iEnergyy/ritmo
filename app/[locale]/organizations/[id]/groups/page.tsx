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
	Search,
	Eye,
	Play,
	Pause,
	X,
	CalendarIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
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

interface Venue {
	id: string;
	name: string;
	address: string | null;
}

interface Teacher {
	id: string;
	fullName: string;
}

const groupSchema = z.object({
	name: z.string().min(1, "Name is required"),
	teacherId: z.string().min(1, "Teacher is required"),
	venueId: z.string().optional().nullable(),
	status: z.enum(["active", "paused", "closed"]),
	startedAt: z.string().optional().nullable(),
});

type GroupFormData = z.infer<typeof groupSchema>;

export default function GroupsPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const router = useRouter();
	const t = useTranslations("Groups");
	const organizationId = params.id as string;

	const [groups, setGroups] = useState<Group[]>([]);
	const [venues, setVenues] = useState<Venue[]>([]);
	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
	const [newStatus, setNewStatus] = useState<
		"active" | "paused" | "closed" | null
	>(null);

	const createForm = useForm<GroupFormData>({
		resolver: zodResolver(groupSchema),
		defaultValues: {
			name: "",
			teacherId: "",
			venueId: null,
			status: "active",
			startedAt: null,
		},
	});

	const editForm = useForm<GroupFormData>({
		resolver: zodResolver(groupSchema),
		defaultValues: {
			name: "",
			teacherId: "",
			venueId: null,
			status: "active",
			startedAt: null,
		},
	});

	useEffect(() => {
		if (session?.user && !sessionLoading) {
			loadGroups();
			loadVenues();
			loadTeachers();
		}
	}, [session, sessionLoading, organizationId, searchQuery, statusFilter]);

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

	const loadGroups = async () => {
		try {
			setLoading(true);
			const url = new URL(
				`/api/organizations/${organizationId}/groups`,
				window.location.origin,
			);
			if (searchQuery) {
				url.searchParams.set("search", searchQuery);
			}
			if (statusFilter !== "all") {
				url.searchParams.set("status", statusFilter);
			}

			const response = await fetch(url.toString());
			if (response.ok) {
				const data = await response.json();
				setGroups(data.groups || []);
			}
		} catch (error) {
			console.error("Failed to load groups:", error);
			toast.error("Failed to load groups");
		} finally {
			setLoading(false);
		}
	};

	const handleCreate = async (data: GroupFormData) => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: data.name,
						teacherId: data.teacherId,
						venueId: data.venueId || null,
						status: data.status,
						startedAt: data.startedAt || null,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to create group");
				return;
			}

			toast.success("Group created successfully");
			setIsCreateDialogOpen(false);
			createForm.reset();
			await loadGroups();
		} catch (error) {
			console.error("Create group error:", error);
			toast.error("An error occurred while creating the group");
		}
	};

	const handleEdit = (group: Group) => {
		setSelectedGroup(group);
		// Convert date to YYYY-MM-DD format avoiding timezone issues
		let startedAtString: string | null = null;
		if (group.startedAt) {
			const date = new Date(group.startedAt);
			// Use local date components to avoid timezone offset
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			startedAtString = `${year}-${month}-${day}`;
		}
		editForm.reset({
			name: group.name,
			teacherId: group.teacherId,
			venueId: group.venueId || null,
			status: group.status,
			startedAt: startedAtString,
		});
		setIsEditDialogOpen(true);
	};

	const handleUpdate = async (data: GroupFormData) => {
		if (!selectedGroup) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups/${selectedGroup.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: data.name,
						teacherId: data.teacherId,
						venueId: data.venueId || null,
						status: data.status,
						startedAt: data.startedAt || null,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to update group");
				return;
			}

			toast.success("Group updated successfully");
			setIsEditDialogOpen(false);
			setSelectedGroup(null);
			await loadGroups();
		} catch (error) {
			console.error("Update group error:", error);
			toast.error("An error occurred while updating the group");
		}
	};

	const handleDeleteClick = (group: Group) => {
		setSelectedGroup(group);
		setIsDeleteDialogOpen(true);
	};

	const handleDelete = async () => {
		if (!selectedGroup) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups/${selectedGroup.id}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(
					errorData.error || errorData.activeEnrollmentsCount
						? `Cannot delete group with ${errorData.activeEnrollmentsCount} active enrollments`
						: "Failed to delete group",
				);
				return;
			}

			toast.success("Group deleted successfully");
			setIsDeleteDialogOpen(false);
			setSelectedGroup(null);
			await loadGroups();
		} catch (error) {
			console.error("Delete group error:", error);
			toast.error("An error occurred while deleting the group");
		}
	};

	const handleStatusChangeClick = (
		group: Group,
		status: "active" | "paused" | "closed",
	) => {
		setSelectedGroup(group);
		setNewStatus(status);
		setIsStatusDialogOpen(true);
	};

	const handleStatusChange = async () => {
		if (!selectedGroup || !newStatus) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/groups/${selectedGroup.id}/status`,
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
			setSelectedGroup(null);
			setNewStatus(null);
			await loadGroups();
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

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "active":
				return <Play className="h-3 w-3" />;
			case "paused":
				return <Pause className="h-3 w-3" />;
			case "closed":
				return <X className="h-3 w-3" />;
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

	return (
		<AppLayout organizationId={organizationId}>
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
						<p className="mt-2 text-sm text-gray-600">
							Manage groups in your organization
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
								<FieldGroup>
									<Controller
										name="name"
										control={createForm.control}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel>{t("name")}</FieldLabel>
												<Input {...field} />
												{fieldState.invalid && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>
									<Controller
										name="teacherId"
										control={createForm.control}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel>Teacher</FieldLabel>
												<Select
													value={field.value}
													onValueChange={field.onChange}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select teacher" />
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
														<SelectItem value="active">
															{t("statusOptions.active")}
														</SelectItem>
														<SelectItem value="paused">
															{t("statusOptions.paused")}
														</SelectItem>
														<SelectItem value="closed">
															{t("statusOptions.closed")}
														</SelectItem>
													</SelectContent>
												</Select>
											</Field>
										)}
									/>
									<Controller
										name="startedAt"
										control={createForm.control}
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
													<FieldLabel>{t("createdAt")}</FieldLabel>
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
													{fieldState.invalid && (
														<FieldError errors={[fieldState.error]} />
													)}
												</Field>
											);
										}}
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

				{/* Search and Filter */}
				<div className="flex gap-4">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<Input
							type="text"
							placeholder={t("searchPlaceholder")}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Filter by status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="active">
								{t("statusOptions.active")}
							</SelectItem>
							<SelectItem value="paused">
								{t("statusOptions.paused")}
							</SelectItem>
							<SelectItem value="closed">
								{t("statusOptions.closed")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Groups Table */}
				<div className="bg-white shadow rounded-lg">
					{loading ? (
						<div className="p-6 space-y-4">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					) : groups.length === 0 ? (
						<div className="p-6 text-center text-gray-500">{t("noGroups")}</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("name")}</TableHead>
									<TableHead>Teacher</TableHead>
									<TableHead>{t("venue")}</TableHead>
									<TableHead>{t("status")}</TableHead>
									<TableHead>{t("createdAt")}</TableHead>
									<TableHead className="text-right">{t("actions")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{groups.map((group) => (
									<TableRow key={group.id}>
										<TableCell className="font-medium">
											<Link
												href={`/organizations/${organizationId}/groups/${group.id}`}
												className="hover:underline"
											>
												{group.name}
											</Link>
										</TableCell>
										<TableCell>{group.teacher?.fullName || "-"}</TableCell>
										<TableCell>{group.venue?.name || t("noVenue")}</TableCell>
										<TableCell>
											<Badge variant={getStatusBadgeVariant(group.status)}>
												{getStatusIcon(group.status)}
												{t(`statusOptions.${group.status}`)}
											</Badge>
										</TableCell>
										<TableCell>
											{group.startedAt
												? new Date(group.startedAt).toLocaleDateString()
												: "-"}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Button
													variant="ghost"
													size="icon"
													onClick={() =>
														router.push(
															`/organizations/${organizationId}/groups/${group.id}`,
														)
													}
													title={t("viewDetails")}
												>
													<Eye className="h-4 w-4" />
												</Button>
												{group.status !== "active" && (
													<Button
														variant="ghost"
														size="icon"
														onClick={() =>
															handleStatusChangeClick(group, "active")
														}
														title={t("activate")}
													>
														<Play className="h-4 w-4" />
													</Button>
												)}
												{group.status !== "paused" && (
													<Button
														variant="ghost"
														size="icon"
														onClick={() =>
															handleStatusChangeClick(group, "paused")
														}
														title={t("pause")}
													>
														<Pause className="h-4 w-4" />
													</Button>
												)}
												{group.status !== "closed" && (
													<Button
														variant="ghost"
														size="icon"
														onClick={() =>
															handleStatusChangeClick(group, "closed")
														}
														title={t("close")}
													>
														<X className="h-4 w-4" />
													</Button>
												)}
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleEdit(group)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDeleteClick(group)}
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
									name="name"
									control={editForm.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel>{t("name")}</FieldLabel>
											<Input {...field} />
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
								<Controller
									name="teacherId"
									control={editForm.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel>Teacher</FieldLabel>
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select teacher" />
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
								<Controller
									name="status"
									control={editForm.control}
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
													<SelectItem value="active">
														{t("statusOptions.active")}
													</SelectItem>
													<SelectItem value="paused">
														{t("statusOptions.paused")}
													</SelectItem>
													<SelectItem value="closed">
														{t("statusOptions.closed")}
													</SelectItem>
												</SelectContent>
											</Select>
										</Field>
									)}
								/>
								<Controller
									name="startedAt"
									control={editForm.control}
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
												<FieldLabel>{t("createdAt")}</FieldLabel>
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
												{fieldState.invalid && (
													<FieldError errors={[fieldState.error]} />
												)}
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
									name: selectedGroup?.name ?? "",
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

				{/* Status Change Confirmation Dialog */}
				<AlertDialog
					open={isStatusDialogOpen}
					onOpenChange={setIsStatusDialogOpen}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t("statusChangeTitle")}</AlertDialogTitle>
							<AlertDialogDescription>
								{t("statusChangeDescription", {
									name: selectedGroup?.name ?? "",
									status: newStatus ? t(`statusOptions.${newStatus}`) : "",
								})}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
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
