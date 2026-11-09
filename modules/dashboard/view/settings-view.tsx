import { SettingsAboutSection } from "@/modules/dashboard/components/settings/settings-about-section";
import { SettingsAppearanceSection } from "@/modules/dashboard/components/settings/settings-appearance-section";
import { SettingsPreferencesSection } from "@/modules/dashboard/components/settings/settings-preferences-section";
import { SettingsStorageSection } from "@/modules/dashboard/components/settings/settings-storage-section";
import { SettingsSyncSection } from "@/modules/dashboard/components/settings/settings-sync-section";
import { useDashboardSettings } from "@/modules/dashboard/hooks/use-dashboard-settings";

export function SettingsView() {
	const {
		settings,
		storageUsedLabel,
		storageUsedPercent,
		isClearingData,
		appVersion,
		updateSetting,
		clearAllData,
	} = useDashboardSettings();

	return (
		<div>
			<section className="mb-5 flex flex-col gap-5 pt-5 pb-2 xl:flex-row xl:items-center xl:justify-between">
				<div className="min-w-0">
					<h1 className="text-3xl font-bold tracking-[-0.05em] text-slate-950 dark:text-foreground">
						Settings
					</h1>
					<p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">
						Customize your experience. All data stays in this browser.
					</p>
				</div>

				{/* <Button
					type="button"
					variant="ghost"
					className="h-11 self-start rounded-md px-3 text-base font-semibold text-slate-700 hover:bg-white hover:text-slate-950"
				>
					<SunMedium className="size-5" aria-hidden="true" />
					Light Mode
					<ChevronDown className="size-4 text-slate-400" aria-hidden="true" />
				</Button> */}
			</section>

			<section className="mt-6 mb-8 space-y-6">
				<SettingsStorageSection
					storageUsedLabel={storageUsedLabel}
					storageUsedPercent={storageUsedPercent}
					isClearingData={isClearingData}
					onClearAllData={clearAllData}
				/>
				<SettingsSyncSection />
				<SettingsPreferencesSection
					settings={settings}
					onUpdateSetting={updateSetting}
				/>
				<SettingsAppearanceSection />
				<SettingsAboutSection appVersion={appVersion} />
			</section>
		</div>
	);
}
