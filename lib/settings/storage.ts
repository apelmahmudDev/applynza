export const DASHBOARD_SETTINGS_STORAGE_KEY = "applynza.dashboard-settings";
export const LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY = "applypilot.dashboard-settings";
import {
	ANONYMOUS_ACCOUNT_ID,
	getAccountStorageKey,
	getCurrentAccountId,
} from "@/lib/storage/account";

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
	const accountId = getCurrentAccountId();
	const stored = await browser.storage.local.get([
		getAccountStorageKey(DASHBOARD_SETTINGS_STORAGE_KEY, accountId),
		DASHBOARD_SETTINGS_STORAGE_KEY,
		LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY,
	]);
	let settings = stored[getAccountStorageKey(DASHBOARD_SETTINGS_STORAGE_KEY, accountId)];

	if (!settings && accountId === ANONYMOUS_ACCOUNT_ID) {
		settings =
			stored[DASHBOARD_SETTINGS_STORAGE_KEY] ??
			stored[LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY];
		if (settings) {
			await saveDashboardSettingsToAccountCache(accountId, settings);
		}
	}

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
		[getAccountStorageKey(DASHBOARD_SETTINGS_STORAGE_KEY)]: nextSettings,
	});
	void import("@/lib/sync/service").then(({ queueSync }) => queueSync());

	return nextSettings;
}

export async function saveDashboardSettingsToAccountCache(
	accountId: string,
	settings: unknown,
) {
	if (!settings || typeof settings !== "object") {
		return;
	}

	await browser.storage.local.set({
		[getAccountStorageKey(DASHBOARD_SETTINGS_STORAGE_KEY, accountId)]: settings,
	});
}

export async function loadDashboardSettingsFromAccountCache(accountId: string) {
	const stored = await browser.storage.local.get(
		getAccountStorageKey(DASHBOARD_SETTINGS_STORAGE_KEY, accountId),
	);
	const settings = stored[getAccountStorageKey(DASHBOARD_SETTINGS_STORAGE_KEY, accountId)];

	if (!settings || typeof settings !== "object") {
		return null;
	}

	const value = settings as Partial<DashboardSettings>;
	return {
		defaultStatus: normalizeDefaultStatus(value.defaultStatus),
		dateFormat: normalizeDateFormat(value.dateFormat),
		sortJobsBy: normalizeSortJobsBy(value.sortJobsBy),
	};
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
