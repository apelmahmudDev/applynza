import type { ReactNode } from "react";
import {
	ArrowLeft,
	ChevronDown,
	LayoutDashboard,
	PlusCircle,
	UserRound,
} from "lucide-react";

import {
	UserIdentityBadge,
} from "@/components/user-identity-badge";
import { ProfileSyncMenuItems } from "@/components/profile-sync-menu-items";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { openDashboard } from "@/lib/open-dashboard";
import { cn } from "@/lib/utils";
import { useSyncAccount } from "@/modules/dashboard/hooks/use-sync-account";

type SidePanelLayoutProps = {
	children: ReactNode;
	contentClassName?: string;
	header?: ReactNode;
	footer?: ReactNode;
};

type SidePanelTopBarProps = {
	leftSlot?: ReactNode;
	title?: string;
	onBack?: () => void;
	onAddJob?: () => void;
	rightSlot?: ReactNode;
};

export function SidePanelLayout({
	children,
	contentClassName,
	header,
	footer,
}: SidePanelLayoutProps) {
	return (
		<div className="relative flex min-h-0 flex-1 flex-col">
			{header}
			<div
				className={cn(
					"min-h-0 flex-1 overflow-y-auto px-3 pb-10 pt-3 sm:px-4",
					contentClassName,
				)}
			>
				{children}
			</div>
			<div className="px-4">
				<SidePanelFadeDivider />
			</div>
			<footer className="shrink-0 bg-white px-4 pt-1 pb-0.5 text-center backdrop-blur dark:bg-background">
				{footer ?? (
					<p className="text-[10px] text-muted-foreground/80">
						All your job data is stored locally in your browser.
					</p>
				)}
			</footer>
		</div>
	);
}

export function SidePanelTopBar({
	leftSlot,
	title,
	onBack,
	onAddJob,
	rightSlot,
}: SidePanelTopBarProps) {
	const { user } = useSyncAccount();
	const profileName = user
		? user.displayName ?? user.email ?? "Signed in"
		: "Not signed in";
	const resolvedLeftSlot = leftSlot ?? (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					className="h-auto min-w-0 justify-start gap-3 rounded-xl px-1.5 py-1.5 text-left hover:bg-transparent hover:text-foreground focus-visible:border-transparent focus-visible:ring-0 aria-expanded:bg-transparent aria-expanded:text-foreground"
					aria-label={`Open profile menu for ${profileName}`}
				>
					{user ? (
						<UserIdentityBadge
							name={profileName}
							className="size-7 border border-border/70 text-[10px]"
						/>
					) : (
						<span
							className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted text-muted-foreground"
							aria-hidden="true"
						>
							<UserRound className="size-4" />
						</span>
					)}
					<span className="min-w-0">
						<span className="block truncate text-sm font-semibold text-foreground">
							{profileName}
						</span>
						<span className="sr-only">
							{user ? "Signed in" : "Local workspace"}
						</span>
					</span>
					<ChevronDown
						className="size-3.5 shrink-0 text-muted-foreground"
						aria-hidden="true"
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				side="bottom"
				sideOffset={8}
				className="w-64 rounded-xl p-1.5"
			>
				<DropdownMenuLabel className="px-3 py-2">
					<p className="truncate text-sm font-semibold text-foreground">
						{profileName}
					</p>
					<p className="mt-0.5 text-xs font-normal text-muted-foreground">
						{user ? "Signed in" : "Local workspace"}
					</p>
				</DropdownMenuLabel>
				<ProfileSyncMenuItems />
			</DropdownMenuContent>
		</DropdownMenu>
	);

	return (
		<TooltipProvider delayDuration={120}>
			<div className="sticky top-0 z-10 bg-white backdrop-blur-xl dark:bg-background">
				<div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
					{resolvedLeftSlot}

					<div className="flex shrink-0 items-center gap-2">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									className="rounded-full border-border/70 bg-background text-muted-foreground shadow-none hover:bg-background hover:text-foreground"
									aria-label="Open dashboard"
									onClick={() => void openDashboard()}
								>
									<LayoutDashboard className="size-3.5" aria-hidden="true" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom" sideOffset={8}>
								Open dashboard
							</TooltipContent>
						</Tooltip>

						{rightSlot}

						{onAddJob ? (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										size="icon-sm"
										className="rounded-full shadow-none"
										aria-label="Add job"
										onClick={onAddJob}
									>
										<PlusCircle className="size-4" aria-hidden="true" />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="bottom" sideOffset={8}>
									Add job
								</TooltipContent>
							</Tooltip>
						) : null}
					</div>
				</div>
				<div className="px-3 sm:px-4">
					<SidePanelFadeDivider />
				</div>
			</div>
		</TooltipProvider>
	);
}

function SidePanelFadeDivider() {
	return (
		<div
			aria-hidden="true"
			className="h-px w-full bg-gradient-to-r from-transparent via-border/80 to-transparent"
		/>
	);
}

type SidePanelBackHeaderProps = {
	title: string;
	onBack: () => void;
};

export function SidePanelBackHeader({
	title,
	onBack,
}: SidePanelBackHeaderProps) {
	return (
		<div className="flex min-w-0 items-center gap-2">
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				className="-ml-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
				aria-label="Back"
				title="Back"
				onClick={onBack}
			>
				<ArrowLeft className="size-4" aria-hidden="true" />
			</Button>
			{title ? (
				<h2 className="truncate text-base font-bold text-foreground">
					{title}
				</h2>
			) : null}
		</div>
	);
}
