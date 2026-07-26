import { settingsSections } from "./data";
import { SettingsSectionCard } from "./settings-section-card";

type SettingsAboutSectionProps = {
	appVersion: string;
};

export function SettingsAboutSection({ appVersion }: SettingsAboutSectionProps) {
	return (
		<SettingsSectionCard config={settingsSections.about}>
			<div className="flex flex-col gap-3 border-t border-slate-100 pt-6 dark:border-border/60 sm:flex-row sm:items-end sm:justify-between">
				<div className="min-w-0">
					<h3 className="text-base font-semibold text-slate-900 dark:text-foreground">
						Local-first by design
					</h3>
					<p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-muted-foreground">
						Applynza keeps job application data inside your browser so you can
						track progress privately without extra accounts or syncing services.
					</p>
				</div>

				<p className="shrink-0 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
					Version {appVersion}
				</p>
			</div>
		</SettingsSectionCard>
	);
}
