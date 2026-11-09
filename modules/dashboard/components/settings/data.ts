import {
	CircleHelp,
	Cloud,
	DatabaseZap,
	Palette,
	SlidersHorizontal,
} from "lucide-react";

import type { SettingsPreferenceItem, SettingsSectionConfig } from "./types";

export const settingsSections: Record<
	"storage" | "sync" | "preferences" | "appearance" | "about",
	SettingsSectionConfig
> = {
	storage: {
		title: "Data & Storage",
		description:
			"Data is saved in your browser using Chrome Storage. Optional cloud sync can be enabled from Account & Sync.",
		icon: DatabaseZap,
		iconClassName: "text-primary",
	},
	sync: {
		title: "Account & Sync",
		description:
			"Sign in with Google and optionally sync your Applynza data across browsers.",
		icon: Cloud,
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
			"Applynza is a local-first browser extension for tracking job applications. Cloud sync is optional.",
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
