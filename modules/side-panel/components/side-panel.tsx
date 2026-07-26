import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Toaster } from "@/components/ui/sonner";
import { useThemePreference } from "@/hooks/use-theme-preference";
import {
	createJobInStorage,
	deleteJobFromStorage,
	getStoredJobs,
	JOBS_STORAGE_KEY,
	saveJobToStorage,
	updateJobInStorage,
	type StoredJob,
} from "@/lib/jobs/storage";
import { cn } from "@/lib/utils";
import { ReminderFormDialog } from "@/modules/dashboard/components/reminders/reminder-form-dialog";
import type { ReminderFormValues } from "@/modules/dashboard/components/reminders/reminder-form.types";
import { JobFormPanel } from "@/modules/side-panel/components/job-form-panel";
import { useSidePanelDetection } from "@/modules/side-panel/hooks/use-side-panel-detection";
import { emptyJobForm } from "@/modules/side-panel/mock-data";
import type {
	ApplicationFilter,
	DetailsBackView,
	ReminderFilter,
	SidePanelJobForm,
	SidePanelView,
} from "@/modules/side-panel/types";
import { nextStatusByStatus } from "@/modules/side-panel/utils/constants";
import {
	mapJobStatus,
	mapStoredJobToRecentJob,
	toSidePanelJobForm,
	toStoredJobForm,
} from "@/modules/side-panel/utils/job-mappers";
import {
	compareReminders,
	isReminderUpcoming,
	mapStoredJobToReminder,
} from "@/modules/side-panel/utils/reminders";
import {
	applyReminderFormValuesToStoredJob,
	getStoredJobReminderFormValues,
} from "@/modules/side-panel/utils/reminder-form";
import { AllApplicationsView } from "@/modules/side-panel/views/all-applications-view";
import { AllRemindersView } from "@/modules/side-panel/views/all-reminders-view";
import { HomeView } from "@/modules/side-panel/views/home-view";
import { JobDetailsView } from "@/modules/side-panel/views/job-details-view";
import { ReminderDetailsView } from "@/modules/side-panel/views/reminder-details-view";

export function SidePanel() {
	const { isDarkMode } = useThemePreference();
	const [storedJobs, setStoredJobs] = useState<StoredJob[]>([]);
	const [panelView, setPanelView] = useState<SidePanelView>("home");
	const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
	const [selectedReminderId, setSelectedReminderId] = useState<string | null>(
		null,
	);
	const [detailsBackView, setDetailsBackView] =
		useState<DetailsBackView>("home");
	const [applicationSearch, setApplicationSearch] = useState("");
	const [applicationFilter, setApplicationFilter] =
		useState<ApplicationFilter>("All");
	const [reminderSearch, setReminderSearch] = useState("");
	const [reminderFilter, setReminderFilter] = useState<ReminderFilter>("Today");
	const [isSaving, setIsSaving] = useState(false);
	const [jobPendingDelete, setJobPendingDelete] = useState<StoredJob | null>(
		null,
	);
	const [isDeletingJob, setIsDeletingJob] = useState(false);
	const [reminderDialogJobId, setReminderDialogJobId] = useState<string | null>(
		null,
	);
	const [activeForm, setActiveForm] = useState<{
		mode: "add" | "edit";
		jobId?: string;
		job: SidePanelJobForm;
	} | null>(null);
	const {
		job: detectedJob,
		isDetecting,
		isAnalyzing,
		isAnalysisAvailable,
		error: detectionError,
		confidence,
		retryDetection,
		analyzeCurrentJob,
	} = useSidePanelDetection();

	useEffect(() => {
		let isMounted = true;

		async function loadJobs() {
			const jobs = await getStoredJobs();

			if (isMounted) {
				setStoredJobs(jobs);
			}
		}

		loadJobs();

		const handleStorageChange: Parameters<
			typeof browser.storage.onChanged.addListener
		>[0] = (changes, areaName) => {
			if (areaName === "local" && changes[JOBS_STORAGE_KEY]) {
				loadJobs();
			}
		};

		browser.storage.onChanged.addListener(handleStorageChange);

		return () => {
			isMounted = false;
			browser.storage.onChanged.removeListener(handleStorageChange);
		};
	}, []);

	const displayedJobs = useMemo(
		() => storedJobs.slice(0, 4).map(mapStoredJobToRecentJob),
		[storedJobs],
	);
	const selectedJob = useMemo(
		() => storedJobs.find((job) => job.id === selectedJobId) ?? null,
		[selectedJobId, storedJobs],
	);
	const allApplicationJobs = useMemo(() => {
		const search = applicationSearch.trim().toLowerCase();

		return storedJobs
			.filter((job) => {
				const status = mapJobStatus(job.status);
				const matchesFilter =
					applicationFilter === "All" || status === applicationFilter;
				const matchesSearch =
					!search ||
					[job.title, job.company, job.location, job.notes]
						.join(" ")
						.toLowerCase()
						.includes(search);

				return matchesFilter && matchesSearch;
			})
			.sort(
				(firstJob, secondJob) =>
					new Date(secondJob.updatedAt).getTime() -
					new Date(firstJob.updatedAt).getTime(),
			);
	}, [applicationFilter, applicationSearch, storedJobs]);
	const reminders = useMemo(
		() =>
			storedJobs
				.map(mapStoredJobToReminder)
				.filter((reminder) => reminder !== null)
				.sort(compareReminders),
		[storedJobs],
	);
	const completedReminders = useMemo(
		() =>
			storedJobs
				.filter(
					(job) => job.reminderEnabled && job.reminderDone && job.followUpDate,
				)
				.map((job) => {
					const baseReminder = mapStoredJobToReminder({
						...job,
						reminderDone: false,
					});

					if (!baseReminder) {
						return null;
					}

					return {
						...baseReminder,
						isCompleted: true,
						statusLabel: "Completed",
						statusTone: "completed" as const,
					};
				})
				.filter((reminder) => reminder !== null)
				.sort(compareReminders),
		[storedJobs],
	);
	const visibleReminders = useMemo(() => {
		const search = reminderSearch.trim().toLowerCase();

		const sourceReminders =
			reminderFilter === "Completed"
				? completedReminders
				: reminderFilter === "Upcoming"
					? reminders.filter(isReminderUpcoming)
					: reminders.filter((reminder) => !isReminderUpcoming(reminder));

		return sourceReminders.filter((reminder) => {
			if (!search) {
				return true;
			}

			return [
				reminder.title,
				reminder.company,
				reminder.description,
				reminder.reminderType,
				reminder.statusLabel,
				reminder.timeLabel,
			]
				.join(" ")
				.toLowerCase()
				.includes(search);
		});
	}, [completedReminders, reminderFilter, reminderSearch, reminders]);
	const selectedReminder = useMemo(
		() =>
			[...reminders, ...completedReminders].find(
				(reminder) => reminder.id === selectedReminderId,
			) ?? null,
		[completedReminders, reminders, selectedReminderId],
	);
	const selectedReminderJob = useMemo(
		() =>
			selectedReminder
				? storedJobs.find((job) => job.id === selectedReminder.jobId) ?? null
				: null,
		[selectedReminder, storedJobs],
	);
	const reminderDialogJob = useMemo(
		() => storedJobs.find((job) => job.id === reminderDialogJobId) ?? null,
		[reminderDialogJobId, storedJobs],
	);

	const savedCount = storedJobs.length;
	const appliedCount = storedJobs.filter(
		(job) => job.status === "Applied",
	).length;
	const interviewCount = storedJobs.filter(
		(job) => job.status === "Interviewing",
	).length;

	const handleSaveJob = async (job: SidePanelJobForm) => {
		setIsSaving(true);

		try {
			const result =
				activeForm?.mode === "add"
					? await createJobInStorage(toStoredJobForm(job))
					: activeForm?.jobId
						? await updateJobInStorage(activeForm.jobId, toStoredJobForm(job))
						: await saveJobToStorage(toStoredJobForm(job));
			setStoredJobs((currentJobs) => {
				const withoutSavedJob = currentJobs.filter(
					(currentJob) => currentJob.id !== result.job.id,
				);

				return [result.job, ...withoutSavedJob];
			});
			toast.success(
				result.action === "updated"
					? "Saved changes to this job."
					: "Saved this job locally.",
			);
			setActiveForm(null);
		} catch {
			toast.error("Could not save this job. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleCycleJobStatus = async (job: StoredJob) => {
		try {
			const result = await updateJobInStorage(job.id, {
				...job,
				status: nextStatusByStatus[job.status],
			});

			setStoredJobs((currentJobs) =>
				currentJobs.map((currentJob) =>
					currentJob.id === result.job.id ? result.job : currentJob,
				),
			);
		} catch {
			toast.error("Could not update this job. Please try again.");
		}
	};

	const handleDeleteJob = async (job: StoredJob) => {
		setJobPendingDelete(job);
	};

	const confirmDeleteJob = async () => {
		if (!jobPendingDelete) {
			return;
		}

		setIsDeletingJob(true);

		try {
			const deleted = await deleteJobFromStorage(jobPendingDelete.id);

			if (!deleted) {
				toast.error("Could not delete this job. Please try again.");
				return;
			}

			setStoredJobs((currentJobs) =>
				currentJobs.filter(
					(currentJob) => currentJob.id !== jobPendingDelete.id,
				),
			);
			setSelectedJobId(null);
			setPanelView(detailsBackView);
			toast.success("Deleted this job.");
			setJobPendingDelete(null);
		} catch {
			toast.error("Could not delete this job. Please try again.");
		} finally {
			setIsDeletingJob(false);
		}
	};

	const openJobDetails = (jobId: string, backView: DetailsBackView) => {
		setSelectedJobId(jobId);
		setDetailsBackView(backView);
		setPanelView("jobDetails");
	};

	const openReminderDetails = (
		reminderId: string,
		backView: DetailsBackView,
	) => {
		setSelectedReminderId(reminderId);
		setDetailsBackView(backView);
		setPanelView("reminderDetails");
	};

	const markReminderDone = async (reminderId: string) => {
		const reminderJob = storedJobs.find((job) => job.id === reminderId);

		if (!reminderJob) {
			return;
		}

		try {
			const result = await updateJobInStorage(reminderJob.id, {
				...reminderJob,
				reminderDone: true,
			});

			setStoredJobs((currentJobs) =>
				currentJobs.map((currentJob) =>
					currentJob.id === result.job.id ? result.job : currentJob,
				),
			);
			toast.success("Marked this reminder as done.");
		} catch {
			toast.error("Could not mark this reminder as done. Please try again.");
		}
	};

	const removeReminder = async (reminderId: string) => {
		const reminderJob = storedJobs.find((job) => job.id === reminderId);

		if (!reminderJob) {
			return;
		}

		try {
			const result = await updateJobInStorage(reminderJob.id, {
				...reminderJob,
				followUpDate: "",
				followUpTime: "",
				reminderNote: "",
				reminderEnabled: false,
				reminderDone: false,
			});

			setStoredJobs((currentJobs) =>
				currentJobs.map((currentJob) =>
					currentJob.id === result.job.id ? result.job : currentJob,
				),
			);
			if (selectedReminderId === reminderId) {
				setPanelView(detailsBackView);
			}
		} catch {
			toast.error("Could not remove this reminder. Please try again.");
		}
	};

	const saveReminder = async (values: ReminderFormValues) => {
		if (!reminderDialogJob) {
			return;
		}

		try {
			const result = await updateJobInStorage(
				reminderDialogJob.id,
				applyReminderFormValuesToStoredJob(reminderDialogJob, values),
			);

			setStoredJobs((currentJobs) =>
				currentJobs.map((currentJob) =>
					currentJob.id === result.job.id ? result.job : currentJob,
				),
			);
			setReminderDialogJobId(null);
			toast.success(
				reminderDialogJob.followUpDate
					? "Updated this reminder."
					: "Created this reminder.",
			);
		} catch {
			toast.error("Could not save this reminder. Please try again.");
		}
	};

	const openAddJobForm = () => {
		setActiveForm({ mode: "add", job: emptyJobForm });
	};

	return (
		<>
			<main className="h-screen min-h-[640px] mx-auto max-w-3xl overflow-hidden bg-white dark:bg-background text-foreground transition-colors">
				<ConfirmDialog
					open={Boolean(jobPendingDelete)}
					title="Delete this job?"
					description={
						<>
							You're about to permanently delete{" "}
							<span className="font-semibold text-foreground">
								{jobPendingDelete?.title || "this job"}
							</span>
							. This action can't be undone.
						</>
					}
					confirmLabel="Delete"
					cancelLabel="Keep job"
					confirmingLabel="Deleting..."
					isConfirming={isDeletingJob}
					onOpenChange={(open) => {
						if (!open && !isDeletingJob) {
							setJobPendingDelete(null);
						}
					}}
					onConfirm={() => void confirmDeleteJob()}
				/>
				<div className="flex h-full flex-col overflow-hidden transition-colors">
					{reminderDialogJob ? (
						<ReminderFormDialog
							open={reminderDialogJob !== null}
							title={
								reminderDialogJob.followUpDate
									? "Update Reminder"
									: "Create Reminder"
							}
							submitLabel={
								reminderDialogJob.followUpDate
									? "Update Reminder"
									: "Save Reminder"
							}
							contentClassName="w-[calc(100%-1.5rem)] max-w-none rounded-xl"
							fieldGridClassName="grid-cols-2 md:grid-cols-2"
							footerClassName="grid grid-cols-2 gap-3 sm:grid-cols-2"
							initialValues={getStoredJobReminderFormValues(reminderDialogJob)}
							onOpenChange={(open) => {
								if (!open) {
									setReminderDialogJobId(null);
								}
							}}
							onSubmit={(values) => {
								void saveReminder(values);
							}}
						/>
					) : null}
					{activeForm ? (
						<JobFormPanel
							mode={activeForm.mode}
							initialJob={activeForm.job}
							isDarkMode={isDarkMode}
							onCancel={() => setActiveForm(null)}
							onSave={handleSaveJob}
						/>
					) : panelView === "jobDetails" ? (
						<JobDetailsView
							job={selectedJob}
							isDarkMode={isDarkMode}
							onAddJob={openAddJobForm}
							onBack={() => setPanelView(detailsBackView)}
							onEdit={(job) =>
								setActiveForm({
									mode: "edit",
									jobId: job.id,
									job: toSidePanelJobForm(job),
								})
							}
							onStatusChange={handleCycleJobStatus}
							onDelete={handleDeleteJob}
							onUpdateReminder={(job) => setReminderDialogJobId(job.id)}
							onRemoveReminder={removeReminder}
						/>
					) : panelView === "reminderDetails" ? (
						<ReminderDetailsView
							reminder={selectedReminder}
							job={selectedReminderJob}
							isDarkMode={isDarkMode}
							onBack={() => setPanelView(detailsBackView)}
							onUpdateReminder={(job) => setReminderDialogJobId(job.id)}
							onMarkDone={markReminderDone}
							onRemoveReminder={removeReminder}
						/>
					) : panelView === "applications" ? (
						<AllApplicationsView
							jobs={allApplicationJobs}
							search={applicationSearch}
							filter={applicationFilter}
							isDarkMode={isDarkMode}
							onBack={() => setPanelView("home")}
							onAddJob={openAddJobForm}
							onSearchChange={setApplicationSearch}
							onFilterChange={setApplicationFilter}
							onStatusChange={handleCycleJobStatus}
							onOpenJob={(job) => openJobDetails(job.id, "applications")}
						/>
					) : panelView === "reminders" ? (
						<AllRemindersView
							reminders={visibleReminders}
							search={reminderSearch}
							filter={reminderFilter}
							isDarkMode={isDarkMode}
							onBack={() => setPanelView("home")}
							onAddJob={openAddJobForm}
							onSearchChange={setReminderSearch}
							onFilterChange={setReminderFilter}
							onOpenReminder={(reminder) =>
								openReminderDetails(reminder.id, "reminders")
							}
							onMarkDone={markReminderDone}
						/>
					) : (
						<HomeView
							isDarkMode={isDarkMode}
							displayedJobs={displayedJobs}
							reminders={reminders}
							detectedJob={detectedJob}
							isDetecting={isDetecting}
							detectionError={detectionError}
							confidence={confidence}
							isAnalyzing={isAnalyzing}
							isAnalysisAvailable={isAnalysisAvailable}
							isSaving={isSaving}
							savedCount={savedCount}
							appliedCount={appliedCount}
							interviewCount={interviewCount}
							onAddJob={openAddJobForm}
							onEditDetectedJob={() => {
								if (detectedJob) {
									setActiveForm({ mode: "edit", job: detectedJob });
								}
							}}
							onAnalyzeDetectedJob={() => {
								void analyzeCurrentJob()
									.then(() => {
										toast.success(
											"Job details updated from the page analysis.",
										);
									})
									.catch((analysisError) => {
										const message =
											analysisError instanceof Error
												? analysisError.message
												: "Could not analyze this page right now.";
										toast.error(message);
									});
							}}
							onSaveDetectedJob={() => {
								if (detectedJob) {
									void handleSaveJob(detectedJob);
								}
							}}
							onRetryDetection={retryDetection}
							onOpenJob={(jobId) => openJobDetails(jobId, "home")}
							onOpenReminder={(reminderId) =>
								openReminderDetails(reminderId, "home")
							}
							onOpenApplications={() => setPanelView("applications")}
							onOpenReminders={() => setPanelView("reminders")}
							onMarkReminderDone={markReminderDone}
						/>
					)}
				</div>
			</main>
			<Toaster position="bottom-center" richColors />
		</>
	);
}
