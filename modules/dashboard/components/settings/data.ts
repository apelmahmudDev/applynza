import {
	CircleHelp,
	DatabaseZap,
	Palette,
	SlidersHorizontal,
} from "lucide-react";

import type { SettingsPreferenceItem, SettingsSectionConfig } from "./types";

export const settingsSections: Record<
	"storage" | "preferences" | "appearance" | "about",
	SettingsSectionConfig
> = {
	storage: {
		title: "Data & Storage",
		description:
			"All data is saved in your browser using Chrome Storage. You can clear all data anytime. This cannot be undone.",
		icon: DatabaseZap,
		iconClassName: "text-primary",
	},
	preferences: {
		title: "Preferences",
		description:
			"Adjust your default job-tracking behavior and display preferences.",
		icon: SlidersHorizontal,
		iconClassName: "text-primary",
	},
	appearance: {
		title: "Appearance",
		description:
			"Choose how Applynza looks while keeping the interface lightweight and readable.",
		icon: Palette,
		iconClassName: "text-emerald-600",
	},
	about: {
		title: "About",
		description:
			"Applynza is a browser extension to help you track job applications locally. No accounts. No cloud. No tracking.",
		icon: CircleHelp,
		iconClassName: "text-primary",
	},
};

export const settingsPreferenceItems: SettingsPreferenceItem[] = [
	{
		id: "defaultStatus",
		label: "Default Status for New Jobs",
		description: "Choose the default status applied when creating a new job.",
		defaultValue: "saved",
		options: [
			{ value: "saved", label: "Saved" },
			{ value: "applied", label: "Applied" },
			{ value: "interview", label: "Interview" },
		],
	},
	{
		id: "dateFormat",
		label: "Date Format",
		description: "Choose how dates are displayed throughout the dashboard.",
		defaultValue: "may-20-2025",
		options: [
			{ value: "may-20-2025", label: "May 20, 2025" },
			{ value: "20-may-2025", label: "20 May 2025" },
			{ value: "2025-05-20", label: "2025-05-20" },
		],
	},
	{
		id: "sortJobsBy",
		label: "Sort Jobs By",
		description: "Choose the default sorting for your saved job applications.",
		defaultValue: "last-updated",
		options: [
			{ value: "last-updated", label: "Last Updated" },
			{ value: "date-created", label: "Date Created" },
			{ value: "company", label: "Company" },
		],
	},
];
