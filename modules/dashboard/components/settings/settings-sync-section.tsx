import { Cloud, LogIn, LogOut, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { settingsSections } from "./data";
import { SettingsSectionCard } from "./settings-section-card";
import { useSyncAccount } from "@/modules/dashboard/hooks/use-sync-account";

export function SettingsSyncSection() {
	const {
		user,
		settings,
		isBusy,
		isConfigured,
		signIn,
		signOut,
		toggleSync,
		sync,
	} = useSyncAccount();

	const lastSyncedLabel = settings.lastSyncedAt
		? new Intl.DateTimeFormat(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			}).format(new Date(settings.lastSyncedAt))
		: "Not synced yet";

	return (
		<SettingsSectionCard config={settingsSections.sync}>
			<div className="space-y-5">
				{!isConfigured ? (
					<div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
						Online sync is not available in this build yet. Your data remains local.
					</div>
				) : null}

				<div className="flex flex-col gap-4 border-t border-slate-100 pt-6 dark:border-border/60 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex min-w-0 items-center gap-3">
						<Cloud className="size-5 shrink-0 text-primary" aria-hidden="true" />
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-slate-900 dark:text-foreground">
								{user ? user.email ?? "Google account" : "Not signed in"}
							</p>
							<p className="text-xs text-slate-500 dark:text-muted-foreground">
								{user ? "Google account connected" : "Sign in to sync across browsers"}
							</p>
						</div>
					</div>

					{user ? (
						<Button type="button" variant="outline" onClick={() => void signOut()} disabled={isBusy}>
							<LogOut className="size-4" aria-hidden="true" />
							Sign out
						</Button>
					) : (
						<Button
							type="button"
							className="h-11 rounded-md px-4 font-semibold"
							onClick={() => void signIn()}
							disabled={isBusy || !isConfigured}
						>
							<LogIn className="size-4" aria-hidden="true" />
							Sign in with Google
						</Button>
					)}
				</div>

				<div className="flex flex-col gap-4 border-t border-slate-100 pt-6 dark:border-border/60 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-sm font-semibold text-slate-900 dark:text-foreground">Enable cloud sync</p>
						<p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
							Sync jobs, reminders, notes, and preferences only when enabled.
						</p>
					</div>
					<Switch
						checked={settings.enabled}
						disabled={!user || isBusy}
						onCheckedChange={(checked) => void toggleSync(checked)}
						aria-label="Enable cloud sync"
					/>
				</div>

				{user && settings.enabled ? (
					<div className="flex flex-col gap-3 border-t border-slate-100 pt-6 dark:border-border/60 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-xs text-slate-500 dark:text-muted-foreground">
							Last synced: {lastSyncedLabel}
							{settings.lastError ? ` · ${settings.lastError}` : ""}
						</p>
						<Button type="button" variant="outline" onClick={() => void sync()} disabled={isBusy}>
							<RefreshCw className="size-4" aria-hidden="true" />
							Sync now
						</Button>
					</div>
				) : null}
			</div>
		</SettingsSectionCard>
	);
}
