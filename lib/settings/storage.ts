export const DASHBOARD_SETTINGS_STORAGE_KEY = "applynza.dashboard-settings";
export const LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY = "applypilot.dashboard-settings";

export type DashboardDefaultStatus = "saved" | "applied" | "interview" | "offer";
export type DashboardDateFormat = "may-20-2025" | "20-may-2025" | "2025-05-20";
export type DashboardSortJobsBy = "last-updated" | "date-created" | "company";

export type DashboardSettings = {
	defaultStatus: DashboardDefaultStatus;
	dateFormat: DashboardDateFormat;
	sortJobsBy: DashboardSortJobsBy;
};

export const defaultDashboardSettings: DashboardSettings = {
	defaultStatus: "saved",
	dateFormat: "may-20-2025",
	sortJobsBy: "last-updated",
};

export async function getStoredDashboardSettings(): Promise<DashboardSettings> {
	const stored = await browser.storage.local.get([
		DASHBOARD_SETTINGS_STORAGE_KEY,
		LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY,
	]);
	const settings =
		stored[DASHBOARD_SETTINGS_STORAGE_KEY] ??
		stored[LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY];

	if (!settings || typeof settings !== "object") {
		return defaultDashboardSettings;
	}

	const partialSettings = settings as Partial<DashboardSettings>;

	return {
		defaultStatus: normalizeDefaultStatus(partialSettings.defaultStatus),
		dateFormat: normalizeDateFormat(partialSettings.dateFormat),
		sortJobsBy: normalizeSortJobsBy(partialSettings.sortJobsBy),
	};
}

export async function updateStoredDashboardSettings(
	updates: Partial<DashboardSettings>,
) {
	const currentSettings = await getStoredDashboardSettings();
	const nextSettings: DashboardSettings = {
		defaultStatus: normalizeDefaultStatus(
			updates.defaultStatus ?? currentSettings.defaultStatus,
		),
		dateFormat: normalizeDateFormat(
			updates.dateFormat ?? currentSettings.dateFormat,
		),
		sortJobsBy: normalizeSortJobsBy(
			updates.sortJobsBy ?? currentSettings.sortJobsBy,
		),
	};

	await browser.storage.local.set({
		[DASHBOARD_SETTINGS_STORAGE_KEY]: nextSettings,
		[LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY]: nextSettings,
	});

	return nextSettings;
}

function normalizeDefaultStatus(value: unknown): DashboardDefaultStatus {
	if (value === "applied") return "applied";
	if (value === "interview") return "interview";
	if (value === "offer") return "offer";
	return "saved";
}

function normalizeDateFormat(value: unknown): DashboardDateFormat {
	if (value === "20-may-2025") return "20-may-2025";
	if (value === "2025-05-20") return "2025-05-20";
	return "may-20-2025";
}

function normalizeSortJobsBy(value: unknown): DashboardSortJobsBy {
	if (value === "date-created") return "date-created";
	if (value === "company") return "company";
	return "last-updated";
}
