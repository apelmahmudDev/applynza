import { useEffect, useMemo, useState } from "react";

import { getStoredJobs, JOBS_STORAGE_KEY } from "@/lib/jobs/storage";

export function useDashboardReminderCount() {
	const [count, setCount] = useState(0);

	useEffect(() => {
		if (typeof browser === "undefined" || !browser.storage?.onChanged) {
			return;
		}

		let isMounted = true;

		const loadReminderCount = async () => {
			try {
				const jobs = await getStoredJobs();
				const nextCount = jobs.filter(
					(job) =>
						job.reminderEnabled &&
						Boolean(job.followUpDate) &&
						!job.reminderDone,
				).length;

				if (isMounted) {
					setCount(nextCount);
				}
			} catch {
				if (isMounted) {
					setCount(0);
				}
			}
		};

		void loadReminderCount();

		const handleStorageChange = (
			changes: Record<string, browser.storage.StorageChange>,
			areaName: string,
		) => {
			if (areaName === "local" && changes[JOBS_STORAGE_KEY]) {
				void loadReminderCount();
			}
		};

		browser.storage.onChanged.addListener(handleStorageChange);

		return () => {
			isMounted = false;
			browser.storage.onChanged.removeListener(handleStorageChange);
		};
	}, []);

	return useMemo(() => (count > 0 ? String(count) : null), [count]);
}
