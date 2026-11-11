import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getAppVersion } from "@/lib/app-version";
import {
	DASHBOARD_SETTINGS_STORAGE_KEY,
	defaultDashboardSettings,
	getStoredDashboardSettings,
	updateStoredDashboardSettings,
	type DashboardSettings,
} from "@/lib/settings/storage";

const LOCAL_STORAGE_BUDGET_BYTES = 10 * 1024 * 1024;

export function useDashboardSettings() {
	const [settings, setSettings] = useState<DashboardSettings>(
		defaultDashboardSettings,
	);
	const [isLoading, setIsLoading] = useState(true);
	const [isClearingData, setIsClearingData] = useState(false);
	const [storageUsedBytes, setStorageUsedBytes] = useState(0);

	useEffect(() => {
		let isMounted = true;

		const loadSettings = async () => {
			try {
				const [nextSettings, nextStorageUsedBytes] = await Promise.all([
					getStoredDashboardSettings(),
					getStorageUsedBytes(),
				]);

				if (!isMounted) {
					return;
				}

				setSettings(nextSettings);
				setStorageUsedBytes(nextStorageUsedBytes);
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};

		void loadSettings();

		const handleStorageChange: Parameters<
			typeof browser.storage.onChanged.addListener
		>[0] = async (changes, areaName) => {
			if (areaName !== "local") {
				return;
			}

			if (changes[DASHBOARD_SETTINGS_STORAGE_KEY]) {
				const nextSettings = await getStoredDashboardSettings();

				if (isMounted) {
					setSettings(nextSettings);
				}
			}

			if (isMounted) {
				setStorageUsedBytes(await getStorageUsedBytes());
			}
		};

		browser.storage.onChanged.addListener(handleStorageChange);

		return () => {
			isMounted = false;
			browser.storage.onChanged.removeListener(handleStorageChange);
		};
	}, []);

	const updateSetting = useCallback(
		async <K extends keyof DashboardSettings>(
			key: K,
			value: DashboardSettings[K],
		) => {
			const nextSettings = await updateStoredDashboardSettings({ [key]: value });
			setSettings(nextSettings);
			toast.success("Updated your settings.");
		},
		[],
	);

	const clearAllData = useCallback(async () => {
		setIsClearingData(true);

		try {
			await import("@/lib/sync/service").then(({ setSyncEnabled }) =>
				setSyncEnabled(false),
			);
			await browser.storage.local.clear();
			setSettings(defaultDashboardSettings);
			setStorageUsedBytes(0);
			toast.success("Cleared all locally stored data.");
		} catch {
			toast.error("Could not clear local data. Please try again.");
		} finally {
			setIsClearingData(false);
		}
	}, []);

	const storageUsedLabel = useMemo(
		() => formatBytes(storageUsedBytes),
		[storageUsedBytes],
	);
	const storageUsedPercent = useMemo(
		() => Math.min(100, Math.round((storageUsedBytes / LOCAL_STORAGE_BUDGET_BYTES) * 100)),
		[storageUsedBytes],
	);
	const appVersion = useMemo(() => getAppVersion(), []);

	return {
		settings,
		isLoading,
		isClearingData,
		storageUsedBytes,
		storageUsedLabel,
		storageUsedPercent,
		appVersion,
		updateSetting,
		clearAllData,
	};
}

async function getStorageUsedBytes() {
	if (typeof browser === "undefined" || !browser.storage?.local) {
		return 0;
	}

	try {
		return await browser.storage.local.getBytesInUse(null);
	} catch {
		const snapshot = await browser.storage.local.get(null);
		return new TextEncoder().encode(JSON.stringify(snapshot)).length;
	}
}

function formatBytes(bytes: number) {
	if (bytes < 1024) {
		return `${bytes} B`;
	}

	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}

	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
