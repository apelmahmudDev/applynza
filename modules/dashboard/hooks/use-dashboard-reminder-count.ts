import { useEffect, useMemo, useState } from "react";

import {
	getStoredJobs,
	JOBS_STORAGE_KEY,
	LEGACY_JOBS_STORAGE_KEY,
} from "@/lib/jobs/storage";
import {
	ACTIVE_ACCOUNT_STORAGE_KEY,
	ACCOUNT_CHANGED_EVENT,
	getAccountStorageKey,
	waitForAuthInitialization,
} from "@/lib/storage/account";

export function useDashboardReminderCount() {
	const [count, setCount] = useState(0);

	useEffect(() => {
		if (typeof browser === "undefined" || !browser.storage?.onChanged) {
			return;
		}

		let isMounted = true;
		let latestLoadId = 0;

		const loadReminderCount = async () => {
			const loadId = ++latestLoadId;
			try {
				await waitForAuthInitialization();
				const jobs = await getStoredJobs();
				const nextCount = jobs.filter(
					(job) =>
						job.reminderEnabled &&
						Boolean(job.followUpDate) &&
						!job.reminderDone,
				).length;

				if (isMounted && loadId === latestLoadId) {
					setCount(nextCount);
				}
			} catch {
				if (isMounted && loadId === latestLoadId) {
					setCount(0);
				}
			}
		};

		void loadReminderCount();

		const handleStorageChange = (
			changes: Record<string, browser.storage.StorageChange>,
			areaName: string,
		) => {
			if (
				areaName === "local" &&
				(changes[JOBS_STORAGE_KEY] ||
					changes[LEGACY_JOBS_STORAGE_KEY] ||
					changes[ACTIVE_ACCOUNT_STORAGE_KEY] ||
					changes[getAccountStorageKey(JOBS_STORAGE_KEY)])
			) {
				void loadReminderCount();
			}
		};

		browser.storage.onChanged.addListener(handleStorageChange);
		window.addEventListener(ACCOUNT_CHANGED_EVENT, loadReminderCount);

		return () => {
			isMounted = false;
			browser.storage.onChanged.removeListener(handleStorageChange);
			window.removeEventListener(ACCOUNT_CHANGED_EVENT, loadReminderCount);
		};
	}, []);

	return useMemo(() => (count > 0 ? String(count) : null), [count]);
}
