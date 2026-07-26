import { useEffect, useMemo, useState } from "react";

import {
	getStoredJobs,
	JOBS_STORAGE_KEY,
	type StoredJob,
} from "@/lib/jobs/storage";
import {
	buildDashboardAnalytics,
	type AnalyticsRange,
} from "@/modules/dashboard/data/dashboard-analytics";

export function useDashboardAnalytics(range: AnalyticsRange) {
	const [jobs, setJobs] = useState<StoredJob[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let isActive = true;

		const loadJobs = async () => {
			const nextJobs = await getStoredJobs();

			if (isActive) {
				setJobs(nextJobs);
				setIsLoading(false);
			}
		};

		void loadJobs();

		const handleStorageChanged: Parameters<
			typeof browser.storage.onChanged.addListener
		>[0] = (changes, areaName) => {
			if (areaName === "local" && changes[JOBS_STORAGE_KEY]) {
				void loadJobs();
			}
		};

		browser.storage.onChanged.addListener(handleStorageChanged);

		return () => {
			isActive = false;
			browser.storage.onChanged.removeListener(handleStorageChanged);
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
