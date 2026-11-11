import { useState } from "react";
import { Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { settingsSections } from "./data";
import { SettingsSectionCard } from "./settings-section-card";

type SettingsStorageSectionProps = {
	storageUsedLabel: string;
	storageUsedPercent: number;
	isSyncEnabled: boolean;
	isClearingData: boolean;
	onClearAllData: () => void;
};

export function SettingsStorageSection({
	storageUsedLabel,
	storageUsedPercent,
	isSyncEnabled,
	isClearingData,
	onClearAllData,
}: SettingsStorageSectionProps) {
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

	return (
		<>
			<ConfirmDialog
				open={isConfirmOpen}
				title="Clear all data?"
				description={
					isSyncEnabled
						? "This clears jobs and settings from this browser only. Your cloud-synced data will not be deleted."
						: "This will remove your locally stored job applications and settings from this browser. This action cannot be undone."
				}
				confirmLabel="Clear Data"
				cancelLabel="Keep data"
				confirmingLabel="Clearing..."
				isConfirming={isClearingData}
				onOpenChange={(open) => {
					if (!isClearingData) {
						setIsConfirmOpen(open);
					}
				}}
				onConfirm={() => {
					void (async () => {
						await onClearAllData();
						setIsConfirmOpen(false);
					})();
				}}
			/>

			<SettingsSectionCard
				config={settingsSections.storage}
				action={
					<Button
						type="button"
						variant="outline"
						className="h-11 rounded-md border-slate-200 bg-white px-4 font-semibold text-primary shadow-none dark:border-border dark:bg-card"
						onClick={() => setIsConfirmOpen(true)}
						disabled={isClearingData}
					>
						<Trash2 className="size-4" aria-hidden="true" />
						{isClearingData ? "Clearing..." : "Clear All Data"}
					</Button>
				}
			>
				<div className="space-y-4 border-t border-slate-100 pt-6 dark:border-border/60">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-sm font-semibold text-slate-700 dark:text-foreground/90">
								Local storage used
							</p>
							<p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
								Job applications, settings, and preferences stored in this browser
							</p>
						</div>
						<p className="text-sm font-bold text-slate-900 dark:text-foreground">
							{storageUsedLabel}
						</p>
					</div>
					<Progress
						value={storageUsedPercent}
						aria-label={`Local storage used: ${storageUsedLabel}`}
						className="h-2.5 bg-slate-100 dark:bg-[#3a3333]"
					/>
					<p className="text-xs text-slate-500 dark:text-muted-foreground">
						{isSyncEnabled
							? "Cloud sync is enabled. Clearing local data does not delete your cloud data."
							: "Cloud sync is off. Your data remains in this browser."}
					</p>
				</div>
			</SettingsSectionCard>
		</>
	);
}
