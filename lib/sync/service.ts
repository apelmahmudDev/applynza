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
import { getStoredDashboardSettings } from "@/lib/settings/storage";
import { getStoredThemePreference } from "@/lib/theme/storage";
import { getStoredJobs, type StoredJob } from "@/lib/jobs/storage";

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
let isApplyingRemoteData = false;
let unsubscribeJobs: Unsubscribe | null = null;
let unsubscribeSettings: Unsubscribe | null = null;
let isStorageSyncListenerRegistered = false;

export async function getSyncSettings(): Promise<SyncSettings> {
	const stored = await browser.storage.local.get(SYNC_SETTINGS_STORAGE_KEY);
	const settings = stored[SYNC_SETTINGS_STORAGE_KEY];

	if (!settings || typeof settings !== "object") {
		return defaultSyncSettings;
	}

	const value = settings as Partial<SyncSettings>;
	return {
		enabled: value.enabled === true,
		lastSyncedAt: typeof value.lastSyncedAt === "string" ? value.lastSyncedAt : null,
		lastError: typeof value.lastError === "string" ? value.lastError : null,
	};
}

export async function setSyncEnabled(enabled: boolean) {
	const settings = await getSyncSettings();
	await saveSyncSettings({ ...settings, enabled, lastError: null });

	if (!enabled) {
		stopRemoteListeners();
		return;
	}

	await syncNow();
	startRemoteListeners();
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

		void getSyncSettings().then((settings) => {
			if (
				isFirebaseConfigured() &&
				settings.enabled &&
				getFirebaseAuth().currentUser
			) {
				queueSync();
			}
		});
	});
}

export async function syncNow() {
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
	const remoteJobsSnapshot = await getDocs(collection(database, "users", user.uid, "jobs"));
	const remoteJobs = remoteJobsSnapshot.docs.map((job) => job.data() as StoredJob);
	const mergedJobs = mergeJobs(jobs, remoteJobs);

	isApplyingRemoteData = true;
	try {
		await setLocalValueIfChanged({
			"applynza.jobs": mergedJobs,
			"applypilot.jobs": mergedJobs,
		});
	} finally {
		isApplyingRemoteData = false;
	}

	await Promise.all(mergedJobs.map((job) => setDoc(doc(database, "users", user.uid, "jobs", job.id), job)));

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
	if (isApplyingRemoteData || syncTimer) {
		return;
	}

	syncTimer = setTimeout(() => {
		syncTimer = null;
		void syncNow().catch(async (error) => {
			await saveSyncSettings({
				...(await getSyncSettings()),
				lastError: error instanceof Error ? error.message : "Sync failed.",
			});
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
			void applyRemoteJobs(snapshot.docs.map((job) => job.data() as StoredJob));
		},
	);
	unsubscribeSettings = onSnapshot(
		doc(database, "users", user.uid, "settings", "preferences"),
		(snapshot) => {
			if (snapshot.exists()) {
				void applyRemoteSettings(snapshot.data());
			}
		},
	);
}

export function stopRemoteListeners() {
	unsubscribeJobs?.();
	unsubscribeSettings?.();
	unsubscribeJobs = null;
	unsubscribeSettings = null;
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
	const mergedJobs = mergeJobs(localJobs, remoteJobs);
	isApplyingRemoteData = true;
	try {
		await setLocalValueIfChanged({
			"applynza.jobs": mergedJobs,
			"applypilot.jobs": mergedJobs,
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

	return [...jobsById.values()].sort(
		(a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
	);
}

function isSyncableStorageKey(key: string) {
	return (
		key === "applynza.jobs" ||
		key === "applypilot.jobs" ||
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
	await browser.storage.local.set({ [SYNC_SETTINGS_STORAGE_KEY]: settings });
}
