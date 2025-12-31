"use client";

import { useSession } from "@/lib/auth-client";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import {
	GraduationCap,
	UserCog,
	MapPin,
	Users,
	ArrowRight,
} from "lucide-react";

interface Stats {
	students: number;
	teachers: number;
	venues: number;
	members: number;
}

export default function OrganizationDashboardPage() {
	const { data: session, isPending: sessionLoading } = useSession();
	const params = useParams();
	const t = useTranslations("Dashboard");
	const organizationId = params.id as string;

	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (session?.user && !sessionLoading && organizationId) {
			loadStats();
		}
	}, [session, sessionLoading, organizationId]);

	const loadStats = async () => {
		try {
			setLoading(true);
			const [studentsRes, teachersRes, venuesRes, membersRes] = await Promise.all([
				fetch(`/api/organizations/${organizationId}/students`).catch(() => null),
				fetch(`/api/organizations/${organizationId}/teachers`).catch(() => null),
				fetch(`/api/organizations/${organizationId}/venues`).catch(() => null),
				fetch(`/api/organizations/${organizationId}/members`).catch(() => null),
			]);

			const stats: Stats = {
				students: 0,
				teachers: 0,
				venues: 0,
				members: 0,
			};

			if (studentsRes?.ok) {
				const data = await studentsRes.json();
				stats.students = data.students?.length || 0;
			}
			if (teachersRes?.ok) {
				const data = await teachersRes.json();
				stats.teachers = data.teachers?.length || 0;
			}
			if (venuesRes?.ok) {
				const data = await venuesRes.json();
				stats.venues = data.venues?.length || 0;
			}
			if (membersRes?.ok) {
				const data = await membersRes.json();
				stats.members = data.members?.length || 0;
			}

			setStats(stats);
		} catch (error) {
			console.error("Failed to load stats:", error);
		} finally {
			setLoading(false);
		}
	};

	if (sessionLoading) {
		return (
			<AppLayout organizationId={organizationId}>
				<div className="space-y-6">
					<Skeleton className="h-8 w-64" />
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{[...Array(4)].map((_, i) => (
							<Skeleton key={i} className="h-32" />
						))}
					</div>
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

	const statCards = [
		{
			title: "Students",
			value: stats?.students ?? 0,
			icon: GraduationCap,
			href: `/organizations/${organizationId}/students`,
			color: "bg-green-500",
		},
		{
			title: "Teachers",
			value: stats?.teachers ?? 0,
			icon: UserCog,
			href: `/organizations/${organizationId}/teachers`,
			color: "bg-purple-500",
		},
		{
			title: "Venues",
			value: stats?.venues ?? 0,
			icon: MapPin,
			href: `/organizations/${organizationId}/venues`,
			color: "bg-orange-500",
		},
		{
			title: "Members",
			value: stats?.members ?? 0,
			icon: Users,
			href: `/organizations/${organizationId}/members`,
			color: "bg-blue-500",
		},
	];

	return (
		<AppLayout organizationId={organizationId}>
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
					<p className="mt-2 text-sm text-gray-600">
						Overview of your organization
					</p>
				</div>

				{loading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{[...Array(4)].map((_, i) => (
							<Skeleton key={i} className="h-32" />
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{statCards.map((card) => (
							<Link key={card.title} href={card.href}>
								<Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium text-gray-600">
												{card.title}
											</p>
											<p className="mt-2 text-3xl font-bold text-gray-900">
												{card.value}
											</p>
										</div>
										<div
											className={`${card.color} p-3 rounded-lg text-white`}
										>
											<card.icon className="h-6 w-6" />
										</div>
									</div>
									<div className="mt-4 flex items-center text-sm text-gray-500">
										View all
										<ArrowRight className="ml-2 h-4 w-4" />
									</div>
								</Card>
							</Link>
						))}
					</div>
				)}

				{/* Quick Actions */}
				<Card className="p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">
						Quick Actions
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<Link href={`/organizations/${organizationId}/students`}>
							<Button variant="outline" className="w-full justify-start">
								<GraduationCap className="mr-2 h-4 w-4" />
								Add Student
							</Button>
						</Link>
						<Link href={`/organizations/${organizationId}/teachers`}>
							<Button variant="outline" className="w-full justify-start">
								<UserCog className="mr-2 h-4 w-4" />
								Add Teacher
							</Button>
						</Link>
						<Link href={`/organizations/${organizationId}/venues`}>
							<Button variant="outline" className="w-full justify-start">
								<MapPin className="mr-2 h-4 w-4" />
								Add Venue
							</Button>
						</Link>
						<Link href={`/organizations/${organizationId}/members`}>
							<Button variant="outline" className="w-full justify-start">
								<Users className="mr-2 h-4 w-4" />
								Invite Member
							</Button>
						</Link>
					</div>
				</Card>
			</div>
		</AppLayout>
	);
}

