"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

interface Member {
	memberId: string;
	userId: string;
	userEmail: string;
	userName: string | null;
	role: "admin" | "teacher" | "staff" | null;
	createdAt: Date;
}

interface Invitation {
	id: string;
	email: string;
	role: string | null;
	status: string;
	expiresAt: Date;
	createdAt: Date;
}

export default function OrganizationMembersPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const router = useRouter();
	const params = useParams();
	const t = useTranslations("OrganizationMembers");
	const organizationId = params.id as string;

	const [members, setMembers] = useState<Member[]>([]);
	const [invitations, setInvitations] = useState<Invitation[]>([]);
	const [loading, setLoading] = useState(true);
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<"admin" | "teacher" | "staff">(
		"staff",
	);
	const [inviting, setInviting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
	const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

	useEffect(() => {
		if (session?.user && !sessionLoading) {
			loadMembers();
			loadInvitations();
		}
	}, [session, sessionLoading, organizationId]);

	const loadMembers = async () => {
		try {
			const response = await fetch(`/api/organizations/${organizationId}/members`);
			if (response.ok) {
				const data = await response.json();
				setMembers(data.members || []);
			}
		} catch (error) {
			console.error("Failed to load members:", error);
		} finally {
			setLoading(false);
		}
	};

	const loadInvitations = async () => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/invitations`,
			);
			if (response.ok) {
				const data = await response.json();
				setInvitations(data.invitations || []);
			}
		} catch (error) {
			console.error("Failed to load invitations:", error);
		}
	};

	const handleInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setInviting(true);

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/invitations`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						email: inviteEmail,
						role: inviteRole,
					}),
				},
			);

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || "Failed to send invitation");
				return;
			}

			// Reset form and reload invitations
			setInviteEmail("");
			setInviteRole("staff");
			await loadInvitations();
		} catch (error) {
			setError("An error occurred while sending the invitation");
			console.error("Invite error:", error);
		} finally {
			setInviting(false);
		}
	};

	const handleRemoveMember = async () => {
		if (!memberToRemove) return;

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/members/${memberToRemove}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const data = await response.json();
				setError(data.error || "Failed to remove member");
				return;
			}

			setRemoveDialogOpen(false);
			setMemberToRemove(null);
			await loadMembers();
		} catch (error) {
			console.error("Remove member error:", error);
			setError("An error occurred while removing the member");
		}
	};

	const openRemoveDialog = (memberId: string) => {
		setMemberToRemove(memberId);
		setRemoveDialogOpen(true);
	};

	const handleUpdateRole = async (
		memberId: string,
		newRole: "admin" | "teacher" | "staff",
	) => {
		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/members/${memberId}/role`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ role: newRole }),
				},
			);

			if (!response.ok) {
				const data = await response.json();
				setError(data.error || "Failed to update role");
				return;
			}

			await loadMembers();
		} catch (error) {
			console.error("Update role error:", error);
			setError("An error occurred while updating the role");
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
				<div>
					<h1 className="text-3xl font-bold">Organization Members</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Manage members and invite new users to your organization
					</p>
				</div>

				{/* Invite New Member */}
				<Card>
					<CardHeader>
						<CardTitle>Invite New Member</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleInvite} className="space-y-4">
							{error && (
								<div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
									{error}
								</div>
							)}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<Field>
									<FieldLabel htmlFor="email">Email</FieldLabel>
									<Input
										id="email"
										type="email"
										required
										value={inviteEmail}
										onChange={(e) => setInviteEmail(e.target.value)}
										placeholder="user@example.com"
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="role">Role</FieldLabel>
									<Select
										value={inviteRole}
										onValueChange={(value) =>
											setInviteRole(value as "admin" | "teacher" | "staff")
										}
									>
										<SelectTrigger id="role">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="staff">Staff</SelectItem>
											<SelectItem value="teacher">Teacher</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
										</SelectContent>
									</Select>
								</Field>
								<div className="flex items-end">
									<Button type="submit" disabled={inviting} className="w-full">
										{inviting ? "Sending..." : "Send Invitation"}
									</Button>
								</div>
							</div>
						</form>
					</CardContent>
				</Card>

				{/* Current Members */}
				<Card>
					<CardHeader>
						<CardTitle>Current Members</CardTitle>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div>Loading...</div>
						) : members.length === 0 ? (
							<div className="text-muted-foreground">No members yet</div>
						) : (
							<div className="space-y-4">
								{members.map((member) => (
									<div
										key={member.memberId}
										className="flex justify-between items-center p-4 border rounded-lg"
									>
										<div>
											<div className="font-semibold">
												{member.userName || member.userEmail}
											</div>
											<div className="text-sm text-muted-foreground">
												{member.userEmail}
											</div>
											<div className="text-sm text-muted-foreground">
												Role: {member.role || "member"}
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Select
												value={member.role || "staff"}
												onValueChange={(value) =>
													handleUpdateRole(
														member.memberId,
														value as "admin" | "teacher" | "staff",
													)
												}
											>
												<SelectTrigger className="w-[140px]">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="staff">Staff</SelectItem>
													<SelectItem value="teacher">Teacher</SelectItem>
													<SelectItem value="admin">Admin</SelectItem>
												</SelectContent>
											</Select>
											<Button
												variant="destructive"
												size="sm"
												onClick={() => openRemoveDialog(member.memberId)}
											>
												Remove
											</Button>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Pending Invitations */}
				<Card>
					<CardHeader>
						<CardTitle>Pending Invitations</CardTitle>
					</CardHeader>
					<CardContent>
						{invitations.length === 0 ? (
							<div className="text-muted-foreground">No pending invitations</div>
						) : (
							<div className="space-y-4">
								{invitations.map((invitation) => (
									<div
										key={invitation.id}
										className="flex justify-between items-center p-4 border rounded-lg"
									>
										<div>
											<div className="font-semibold">{invitation.email}</div>
											<div className="text-sm text-muted-foreground">
												Role: {invitation.role || "staff"} • Status:{" "}
												{invitation.status}
											</div>
											<div className="text-xs text-muted-foreground">
												Expires:{" "}
												{new Date(invitation.expiresAt).toLocaleDateString()}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Remove Member Confirmation Dialog */}
				<AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Remove Member</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to remove this member? This action cannot be
								undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel onClick={() => setMemberToRemove(null)}>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction onClick={handleRemoveMember} variant="destructive">
								Remove
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</AppLayout>
	);
}


