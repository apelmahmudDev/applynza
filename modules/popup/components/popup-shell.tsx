import { Settings } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { openDashboard } from "@/lib/open-dashboard";

type PopupShellProps = {
	children: ReactNode;
};

export function PopupShell({ children }: PopupShellProps) {
	useThemePreference();
	const logoSrc = browser.runtime.getURL("/logo.png");

	return (
		<main className="flex h-[600px] w-[380px] flex-col overflow-hidden border border-slate-200 bg-white text-slate-950 dark:border-[#262222] dark:bg-background dark:text-slate-50">
			<header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-[#3a3333] dark:bg-[#221f1f]">
				<div className="flex items-center gap-3">
					<img
						src={logoSrc}
						alt=""
						className="h-7 w-auto shrink-0 rounded-xs"
						aria-hidden="true"
					/>
					<h1 className="text-lg font-bold tracking-normal">Applynza</h1>
				</div>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className="text-slate-600 hover:bg-slate-100 dark:text-muted-foreground dark:hover:bg-[#323232]"
						aria-label="Open settings"
						title="Settings"
						onClick={() => void openDashboard("settings")}
					>
						<Settings className="size-4" aria-hidden="true" />
					</Button>
				</div>
			</header>

			{children}
		</main>
	);
}
