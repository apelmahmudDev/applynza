import { ShieldCheck } from "lucide-react";

import {
	UserIdentityBadge,
	useUserIdentity,
} from "@/components/user-identity-badge";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useDashboardReminderCount } from "@/modules/dashboard/hooks/use-dashboard-reminder-count";
import {
	dashboardNavSections,
	type DashboardView,
} from "@/modules/dashboard/navigation";

type DashboardSidebarProps = {
	activeView: DashboardView;
	onViewChange: (view: DashboardView) => void;
};

export function DashboardSidebar({
	activeView,
	onViewChange,
}: DashboardSidebarProps) {
	const { isMobile, setOpenMobile } = useSidebar();
	const logoSrc = browser.runtime.getURL("/logo.png");
	const userProfile = useUserIdentity();
	const reminderCount = useDashboardReminderCount();
	const collapsedMenuButtonClass =
		"group-data-[collapsible=icon]:h-auto! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:flex-col! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:px-1! group-data-[collapsible=icon]:py-2.5! group-data-[collapsible=icon]:text-center group-data-[collapsible=icon]:[&>span]:overflow-visible group-data-[collapsible=icon]:[&>span]:text-clip group-data-[collapsible=icon]:[&>span]:whitespace-normal group-data-[collapsible=icon]:[&>span]:text-center group-data-[collapsible=icon]:[&>span]:text-[11px] group-data-[collapsible=icon]:[&>span]:leading-4";

	function handleViewChange(view: DashboardView) {
		onViewChange(view);
		if (isMobile) {
			setOpenMobile(false);
		}
	}

	return (
		<Sidebar collapsible="icon" variant="sidebar">
			<SidebarHeader className="px-3 pb-2 pt-4">
				<div className="flex items-center gap-3 rounded-lg px-1.5 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
					<img
						src={logoSrc}
						alt=""
						className="h-10 w-auto shrink-0 rounded-xs group-data-[collapsible=icon]:h-11"
						aria-hidden="true"
					/>
					<div className="min-w-0 group-data-[collapsible=icon]:hidden">
						<h1 className="truncate text-lg font-bold tracking-normal">
							Applynza
						</h1>
						<p className="truncate text-xs font-semibold text-slate-500">
							Job application tracker
						</p>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent className="px-2 group-data-[collapsible=icon]:px-1.5">
				{dashboardNavSections.map((section) => (
					<SidebarGroup key={section.label} className="px-1">
						<SidebarGroupLabel className="px-2 text-[11px] font-bold uppercase tracking-normal">
							{section.label}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu className="gap-1">
								{section.items.map((item) => {
									const Icon = item.icon;
									const isActive = activeView === item.value;
									const badgeCount =
										item.value === "reminders" ? reminderCount : null;

									return (
										<SidebarMenuItem key={item.value}>
											<SidebarMenuButton
												type="button"
												size="lg"
												isActive={isActive}
												className={cn(
													"h-10 rounded-md font-bold",
													badgeCount && "pr-3",
													"group-data-[collapsible=icon]:px-1!",
													collapsedMenuButtonClass,
													isActive
														? "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary dark:bg-[#323232] dark:text-foreground dark:hover:bg-[#323232] dark:hover:text-foreground"
														: "dark-hover-surface text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-muted-foreground dark:hover:text-foreground",
												)}
												onClick={() => handleViewChange(item.value)}
											>
												<Icon
													className="size-4 group-data-[collapsible=icon]:size-5"
													aria-hidden="true"
												/>
												<span className="flex-1">{item.label}</span>
												{badgeCount ? (
													<div
														className={cn(
															"ml-auto flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums ring-1 ring-inset transition-colors group-data-[collapsible=icon]:hidden",
															isActive
																? "bg-primary text-primary-foreground ring-primary/20"
																: "bg-primary text-primary-foreground ring-primary/15 shadow-[0_1px_2px_color-mix(in_srgb,var(--primary)_22%,transparent)]",
														)}
													>
														{badgeCount}
													</div>
												) : null}
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>

			<SidebarFooter className="px-3 pb-4 pt-4">
				<div className="rounded-lg bg-slate-50 px-3 py-3 dark:border dark:border-border/70 dark:bg-[#2c2c2c] group-data-[collapsible=icon]:hidden">
					<div className="flex items-start gap-2">
						<ShieldCheck
							className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-muted-foreground"
							aria-hidden="true"
						/>
						<div className="min-w-0">
							<p className="text-sm font-bold text-slate-800 dark:text-foreground">
								All your data is stored locally in your browser.
							</p>
							<p className="mt-1 text-xs leading-5 text-slate-500 dark:text-muted-foreground">
								No account. No tracking. 100% private.
							</p>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-3 rounded-lg bg-slate-100 p-3 dark:border dark:border-border/70 dark:bg-[#2c2c2c] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
					<UserIdentityBadge identity={userProfile} />
					<div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
						<p className="truncate text-sm font-bold text-slate-800 dark:text-foreground">
							{userProfile.name}
						</p>
						<p className="truncate text-xs font-semibold text-slate-500 dark:text-muted-foreground">
							{userProfile.role}
						</p>
					</div>
					<p className="shrink-0 text-xs font-semibold text-slate-400 dark:text-muted-foreground/80 group-data-[collapsible=icon]:hidden">
						{userProfile.version}
					</p>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
