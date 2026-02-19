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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useForm } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Controller } from "react-hook-form";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Venue {
	id: string;
	name: string;
	address: string | null;
	createdAt: Date;
}

const venueSchema = z.object({
	name: z.string().min(1, "Name is required"),
	address: z.string().optional(),
});

type VenueFormData = z.infer<typeof venueSchema>;

export default function VenuesPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const t = useTranslations("Venues");
	const organizationId = params.id as string;

	const [venues, setVenues] = useState<Venue[]>([]);
	const [loading, setLoading] = useState(true);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

	const createForm = useForm<VenueFormData>({
		resolver: zodResolver(venueSchema),
		defaultValues: {
			name: "",
			address: "",
		},
	});

	const editForm = useForm<VenueFormData>({
		resolver: zodResolver(venueSchema),
		defaultValues: {
			name: "",
			address: "",
		},
	});

	useEffect(() => {
		if (session?.user && !sessionLoading) {
			loadVenues();
		}
	}, [session, sessionLoading, organizationId]);

	const loadVenues = async () => {
		try {
			setLoading(true);
			const response = await fetch(
				`/api/organizations/${organizationId}/venues`,
			);
			if (response.ok) {
				const data = await response.json();
				setVenues(data.venues || []);
			}
		} catch (error) {
			console.error("Failed to load venues:", error);
			toast.error("Failed to load venues");
		} finally {
			setLoading(false);
		}
	};

	const handleCreate = async (data: VenueFormData) => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/venues`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: data.name,
						address: data.address || null,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to create venue");
				return;
			}

			toast.success("Venue created successfully");
			setIsCreateDialogOpen(false);
			createForm.reset();
			await loadVenues();
		} catch (error) {
			console.error("Create venue error:", error);
			toast.error("An error occurred while creating the venue");
		}
	};

	const handleEdit = (venue: Venue) => {
		setSelectedVenue(venue);
		editForm.reset({
			name: venue.name,
			address: venue.address || "",
		});
		setIsEditDialogOpen(true);
	};

	const handleUpdate = async (data: VenueFormData) => {
		if (!selectedVenue) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/venues/${selectedVenue.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: data.name,
						address: data.address || null,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to update venue");
				return;
			}

			toast.success("Venue updated successfully");
			setIsEditDialogOpen(false);
			setSelectedVenue(null);
			await loadVenues();
		} catch (error) {
			console.error("Update venue error:", error);
			toast.error("An error occurred while updating the venue");
		}
	};

	const handleDeleteClick = (venue: Venue) => {
		setSelectedVenue(venue);
		setIsDeleteDialogOpen(true);
	};

	const handleDelete = async () => {
		if (!selectedVenue) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/venues/${selectedVenue.id}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to delete venue");
				return;
			}

			toast.success("Venue deleted successfully");
			setIsDeleteDialogOpen(false);
			setSelectedVenue(null);
			await loadVenues();
		} catch (error) {
			console.error("Delete venue error:", error);
			toast.error("An error occurred while deleting the venue");
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
							Manage venues in your organization
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
										name="address"
										control={createForm.control}
										render={({ field }) => (
											<Field>
												<FieldLabel>{t("address")}</FieldLabel>
												<Input {...field} />
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

				{/* Venues Table */}
				<div className="bg-white shadow rounded-lg">
					{loading ? (
						<div className="p-6 space-y-4">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					) : venues.length === 0 ? (
						<div className="p-6 text-center text-gray-500">{t("noVenues")}</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("name")}</TableHead>
									<TableHead className="hidden sm:table-cell">
										{t("address")}
									</TableHead>
									<TableHead className="hidden sm:table-cell">
										{t("createdAt")}
									</TableHead>
									<TableHead className="text-right">{t("actions")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{venues.map((venue) => (
									<TableRow key={venue.id}>
										<TableCell className="font-medium">{venue.name}</TableCell>
										<TableCell className="hidden sm:table-cell">
											{venue.address || "-"}
										</TableCell>
										<TableCell className="hidden sm:table-cell">
											{new Date(venue.createdAt).toLocaleDateString()}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleEdit(venue)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDeleteClick(venue)}
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
									name="address"
									control={editForm.control}
									render={({ field }) => (
										<Field>
											<FieldLabel>{t("address")}</FieldLabel>
											<Input {...field} />
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
									name: selectedVenue?.name ?? "",
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
