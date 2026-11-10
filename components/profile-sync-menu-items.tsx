import { Cloud, LoaderCircle, LogOut } from "lucide-react";

import {
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSyncAccount } from "@/modules/dashboard/hooks/use-sync-account";

type ProfileSyncMenuItemsProps = {
	profileName: string;
};

export function ProfileSyncMenuItems({
	profileName,
}: ProfileSyncMenuItemsProps) {
	const {
		user,
		settings,
		isLoading,
		isBusy,
		errorMessage,
		isConfigured,
		signIn,
		signOut,
		toggleSync,
		sync,
	} = useSyncAccount();

	if (isLoading) {
		return (
			<DropdownMenuItem disabled className="gap-3 rounded-lg px-3 py-2.5">
				<LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
				<span className="text-sm font-semibold">Checking sync status...</span>
			</DropdownMenuItem>
		);
	}

	const syncLabel = user
		? settings.enabled
			? "Sync now"
			: "Turn on sync..."
		: "Turn on sync...";
	const syncDescription = !isConfigured
		? "Sync is not available in this build"
		: user
			? settings.enabled
				? "Sync your latest jobs and preferences"
				: "Sync your jobs across devices"
			: "Sign in with Google to sync across devices";

	return (
		<>
			<DropdownMenuItem
				disabled={isBusy || !isConfigured}
				onSelect={() => {
					if (user && settings.enabled) {
						void sync();
					} else if (user) {
						void toggleSync(true);
					} else {
						void signIn();
					}
				}}
				className="items-start gap-3 rounded-lg px-3 py-2.5"
			>
				{isBusy ? (
					<LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
				) : (
					<Cloud className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
				)}
				<span className="min-w-0">
					<span className="block text-sm font-semibold">{syncLabel}</span>
					<span className="mt-0.5 block text-xs font-normal text-muted-foreground">
						{syncDescription}
					</span>
				</span>
			</DropdownMenuItem>

			{errorMessage || settings.lastError ? (
				<p
					role="alert"
					className="px-3 py-1.5 text-xs leading-4 text-destructive"
				>
					{errorMessage ?? settings.lastError}
				</p>
			) : null}

			{user ? (
				<>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						disabled={isBusy}
						onSelect={() => void signOut()}
						className="gap-3 rounded-lg px-3 py-2.5"
					>
						<LogOut className="size-4 text-muted-foreground" aria-hidden="true" />
						<span className="text-sm font-semibold">Sign out</span>
					</DropdownMenuItem>
				</>
			) : null}
		</>
	);
}
