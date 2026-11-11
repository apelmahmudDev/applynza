import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	onSnapshot,
	setDoc,
	type Unsubscribe,
} from "firebase/firestore";

import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
	DASHBOARD_SETTINGS_STORAGE_KEY,
	LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY,
	getStoredDashboardSettings,
	loadDashboardSettingsFromAccountCache,
	saveDashboardSettingsToAccountCache,
} from "@/lib/settings/storage";
import {
	LEGACY_THEME_STORAGE_KEY,
	THEME_STORAGE_KEY,
	getStoredThemePreference,
	loadThemeFromAccountCache,
	saveThemeToAccountCache,
} from "@/lib/theme/storage";
import {
	JOBS_STORAGE_KEY,
	LEGACY_JOBS_STORAGE_KEY,
	DELETED_JOBS_STORAGE_KEY,
	clearDeletedJobIds,
	getDeletedJobIds,
	getStoredJobs,
	loadJobsFromAccountCache,
	saveJobsToAccountCache,
	areStoredJobsDuplicates,
	type StoredJob,
} from "@/lib/jobs/storage";
import {
	ACTIVE_ACCOUNT_STORAGE_KEY,
	ANONYMOUS_ACCOUNT_ID,
	getAccountStorageKey,
	getCurrentAccountId,
} from "@/lib/storage/account";

export const SYNC_SETTINGS_STORAGE_KEY = "applynza.sync-settings";

export type SyncSettings = {
	enabled: boolean;
	lastSyncedAt: string | null;
	lastError: string | null;
};

export type SyncState = SyncSettings & {
	user: {
		uid: string;
		displayName: string | null;
		email: string | null;
		photoURL: string | null;
	} | null;
	isConfigured: boolean;
	isSyncing: boolean;
};

const defaultSyncSettings: SyncSettings = {
	enabled: false,
	lastSyncedAt: null,
	lastError: null,
};

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight: Promise<void> | null = null;
let syncQueued = false;
let retryAttempt = 0;
let isApplyingRemoteData = false;
let unsubscribeJobs: Unsubscribe | null = null;
let unsubscribeSettings: Unsubscribe | null = null;
let isStorageSyncListenerRegistered = false;
let activeAccountId = getCurrentAccountId();
let isSignOutInProgress = false;

export async function getSyncSettings(): Promise<SyncSettings> {
	const accountKey = getAccountStorageKey(SYNC_SETTINGS_STORAGE_KEY);
	const stored = await browser.storage.local.get([
		SYNC_SETTINGS_STORAGE_KEY,
		accountKey,
	]);
	const settings =
		stored[accountKey] ?? stored[SYNC_SETTINGS_STORAGE_KEY];

	if (!settings || typeof settings !== "object") {
		return defaultSyncSettings;
	}

	const value = settings as Partial<SyncSettings>;
	const scopedValue = stored[accountKey] as Partial<SyncSettings> | undefined;
	return {
		enabled: value.enabled === true,
		lastSyncedAt:
			getCurrentAccountId() === "anonymous" &&
			typeof value.lastSyncedAt === "string"
				? value.lastSyncedAt
				: typeof scopedValue?.lastSyncedAt === "string"
					? scopedValue.lastSyncedAt
					: null,
		lastError:
			getCurrentAccountId() === "anonymous" &&
			typeof value.lastError === "string"
				? value.lastError
				: typeof scopedValue?.lastError === "string"
					? scopedValue.lastError
					: null,
	};
}

export async function setSyncEnabled(enabled: boolean) {
	const settings = await getSyncSettings();
	await saveSyncSettings({ ...settings, enabled, lastError: null });

	if (!enabled) {
		cancelQueuedSync();
		stopRemoteListeners();
		return;
	}

	try {
		await syncNow();
		startRemoteListeners();
	} catch (error) {
		syncQueued = true;
		scheduleRetry();
		throw error;
	}
}

export async function prepareForAccountSwitch() {
	activeAccountId = await getStoredActiveAccountId();
	await persistActiveDataForAccount(activeAccountId);
	await browser.storage.local.set({
		[ACTIVE_ACCOUNT_STORAGE_KEY]: activeAccountId,
	});
}

export async function switchLocalAccount(nextAccountId: string) {
	activeAccountId = await getStoredActiveAccountId();
	if (nextAccountId === activeAccountId) {
		return;
	}

	const previousAccountId = activeAccountId;
	isApplyingRemoteData = true;
	try {
		const previousJobs =
			previousAccountId === ANONYMOUS_ACCOUNT_ID
				? await loadJobsFromAccountCache(ANONYMOUS_ACCOUNT_ID)
				: [];
		await persistActiveDataForAccount(previousAccountId);

		const accountJobs = await loadJobsFromAccountCache(nextAccountId);
		const jobs =
			previousJobs.length > 0
				? mergeJobs(previousJobs, accountJobs)
				: accountJobs;
		const accountDashboard =
			await loadDashboardSettingsFromAccountCache(nextAccountId);
		const guestDashboard =
			previousAccountId === ANONYMOUS_ACCOUNT_ID
				? await loadDashboardSettingsFromAccountCache(ANONYMOUS_ACCOUNT_ID)
				: null;
		const dashboard = accountDashboard ?? guestDashboard;
		const accountTheme = await loadThemeFromAccountCache(nextAccountId);
		const guestTheme =
			previousAccountId === ANONYMOUS_ACCOUNT_ID
				? await loadThemeFromAccountCache(ANONYMOUS_ACCOUNT_ID)
				: null;
		const theme = accountTheme ?? guestTheme;

		await browser.storage.local.set({
			[JOBS_STORAGE_KEY]: jobs,
			[LEGACY_JOBS_STORAGE_KEY]: jobs,
			[getAccountStorageKey(JOBS_STORAGE_KEY, nextAccountId)]: jobs,
			[DASHBOARD_SETTINGS_STORAGE_KEY]: dashboard,
			[LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY]: dashboard,
			...(dashboard
				? {
						[getAccountStorageKey(
							DASHBOARD_SETTINGS_STORAGE_KEY,
							nextAccountId,
						)]: dashboard,
					}
				: {}),
			[THEME_STORAGE_KEY]: theme,
			[LEGACY_THEME_STORAGE_KEY]: theme,
			...(theme
				? {
						[getAccountStorageKey(THEME_STORAGE_KEY, nextAccountId)]: theme,
					}
				: {}),
		});
		activeAccountId = nextAccountId;
		await browser.storage.local.set({
			[ACTIVE_ACCOUNT_STORAGE_KEY]: nextAccountId,
		});

		if (previousAccountId === ANONYMOUS_ACCOUNT_ID) {
			await clearAccountCache(ANONYMOUS_ACCOUNT_ID);
		}
	} finally {
		isApplyingRemoteData = false;
	}
}

export function startStorageSyncListener() {
	if (isStorageSyncListenerRegistered) {
		return;
	}

	isStorageSyncListenerRegistered = true;
	browser.storage.onChanged.addListener((changes, areaName) => {
		if (
			areaName !== "local" ||
			isApplyingRemoteData ||
			!Object.keys(changes).some(isSyncableStorageKey)
		) {
			return;
		}

		void getSyncSettings()
			.then((settings) => {
				if (
					isFirebaseConfigured() &&
					settings.enabled &&
					getFirebaseAuth().currentUser
				) {
					queueSync();
				}
			})
			.catch((error: unknown) => {
				void recordSyncError(error);
			});
	});
}

export async function syncNow() {
	if (syncInFlight) {
		syncQueued = true;
		return syncInFlight;
	}

	syncInFlight = syncNowInternal();
	try {
		await syncInFlight;
		retryAttempt = 0;
	} finally {
		syncInFlight = null;
		if (syncQueued) {
			syncQueued = false;
			queueSync();
		}
	}
}

async function syncNowInternal() {
	if (!isFirebaseConfigured()) {
		throw new Error("Firebase is not configured yet.");
	}

	const user = getFirebaseAuth().currentUser;
	const settings = await getSyncSettings();

	if (!user || !settings.enabled) {
		return;
	}

	const database = getFirebaseDb();
	const jobs = await getStoredJobs();
	const deletedJobIds = await getDeletedJobIds();
	const remoteJobsSnapshot = await getDocs(collection(database, "users", user.uid, "jobs"));
	const remoteJobs = remoteJobsSnapshot.docs
		.filter((job) => !deletedJobIds.includes(job.id))
		.map((job) => job.data() as StoredJob);
	const mergedJobs = mergeJobs(jobs, remoteJobs);

	isApplyingRemoteData = true;
	try {
		await setLocalValueIfChanged({
			[JOBS_STORAGE_KEY]: mergedJobs,
			[LEGACY_JOBS_STORAGE_KEY]: mergedJobs,
			[getAccountStorageKey(JOBS_STORAGE_KEY, user.uid)]: mergedJobs,
		});
	} finally {
		isApplyingRemoteData = false;
	}

	await Promise.all(mergedJobs.map((job) => setDoc(doc(database, "users", user.uid, "jobs", job.id), job)));
	const mergedJobIds = new Set(mergedJobs.map((job) => job.id));
	await Promise.all(
		remoteJobsSnapshot.docs
			.filter(
				(job) =>
					deletedJobIds.includes(job.id) || !mergedJobIds.has(job.id),
			)
			.map((job) => deleteDoc(job.ref)),
	);
	await clearDeletedJobIds(deletedJobIds);

	const dashboard = await getStoredDashboardSettings();
	const theme = await getStoredThemePreference();
	const settingsRef = doc(database, "users", user.uid, "settings", "preferences");
	const remoteSettingsSnapshot = await getDoc(settingsRef);
	const remoteSettings = remoteSettingsSnapshot.exists()
		? remoteSettingsSnapshot.data()
		: null;

	if (
		remoteSettings &&
		typeof remoteSettings.updatedAt === "string" &&
		settings.lastSyncedAt &&
		Date.parse(remoteSettings.updatedAt) > Date.parse(settings.lastSyncedAt)
	) {
		await applyRemoteSettings(remoteSettings);
	} else {
		await setDoc(settingsRef, {
			dashboard,
			theme,
			updatedAt: new Date().toISOString(),
		});
	}

	await saveSyncSettings({
		...settings,
		lastSyncedAt: new Date().toISOString(),
		lastError: null,
	});
}

export function queueSync() {
	if (isApplyingRemoteData) {
		return;
	}

	syncQueued = true;
	if (syncTimer || retryTimer || syncInFlight) {
		return;
	}

	syncTimer = setTimeout(() => {
		syncTimer = null;
		syncQueued = false;
		void syncNow().catch((error: unknown) => {
			void recordSyncError(error);
			syncQueued = true;
			scheduleRetry();
		});
	}, 800);
}

export function startRemoteListeners() {
	stopRemoteListeners();

	const user = getFirebaseAuth().currentUser;
	if (!user) {
		return;
	}

	const database = getFirebaseDb();
	unsubscribeJobs = onSnapshot(
		collection(database, "users", user.uid, "jobs"),
		(snapshot) => {
			void applyRemoteJobs(
				snapshot.docs.map((job) => job.data() as StoredJob),
			).catch((error: unknown) => {
				void handleRemoteSyncError(error);
			});
		},
		(error) => {
			void handleRemoteSyncError(error);
		},
	);
	unsubscribeSettings = onSnapshot(
		doc(database, "users", user.uid, "settings", "preferences"),
		(snapshot) => {
			if (snapshot.exists()) {
				void applyRemoteSettings(snapshot.data()).catch((error: unknown) => {
					void handleRemoteSyncError(error);
				});
			}
		},
		(error) => {
			void handleRemoteSyncError(error);
		},
	);
}

export function stopRemoteListeners() {
	cancelQueuedSync();
	unsubscribeJobs?.();
	unsubscribeSettings?.();
	unsubscribeJobs = null;
	unsubscribeSettings = null;
}

export function isAccountSignOutInProgress() {
	return isSignOutInProgress;
}

export async function prepareForSignOut() {
	isSignOutInProgress = true;

	try {
		const user = getFirebaseAuth().currentUser;
		const settings = await getSyncSettings();

		if (syncInFlight) {
			await syncInFlight;
		} else if (user && settings.enabled) {
			await syncNow();
		}

		stopRemoteListeners();
		return user?.uid ?? activeAccountId;
	} catch (error) {
		isSignOutInProgress = false;
		throw error;
	}
}

export async function completeSignOut(accountId: string) {
	await clearLocalAccountData(accountId);
	activeAccountId = "anonymous";
	isApplyingRemoteData = false;
	isSignOutInProgress = false;
}

export function cancelSignOut() {
	isSignOutInProgress = false;
}

async function clearLocalAccountData(accountId: string) {
	const stored = await browser.storage.local.get(null);
	const accountScopedKeys = Object.keys(stored).filter((key) =>
		key.startsWith("applynza.accounts."),
	);
	const keysToRemove = [
		JOBS_STORAGE_KEY,
		LEGACY_JOBS_STORAGE_KEY,
		DELETED_JOBS_STORAGE_KEY,
		DASHBOARD_SETTINGS_STORAGE_KEY,
		LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY,
		THEME_STORAGE_KEY,
		LEGACY_THEME_STORAGE_KEY,
		SYNC_SETTINGS_STORAGE_KEY,
		ACTIVE_ACCOUNT_STORAGE_KEY,
		getAccountStorageKey(JOBS_STORAGE_KEY, accountId),
		getAccountStorageKey(DELETED_JOBS_STORAGE_KEY, accountId),
		getAccountStorageKey(DASHBOARD_SETTINGS_STORAGE_KEY, accountId),
		getAccountStorageKey(THEME_STORAGE_KEY, accountId),
		getAccountStorageKey(SYNC_SETTINGS_STORAGE_KEY, accountId),
		...accountScopedKeys,
	];

	await browser.storage.local.remove([...new Set(keysToRemove)]);
}

async function clearAccountCache(accountId: string) {
	await browser.storage.local.remove([
		getAccountStorageKey(JOBS_STORAGE_KEY, accountId),
		getAccountStorageKey(DELETED_JOBS_STORAGE_KEY, accountId),
		getAccountStorageKey(DASHBOARD_SETTINGS_STORAGE_KEY, accountId),
		getAccountStorageKey(THEME_STORAGE_KEY, accountId),
		getAccountStorageKey(SYNC_SETTINGS_STORAGE_KEY, accountId),
	]);
}

function cancelQueuedSync() {
	if (syncTimer) {
		clearTimeout(syncTimer);
		syncTimer = null;
	}
	if (retryTimer) {
		clearTimeout(retryTimer);
		retryTimer = null;
	}
	syncQueued = false;
	retryAttempt = 0;
}

function scheduleRetry() {
	if (retryTimer || !syncQueued) {
		return;
	}

	const delay = Math.min(30_000, 2_000 * 2 ** retryAttempt);
	retryAttempt = Math.min(retryAttempt + 1, 4);
	retryTimer = setTimeout(() => {
		retryTimer = null;
		syncQueued = false;
		void getSyncSettings()
			.then((settings) => {
				if (settings.enabled && getFirebaseAuth().currentUser) {
					void syncNow().catch((error: unknown) => {
						void recordSyncError(error);
						scheduleRetry();
					});
				}
			})
			.catch((error: unknown) => {
				void recordSyncError(error);
				scheduleRetry();
			});
	}, delay);
}

async function recordSyncError(error: unknown) {
	await saveSyncSettings({
		...(await getSyncSettings()),
		lastError: error instanceof Error ? error.message : "Sync failed.",
	});
}

async function persistActiveDataForAccount(accountId: string) {
	const stored = await browser.storage.local.get([
		JOBS_STORAGE_KEY,
		LEGACY_JOBS_STORAGE_KEY,
		DASHBOARD_SETTINGS_STORAGE_KEY,
		LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY,
		THEME_STORAGE_KEY,
		LEGACY_THEME_STORAGE_KEY,
	]);

	await Promise.all([
		saveJobsToAccountCache(
			accountId,
			stored[JOBS_STORAGE_KEY] ?? stored[LEGACY_JOBS_STORAGE_KEY],
		),
		saveDashboardSettingsToAccountCache(
			accountId,
			stored[DASHBOARD_SETTINGS_STORAGE_KEY] ??
				stored[LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY],
		),
		saveThemeToAccountCache(
			accountId,
			stored[THEME_STORAGE_KEY] ?? stored[LEGACY_THEME_STORAGE_KEY],
		),
	]);
}

async function getStoredActiveAccountId() {
	const stored = await browser.storage.local.get(ACTIVE_ACCOUNT_STORAGE_KEY);
	const accountId = stored[ACTIVE_ACCOUNT_STORAGE_KEY];

	return typeof accountId === "string" && accountId.length > 0
		? accountId
		: activeAccountId;
}

async function handleRemoteSyncError(error: unknown) {
	await recordSyncError(error);
	syncQueued = true;
	scheduleRetry();
}

export async function deleteRemoteData() {
	const user = getFirebaseAuth().currentUser;
	if (!user) {
		return;
	}

	const database = getFirebaseDb();
	const jobsSnapshot = await getDocs(collection(database, "users", user.uid, "jobs"));
	await Promise.all(jobsSnapshot.docs.map((job) => deleteDoc(job.ref)));
	await deleteDoc(doc(database, "users", user.uid, "settings", "preferences"));
}

async function applyRemoteJobs(remoteJobs: StoredJob[]) {
	if (isApplyingRemoteData) {
		return;
	}

	const localJobs = await getStoredJobs();
	const deletedJobIds = await getDeletedJobIds();
	const mergedJobs = mergeJobs(
		localJobs,
		remoteJobs.filter((job) => !deletedJobIds.includes(job.id)),
	);
	isApplyingRemoteData = true;
	try {
		await setLocalValueIfChanged({
			[JOBS_STORAGE_KEY]: mergedJobs,
			[LEGACY_JOBS_STORAGE_KEY]: mergedJobs,
			[getAccountStorageKey(JOBS_STORAGE_KEY)]: mergedJobs,
		});
	} finally {
		isApplyingRemoteData = false;
	}
}

async function applyRemoteSettings(data: Record<string, unknown>) {
	if (isApplyingRemoteData || !data.dashboard) {
		return;
	}

	isApplyingRemoteData = true;
	try {
		await setLocalValueIfChanged({
			"applynza.dashboard-settings": data.dashboard,
			"applypilot.dashboard-settings": data.dashboard,
			"applynza.theme": data.theme,
			"applypilot.theme": data.theme,
		});
	} finally {
		isApplyingRemoteData = false;
	}
}

function mergeJobs(localJobs: StoredJob[], remoteJobs: StoredJob[]) {
	const jobsById = new Map<string, StoredJob>();

	for (const job of [...localJobs, ...remoteJobs]) {
		const existing = jobsById.get(job.id);
		if (!existing || Date.parse(job.updatedAt) >= Date.parse(existing.updatedAt)) {
			jobsById.set(job.id, job);
		}
	}

	const jobsByDate = [...jobsById.values()].sort(
		(a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
	);

	return jobsByDate.filter(
		(job, index) =>
			index ===
			jobsByDate.findIndex((candidate) =>
				areStoredJobsDuplicates(candidate, job),
			),
	);
}

function isSyncableStorageKey(key: string) {
	return (
		key === "applynza.jobs" ||
		key === "applypilot.jobs" ||
		key === DELETED_JOBS_STORAGE_KEY ||
		key === "applynza.dashboard-settings" ||
		key === "applypilot.dashboard-settings" ||
		key === "applynza.theme" ||
		key === "applypilot.theme"
	);
}

async function setLocalValueIfChanged(values: Record<string, unknown>) {
	const current = await browser.storage.local.get(Object.keys(values));
	const hasChanges = Object.entries(values).some(
		([key, value]) => JSON.stringify(current[key]) !== JSON.stringify(value),
	);

	if (hasChanges) {
		await browser.storage.local.set(values);
	}
}

async function saveSyncSettings(settings: SyncSettings) {
	await browser.storage.local.set({
		[SYNC_SETTINGS_STORAGE_KEY]: settings,
		[getAccountStorageKey(SYNC_SETTINGS_STORAGE_KEY)]: settings,
	});
}
