"use client";

import { useSession, authClient } from "@/lib/auth-client";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter, locales } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import {
	Users,
	GraduationCap,
	UserCog,
	MapPin,
	LayoutDashboard,
	LogOut,
	Globe,
	Building2,
	ChevronDown,
	CheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
	readonly children: React.ReactNode;
	readonly organizationId?: string;
}

export function AppLayout({ children, organizationId }: AppLayoutProps) {
	const { data: session, isPending } = useSession();
	const router = useRouter();
	const locale = useLocale();
	const pathname = usePathname();
	const navT = useTranslations("Navigation");
	const langT = useTranslations("LanguageSwitcher");
	const [organizations, setOrganizations] = useState<any[]>([]);
	const [activeOrg, setActiveOrg] = useState<any>(null);

	useEffect(() => {
		if (session?.user && !isPending) {
			loadOrganizations();
		}
	}, [session, isPending]);

	useEffect(() => {
		if (organizations.length > 0 && session?.session?.activeOrganizationId) {
			const org = organizations.find(
				(org) => org.id === session.session.activeOrganizationId,
			);
			setActiveOrg(org);
		} else if (organizations.length > 0 && !session?.session?.activeOrganizationId) {
			// Auto-set first organization
			const firstOrg = organizations[0];
			authClient.organization
				.setActive({ organizationId: firstOrg.id })
				.then(() => {
					globalThis.location.reload();
				});
		}
	}, [organizations, session]);

	const loadOrganizations = async () => {
		try {
			const result = await authClient.organization.list();
			if (result.data) {
				setOrganizations(result.data);
			}
		} catch (error) {
			console.error("Failed to load organizations:", error);
		}
	};

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/");
	};

	const switchLocale = (newLocale: string) => {
		// Use router.push with locale option to properly update the URL
		router.push(pathname, { locale: newLocale });
	};

	const handleOrgSwitch = async (orgId: string) => {
		await authClient.organization.setActive({ organizationId: orgId });
		globalThis.location.reload();
	};

	if (isPending) {
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

	const navigation = organizationId
		? [
				{
					name: "Dashboard",
					href: `/organizations/${organizationId}`,
					icon: LayoutDashboard,
				},
				{
					name: "Students",
					href: `/organizations/${organizationId}/students`,
					icon: GraduationCap,
				},
				{
					name: "Teachers",
					href: `/organizations/${organizationId}/teachers`,
					icon: UserCog,
				},
				{
					name: "Venues",
					href: `/organizations/${organizationId}/venues`,
					icon: MapPin,
				},
				{
					name: "Members",
					href: `/organizations/${organizationId}/members`,
					icon: Users,
				},
			]
		: [];

	return (
		<SidebarProvider>
			<Sidebar collapsible="icon">
				<SidebarHeader>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" asChild>
								<a href="/">
									<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
										<span className="text-lg font-bold">C</span>
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">Cadence</span>
									</div>
								</a>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>

				<SidebarContent>
					{/* Organization Switcher */}
					{organizations.length > 0 && (
						<SidebarGroup>
							<SidebarGroupLabel>Organization</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<SidebarMenuButton
													tooltip={activeOrg?.name || "Select organization"}
													className="w-full data-[collapsible=icon]:justify-center"
												>
													<div className="flex items-center gap-2 min-w-0 flex-1">
														<Building2 className="shrink-0" />
														<span className="truncate group-data-[collapsible=icon]:hidden">
															{activeOrg?.name || "Select organization"}
														</span>
													</div>
													<ChevronDown className="ml-auto shrink-0 group-data-[collapsible=icon]:hidden" />
												</SidebarMenuButton>
											</DropdownMenuTrigger>
											<DropdownMenuContent
												side="right"
												align="start"
												className="w-56"
											>
												{organizations.map((org) => (
													<DropdownMenuItem
														key={org.id}
														onClick={() => handleOrgSwitch(org.id)}
														className={cn(
															"cursor-pointer",
															activeOrg?.id === org.id && "bg-accent"
														)}
													>
														{org.name}
														{activeOrg?.id === org.id && (
															<CheckIcon className="ml-auto" />
														)}
													</DropdownMenuItem>
												))}
											</DropdownMenuContent>
										</DropdownMenu>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					)}

					{/* Navigation */}
					{organizationId && navigation.length > 0 && (
						<SidebarGroup>
							<SidebarGroupLabel>Navigation</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{navigation.map((item) => {
										const isActive = pathname === item.href;
										return (
											<SidebarMenuItem key={item.name}>
												<SidebarMenuButton
													asChild
													isActive={isActive}
													tooltip={item.name}
												>
													<Link href={item.href}>
														<item.icon />
														<span>{item.name}</span>
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										);
									})}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					)}
				</SidebarContent>

				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<div className="px-2 py-1.5 text-xs text-sidebar-foreground/70">
								<p className="font-medium truncate">
									{session.user.name || session.user.email}
								</p>
								<p className="truncate text-xs">{session.user.email}</p>
							</div>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton
								onClick={handleSignOut}
								tooltip={navT("signOut")}
							>
								<LogOut />
								<span>{navT("signOut")}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>

			<SidebarInset>
				<header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<div className="flex items-center gap-2 ml-auto">
						<Select value={locale} onValueChange={switchLocale}>
							<SelectTrigger className="w-[160px]">
								<Globe className="h-4 w-4 mr-2" />
								<SelectValue>
									{locale.toUpperCase()} -{" "}
									{locale === "es" ? langT("spanish") : langT("english")}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{locales.map((loc) => (
									<SelectItem key={loc} value={loc}>
										{loc.toUpperCase()} -{" "}
										{loc === "es" ? langT("spanish") : langT("english")}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</header>
				<main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-8">
					{children}
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}

