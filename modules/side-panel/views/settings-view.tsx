import { FullDashboardButton } from "@/modules/side-panel/components/full-dashboard-button";
import { ViewHeader } from "@/modules/side-panel/components/view-header";

type SettingsViewProps = {
	isDarkMode: boolean;
	onBack: () => void;
};

export function SettingsView({ isDarkMode, onBack }: SettingsViewProps) {
	return (
		<div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4">
			<ViewHeader title="Settings" isDarkMode={isDarkMode} onBack={onBack} />
			<section className="rounded-[14px] border border-border bg-card p-4 text-muted-foreground">
				<p className="text-sm font-semibold">Theme preference</p>
				<p className="mt-1 text-xs leading-5">
					Applynza uses the theme you choose in Dashboard Settings.
				</p>
			</section>
			<div className="mt-auto">
				<FullDashboardButton isDarkMode={isDarkMode} />
			</div>
		</div>
	);
}
