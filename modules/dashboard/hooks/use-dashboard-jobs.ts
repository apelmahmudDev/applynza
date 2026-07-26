import { useCallback, useEffect, useMemo, useState } from "react";

import {
	deleteJobFromStorage,
	getStoredJobs,
	JOBS_STORAGE_KEY,
	updateJobInStorage,
} from "@/lib/jobs/storage";
import type { DashboardSortJobsBy } from "@/lib/settings/storage";
import type { ReminderFormValues } from "@/modules/dashboard/components/reminders/reminder-form.types";
import { buildAllJobsStats } from "@/modules/dashboard/data/dashboard-job-stats";
import {
	createDashboardJob,
	getDashboardJobs,
	updateDashboardJob,
	updateDashboardJobReminder,
} from "@/modules/dashboard/data/dashboard-job-mappers";
import type { DashboardJob } from "@/modules/dashboard/types";

export function useDashboardJobs(
	sortJobsBy: DashboardSortJobsBy = "last-updated",
) {
	const [jobs, setJobs] = useState<DashboardJob[]>([]);

	useEffect(() => {
		let isActive = true;

		const loadJobs = async () => {
			const nextJobs = sortDashboardJobs(await getDashboardJobs(), sortJobsBy);

			if (isActive) {
				setJobs(nextJobs);
			}
		};

		void loadJobs();

		const handleStorageChanged = (
			changes: Record<string, browser.storage.StorageChange>,
			areaName: string,
		) => {
			if (areaName === "local" && changes[JOBS_STORAGE_KEY]) {
				void loadJobs();
			}
		};

		browser.storage.onChanged.addListener(handleStorageChanged);

		return () => {
			isActive = false;
			browser.storage.onChanged.removeListener(handleStorageChanged);
		};
	}, [sortJobsBy]);

	const createJob = useCallback(async (job: DashboardJob) => {
		const nextJob = await createDashboardJob(job);
		setJobs((currentJobs) =>
			sortDashboardJobs([nextJob, ...currentJobs], sortJobsBy),
		);
	}, [sortJobsBy]);

	const saveJob = useCallback(async (job: DashboardJob) => {
		const nextJob = await updateDashboardJob(job);
		setJobs((currentJobs) =>
			sortDashboardJobs(
				currentJobs.map((currentJob) =>
					currentJob.id === nextJob.id ? nextJob : currentJob,
				),
				sortJobsBy,
			),
		);
	}, [sortJobsBy]);

	const saveReminder = useCallback(
		async (jobId: string, values: ReminderFormValues) => {
			const nextJob = await updateDashboardJobReminder(jobId, values);

			if (!nextJob) {
				return;
			}

			setJobs((currentJobs) =>
				sortDashboardJobs(
					currentJobs.map((currentJob) =>
						currentJob.id === nextJob.id ? nextJob : currentJob,
					),
					sortJobsBy,
				),
			);
		},
		[sortJobsBy],
	);

	const deleteJob = useCallback(async (jobId: string) => {
		const deleted = await deleteJobFromStorage(jobId);

		if (!deleted) {
			return false;
		}

		setJobs((currentJobs) =>
			currentJobs.filter((currentJob) => currentJob.id !== jobId),
		);

		return true;
	}, []);

	const markReminderDone = useCallback(async (jobId: string) => {
		const jobs = await getStoredJobs();
		const job = jobs.find((currentJob) => currentJob.id === jobId);

		if (!job) {
			return false;
		}

		const result = await updateJobInStorage(jobId, {
			...job,
			reminderDone: true,
		});

		setJobs((currentJobs) =>
			sortDashboardJobs(
				currentJobs.map((currentJob) =>
					currentJob.id === result.job.id ? result.job : currentJob,
				),
				sortJobsBy,
			),
		);

		return true;
	}, [sortJobsBy]);

	const stats = useMemo(() => buildAllJobsStats(jobs), [jobs]);

	return {
		jobs,
		stats,
		createJob,
		saveJob,
		saveReminder,
		deleteJob,
		markReminderDone,
	};
}

function sortDashboardJobs(
	jobs: DashboardJob[],
	sortJobsBy: DashboardSortJobsBy,
) {
	const nextJobs = [...jobs];

	if (sortJobsBy === "company") {
		return nextJobs.sort((firstJob, secondJob) =>
			firstJob.company.localeCompare(secondJob.company),
		);
	}

	const getDateValue = (value: string) => {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? 0 : date.getTime();
	};

	if (sortJobsBy === "date-created") {
		return nextJobs.sort(
			(firstJob, secondJob) =>
				getDateValue(secondJob.savedDate) - getDateValue(firstJob.savedDate),
		);
	}

	return nextJobs.sort(
		(firstJob, secondJob) =>
			getDateValue(secondJob.appliedDate) - getDateValue(firstJob.appliedDate),
	);
}
