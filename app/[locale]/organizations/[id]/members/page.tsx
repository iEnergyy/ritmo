"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

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

	const handleRemoveMember = async (memberId: string) => {
		if (!confirm("Are you sure you want to remove this member?")) {
			return;
		}

		try {
			const response = await fetch(
				`/api/organizations/${organizationId}/members/${memberId}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const data = await response.json();
				alert(data.error || "Failed to remove member");
				return;
			}

			await loadMembers();
		} catch (error) {
			console.error("Remove member error:", error);
			alert("An error occurred while removing the member");
		}
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
				alert(data.error || "Failed to update role");
				return;
			}

			await loadMembers();
		} catch (error) {
			console.error("Update role error:", error);
			alert("An error occurred while updating the role");
		}
	};

	if (sessionLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-lg">Loading...</div>
			</div>
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
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				<div className="px-4 py-6 sm:px-0">
					<div className="mb-6">
						<Link
							href="/dashboard"
							className="text-blue-600 hover:text-blue-500 underline"
						>
							← Back to Dashboard
						</Link>
					</div>

					<h1 className="text-3xl font-bold mb-6">Organization Members</h1>

					{/* Invite New Member */}
					<div className="bg-white shadow rounded-lg p-6 mb-6">
						<h2 className="text-xl font-bold mb-4">Invite New Member</h2>
						<form onSubmit={handleInvite} className="space-y-4">
							{error && (
								<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
									{error}
								</div>
							)}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label
										htmlFor="email"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										Email
									</label>
									<input
										id="email"
										type="email"
										required
										value={inviteEmail}
										onChange={(e) => setInviteEmail(e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
										placeholder="user@example.com"
									/>
								</div>
								<div>
									<label
										htmlFor="role"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										Role
									</label>
									<select
										id="role"
										value={inviteRole}
										onChange={(e) =>
											setInviteRole(
												e.target.value as "admin" | "teacher" | "staff",
											)
										}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									>
										<option value="staff">Staff</option>
										<option value="teacher">Teacher</option>
										<option value="admin">Admin</option>
									</select>
								</div>
								<div className="flex items-end">
									<button
										type="submit"
										disabled={inviting}
										className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{inviting ? "Sending..." : "Send Invitation"}
									</button>
								</div>
							</div>
						</form>
					</div>

					{/* Current Members */}
					<div className="bg-white shadow rounded-lg p-6 mb-6">
						<h2 className="text-xl font-bold mb-4">Current Members</h2>
						{loading ? (
							<div>Loading...</div>
						) : members.length === 0 ? (
							<div className="text-gray-500">No members yet</div>
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
											<div className="text-sm text-gray-600">
												{member.userEmail}
											</div>
											<div className="text-sm text-gray-500">
												Role: {member.role || "member"}
											</div>
										</div>
										<div className="flex items-center gap-2">
											<select
												value={member.role || "staff"}
												onChange={(e) =>
													handleUpdateRole(
														member.memberId,
														e.target.value as
															| "admin"
															| "teacher"
															| "staff",
													)
												}
												className="px-3 py-1 border border-gray-300 rounded-md text-sm"
											>
												<option value="staff">Staff</option>
												<option value="teacher">Teacher</option>
												<option value="admin">Admin</option>
											</select>
											<button
												onClick={() => handleRemoveMember(member.memberId)}
												className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
											>
												Remove
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Pending Invitations */}
					<div className="bg-white shadow rounded-lg p-6">
						<h2 className="text-xl font-bold mb-4">Pending Invitations</h2>
						{invitations.length === 0 ? (
							<div className="text-gray-500">No pending invitations</div>
						) : (
							<div className="space-y-4">
								{invitations.map((invitation) => (
									<div
										key={invitation.id}
										className="flex justify-between items-center p-4 border rounded-lg"
									>
										<div>
											<div className="font-semibold">{invitation.email}</div>
											<div className="text-sm text-gray-500">
												Role: {invitation.role || "staff"} • Status:{" "}
												{invitation.status}
											</div>
											<div className="text-xs text-gray-400">
												Expires:{" "}
												{new Date(invitation.expiresAt).toLocaleDateString()}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}


