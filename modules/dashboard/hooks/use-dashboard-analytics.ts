import { useEffect, useMemo, useState } from "react";

import {
	getStoredJobs,
	JOBS_STORAGE_KEY,
	LEGACY_JOBS_STORAGE_KEY,
	type StoredJob,
} from "@/lib/jobs/storage";
import {
	ACTIVE_ACCOUNT_STORAGE_KEY,
	ACCOUNT_CHANGED_EVENT,
	getAccountStorageKey,
	waitForAuthInitialization,
} from "@/lib/storage/account";
import {
	buildDashboardAnalytics,
	type AnalyticsRange,
} from "@/modules/dashboard/data/dashboard-analytics";

export function useDashboardAnalytics(range: AnalyticsRange) {
	const [jobs, setJobs] = useState<StoredJob[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let isActive = true;
		let latestLoadId = 0;

		const loadJobs = async () => {
			const loadId = ++latestLoadId;
			await waitForAuthInitialization();
			const nextJobs = await getStoredJobs();

			if (isActive && loadId === latestLoadId) {
				setJobs(nextJobs);
				setIsLoading(false);
			}
		};

		void loadJobs();

		const handleStorageChanged: Parameters<
			typeof browser.storage.onChanged.addListener
		>[0] = (changes, areaName) => {
			if (
				areaName === "local" &&
				(changes[JOBS_STORAGE_KEY] ||
					changes[LEGACY_JOBS_STORAGE_KEY] ||
					changes[ACTIVE_ACCOUNT_STORAGE_KEY] ||
					changes[getAccountStorageKey(JOBS_STORAGE_KEY)])
			) {
				void loadJobs();
			}
		};

		browser.storage.onChanged.addListener(handleStorageChanged);
		window.addEventListener(ACCOUNT_CHANGED_EVENT, loadJobs);

		return () => {
			isActive = false;
			browser.storage.onChanged.removeListener(handleStorageChanged);
			window.removeEventListener(ACCOUNT_CHANGED_EVENT, loadJobs);
		};
	}, []);

	const analytics = useMemo(
		() => buildDashboardAnalytics(jobs, range, new Date()),
		[jobs, range],
	);

	return {
		analytics,
		isLoading,
	};
}
