import { getAppVersion } from "@/lib/app-version";
import {
	DASHBOARD_SETTINGS_STORAGE_KEY,
	type DashboardSettings,
} from "@/lib/settings/storage";
import { THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme/storage";
import { reminderTypeOptions } from "@/modules/dashboard/components/reminders/reminder-form.types";
import type { JobForm } from "@/modules/popup/types";

import {
	getStoredJobs,
	JOBS_STORAGE_KEY,
	LEGACY_JOBS_STORAGE_KEY,
	type StoredJob,
} from "../jobs/storage";

export type ExportFormat = "json" | "csv";
export type ExportRange = "all-time" | "last-30-days" | "this-year";

const BACKUP_SCHEMA_VERSION = 1;
const MAX_BACKUP_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const APP_NAME = "Applynza" as const;
const LEGACY_APP_NAME = "Applypilot" as const;

export type ApplynzaBackup = {
	app: typeof APP_NAME;
	schemaVersion: number;
	exportedAt: string;
	extensionVersion: string;
	data: {
		jobs: StoredJob[];
		settings: {
			dashboard: DashboardSettings | null;
			theme: ThemePreference | null;
		};
		storage: Record<string, unknown>;
	};
};

export type BackupPreview = {
	fileName: string;
	exportedAt: string | null;
	jobsCount: number;
	remindersCount: number;
	settingsIncluded: boolean;
	backup: ApplynzaBackup;
};

export async function exportApplynzaData(
	format: ExportFormat,
	range: ExportRange,
) {
	const jobs = filterJobsByRange(await getStoredJobs(), range);

	if (format === "csv") {
		const csv = createJobsCsv(jobs);
		downloadFile(
			new Blob([csv], { type: "text/csv;charset=utf-8" }),
			createFilename("csv"),
		);
		return;
	}

	const snapshot = await browser.storage.local.get(null);
	const backup: ApplynzaBackup = {
		app: APP_NAME,
		schemaVersion: BACKUP_SCHEMA_VERSION,
		exportedAt: new Date().toISOString(),
		extensionVersion: getAppVersion(),
		data: {
			jobs,
			settings: {
				dashboard: isRecord(snapshot[DASHBOARD_SETTINGS_STORAGE_KEY])
					? (snapshot[DASHBOARD_SETTINGS_STORAGE_KEY] as DashboardSettings)
					: null,
				theme: normalizeThemePreference(snapshot[THEME_STORAGE_KEY]),
			},
			storage: {
				...snapshot,
				[JOBS_STORAGE_KEY]: jobs,
				[LEGACY_JOBS_STORAGE_KEY]: jobs,
			},
		},
	};

	downloadFile(
		new Blob([JSON.stringify(backup, null, 2)], {
			type: "application/json",
		}),
		createFilename("json"),
	);
}

export async function readBackupPreview(file: File): Promise<BackupPreview> {
	if (!file.name.toLowerCase().endsWith(".json")) {
		throw new Error("Please select an Applynza JSON backup file.");
	}

	if (file.size > MAX_BACKUP_FILE_SIZE_BYTES) {
		throw new Error("The selected backup file is too large.");
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(await file.text());
	} catch {
		throw new Error("The selected file does not contain valid JSON.");
	}

	const backup = normalizeBackup(parsed);
	const jobs = normalizeBackupJobs(backup.data.jobs);

	return {
		fileName: file.name,
		exportedAt: backup.exportedAt ?? null,
		jobsCount: jobs.length,
		remindersCount: countJobReminders(jobs),
		settingsIncluded: Boolean(
			backup.data.settings.dashboard || backup.data.settings.theme,
		),
		backup,
	};
}

export async function mergeBackupWithCurrentData(backup: ApplynzaBackup) {
	const importedJobs = normalizeBackupJobs(backup.data.jobs);
	const currentStorage = await browser.storage.local.get(null);
	const currentJobs = await getStoredJobs();
	const mergedJobs = mergeItemsById(currentJobs, importedJobs);
	const mergedStorage = mergeStorageSnapshots(
		currentStorage,
		backup.data.storage,
		mergedJobs,
		backup.data.settings,
	);

	await browser.storage.local.set(mergedStorage);

	return {
		importedJobs: importedJobs.length,
		mergedJobs: mergedJobs.length,
		importedReminders: countJobReminders(importedJobs),
	};
}

export function getExportRangeDescription(range: ExportRange) {
	if (range === "last-30-days") {
		return "Export jobs created or updated in the last 30 days.";
	}

	if (range === "this-year") {
		return "Export jobs created or updated since January 1, 2026.";
	}

	return "Export all data from the beginning.";
}

function normalizeBackup(input: unknown): ApplynzaBackup {
	validateBackup(input);

	const backup = input as Partial<ApplynzaBackup> & {
		data?: Record<string, unknown>;
	};
	const data: Record<string, unknown> = isRecord(backup.data) ? backup.data : {};
	const storage: Record<string, unknown> = isRecord(data.storage) ? data.storage : {};
	const settings: Record<string, unknown> = isRecord(data.settings) ? data.settings : {};

	return {
		app: APP_NAME,
		schemaVersion:
			typeof backup.schemaVersion === "number" ? backup.schemaVersion : 1,
		exportedAt:
			typeof backup.exportedAt === "string" ? backup.exportedAt : new Date(0).toISOString(),
		extensionVersion:
			typeof backup.extensionVersion === "string"
				? backup.extensionVersion
				: "0.0.0",
		data: {
			jobs: Array.isArray(data.jobs)
				? (data.jobs as StoredJob[])
				: Array.isArray(storage[JOBS_STORAGE_KEY])
					? (storage[JOBS_STORAGE_KEY] as StoredJob[])
				: Array.isArray(storage[LEGACY_JOBS_STORAGE_KEY])
					? (storage[LEGACY_JOBS_STORAGE_KEY] as StoredJob[])
					: [],
			settings: {
				dashboard: isRecord(settings.dashboard)
					? (settings.dashboard as DashboardSettings)
					: isRecord(storage[DASHBOARD_SETTINGS_STORAGE_KEY])
						? (storage[DASHBOARD_SETTINGS_STORAGE_KEY] as DashboardSettings)
						: null,
				theme:
					normalizeThemePreference(settings.theme) ??
					normalizeThemePreference(storage[THEME_STORAGE_KEY]),
			},
			storage,
		},
	};
}

function validateBackup(backup: unknown) {
	if (!isRecord(backup)) {
		throw new Error("Invalid backup file.");
	}

	if (backup.app !== APP_NAME && backup.app !== LEGACY_APP_NAME) {
		throw new Error("This is not an Applynza backup file.");
	}

	if (!Number.isInteger(backup.schemaVersion)) {
		throw new Error("The backup version is missing.");
	}

	if ((backup.schemaVersion as number) > BACKUP_SCHEMA_VERSION) {
		throw new Error("This backup was created by a newer version of Applynza.");
	}

	if (!isRecord(backup.data)) {
		throw new Error("The backup does not contain any restorable data.");
	}
}

function filterJobsByRange(jobs: StoredJob[], range: ExportRange) {
	if (range === "all-time") {
		return jobs;
	}

	const now = Date.now();
	const cutoff =
		range === "last-30-days"
			? now - 30 * 24 * 60 * 60 * 1000
			: new Date(2026, 0, 1).getTime();

	return jobs.filter((job) => {
		const createdAt = Date.parse(job.createdAt);
		const updatedAt = Date.parse(job.updatedAt);
		return createdAt >= cutoff || updatedAt >= cutoff;
	});
}

function normalizeBackupJobs(input: unknown): StoredJob[] {
	if (!Array.isArray(input)) {
		return [];
	}

	return input
		.map(normalizeImportedJob)
		.filter((job): job is StoredJob => job !== null);
}

function normalizeImportedJob(value: unknown): StoredJob | null {
	if (!isRecord(value)) {
		return null;
	}

	const toText = (field: string) =>
		typeof value[field] === "string" ? (value[field] as string).trim() : "";
	const toBoolean = (field: string) =>
		typeof value[field] === "boolean" ? (value[field] as boolean) : false;

	const id = toText("id");
	const title = toText("title");
	const company = toText("company");
	const location = toText("location");
	const url = toText("url");
	const platform = toText("platform");

	if (!id || !title || !company) {
		return null;
	}

	return {
		id,
		title,
		company,
		location,
		url,
		platform,
		salary: toText("salary"),
		currency: toText("currency"),
		logoUrl: toText("logoUrl"),
		descriptionText: toText("descriptionText"),
		descriptionHtml: toText("descriptionHtml"),
		employmentType: toText("employmentType"),
		workplaceType: toText("workplaceType"),
		experienceLevel: toText("experienceLevel"),
		status: normalizeStoredStatus(value.status),
		savedDate: toText("savedDate"),
		deadline: toText("deadline"),
		reminderType: normalizeReminderType(value.reminderType),
		followUpDate: toText("followUpDate"),
		followUpTime: toText("followUpTime"),
		reminderNote: toText("reminderNote"),
		reminderEnabled: toBoolean("reminderEnabled") && Boolean(toText("followUpDate")),
		reminderDone: toBoolean("reminderDone"),
		notes: toText("notes"),
		createdAt: normalizeIsoDate(toText("createdAt")),
		updatedAt: normalizeIsoDate(toText("updatedAt")),
	};
}

function mergeItemsById(currentItems: StoredJob[], importedItems: StoredJob[]) {
	const itemMap = new Map<string, StoredJob>();

	for (const item of currentItems) {
		itemMap.set(item.id, item);
	}

	for (const item of importedItems) {
		const existingItem = itemMap.get(item.id);

		if (!existingItem) {
			itemMap.set(item.id, item);
			continue;
		}

		const existingUpdatedAt = Date.parse(existingItem.updatedAt || "");
		const importedUpdatedAt = Date.parse(item.updatedAt || "");

		if (
			Number.isNaN(existingUpdatedAt) ||
			(!Number.isNaN(importedUpdatedAt) && importedUpdatedAt >= existingUpdatedAt)
		) {
			itemMap.set(item.id, {
				...existingItem,
				...item,
			});
		}
	}

	return Array.from(itemMap.values()).sort((first, second) =>
		second.updatedAt.localeCompare(first.updatedAt),
	);
}

function mergeStorageSnapshots(
	currentStorage: Record<string, unknown>,
	importedStorage: Record<string, unknown>,
	mergedJobs: StoredJob[],
	importedSettings: ApplynzaBackup["data"]["settings"],
) {
	const nextStorage: Record<string, unknown> = {
		...currentStorage,
		...importedStorage,
		[JOBS_STORAGE_KEY]: mergedJobs,
		[LEGACY_JOBS_STORAGE_KEY]: mergedJobs,
	};

	if (importedSettings.dashboard) {
		nextStorage[DASHBOARD_SETTINGS_STORAGE_KEY] = importedSettings.dashboard;
	}

	if (importedSettings.theme) {
		nextStorage[THEME_STORAGE_KEY] = importedSettings.theme;
	}

	return nextStorage;
}

function countJobReminders(jobs: StoredJob[]) {
	return jobs.filter((job) => job.reminderEnabled && job.followUpDate).length;
}

function createJobsCsv(jobs: StoredJob[]) {
	const headers = [
		"id",
		"title",
		"company",
		"location",
		"url",
		"platform",
		"status",
		"savedDate",
		"deadline",
		"salary",
		"currency",
		"employmentType",
		"workplaceType",
		"experienceLevel",
		"followUpDate",
		"followUpTime",
		"reminderType",
		"reminderEnabled",
		"reminderDone",
		"notes",
		"createdAt",
		"updatedAt",
	];

	const rows = jobs.map((job) =>
		headers.map((header) => escapeCsvValue(String(job[header as keyof StoredJob] ?? ""))),
	);

	return [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
}

function escapeCsvValue(value: string) {
	const normalized = value.replace(/\r?\n/g, "\n");
	return /[",\n]/.test(normalized)
		? `"${normalized.replace(/"/g, '""')}"`
		: normalized;
}

function createFilename(extension: "json" | "csv") {
	const date = new Date().toISOString().slice(0, 10);
	return `applynza-backup-${date}.${extension}`;
}

function downloadFile(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object";
}

function normalizeThemePreference(value: unknown): ThemePreference | null {
	return value === "light" || value === "dark" ? value : null;
}

function normalizeReminderType(value: unknown): JobForm["reminderType"] {
	return typeof value === "string" &&
		(reminderTypeOptions as readonly string[]).includes(value)
		? (value as JobForm["reminderType"])
		: "Follow up";
}

function normalizeStoredStatus(value: unknown): StoredJob["status"] {
	if (value === "Interviewing") return "Interviewing";
	if (value === "Applied") return "Applied";
	if (value === "Offer") return "Offer";
	return "Saved";
}

function normalizeIsoDate(value: string) {
	const timestamp = Date.parse(value);
	return Number.isNaN(timestamp) ? new Date(0).toISOString() : new Date(timestamp).toISOString();
}
