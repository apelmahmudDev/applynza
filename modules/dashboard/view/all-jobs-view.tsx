import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { StatsCardGrid } from "@/modules/dashboard/components/stats-card-grid";
import { JobDetailsDrawer } from "@/modules/dashboard/components/job-details/job-details-drawer";
import { JobFormDrawer } from "@/modules/dashboard/components/job-form/job-form-drawer";
import { ReminderFormDialog } from "@/modules/dashboard/components/reminders/reminder-form-dialog";
import { getReminderFormValues } from "@/modules/dashboard/components/reminders/reminder-form.utils";
import { useDashboardJobs } from "@/modules/dashboard/hooks/use-dashboard-jobs";
import { useDashboardSettings } from "@/modules/dashboard/hooks/use-dashboard-settings";
import type { DashboardStatusFilter } from "@/modules/dashboard/types";
import { getDashboardColumns } from "../components/job-table/columns";
import { DataTable } from "../components/job-table/data-table";

const statusFilters: Array<{ value: DashboardStatusFilter; label: string }> = [
	{ value: "saved", label: "Saved" },
	{ value: "applied", label: "Applied" },
	{ value: "interview", label: "Interview" },
	{ value: "offer", label: "Offer" },
];

export function AllJobsView() {
	const { settings } = useDashboardSettings();
	const { jobs, isLoading, stats, createJob, saveJob, saveReminder, deleteJob } =
		useDashboardJobs(settings.sortJobsBy);
	const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
	const [editingJobId, setEditingJobId] = useState<string | null>(null);
	const [isCreatingJob, setIsCreatingJob] = useState(false);
	const [reminderDialogJobId, setReminderDialogJobId] = useState<string | null>(
		null,
	);
	const [jobPendingDeleteId, setJobPendingDeleteId] = useState<string | null>(
		null,
	);
	const [isDeletingJob, setIsDeletingJob] = useState(false);

	const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
	const editingJob = jobs.find((job) => job.id === editingJobId) ?? null;
	const reminderDialogJob =
		jobs.find((job) => job.id === reminderDialogJobId) ?? null;
	const jobPendingDelete =
		jobs.find((job) => job.id === jobPendingDeleteId) ?? null;

	const confirmDeleteJob = async () => {
		if (!jobPendingDelete) {
			return;
		}

		setIsDeletingJob(true);

		try {
			const deleted = await deleteJob(jobPendingDelete.id);

			if (!deleted) {
				return;
			}

			if (selectedJobId === jobPendingDelete.id) {
				setSelectedJobId(null);
			}

			if (editingJobId === jobPendingDelete.id) {
				setEditingJobId(null);
			}

			if (reminderDialogJobId === jobPendingDelete.id) {
				setReminderDialogJobId(null);
			}

			setJobPendingDeleteId(null);
		} finally {
			setIsDeletingJob(false);
		}
	};

	return (
		<>
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
						setJobPendingDeleteId(null);
					}
				}}
				onConfirm={() => void confirmDeleteJob()}
			/>

			<DataTable
				columns={({ statusFilter }) =>
					getDashboardColumns({
						showStatus: false,
						statusFilter,
						onViewDetails: (job) => setSelectedJobId(job.id),
						onSetReminder: (job) => setReminderDialogJobId(job.id),
						onEditJob: (job) => setEditingJobId(job.id),
						onDeleteJob: (job) => setJobPendingDeleteId(job.id),
					})
				}
				data={jobs}
				isLoading={isLoading}
				toolbarMode="tabs-only"
				showStatusTabs={false}
				initialStatusFilter="saved"
				headerSlot={({ statusFilter, setStatusFilter, search, setSearch }) => (
					<section className="flex flex-col gap-5 pt-5 pb-2 xl:flex-row xl:items-center xl:justify-between">
						<div className="min-w-0">
							<h1 className="text-3xl font-bold tracking-[-0.05em] text-slate-950 dark:text-foreground">
								All Jobs
							</h1>
							<p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">
								Track and manage all your job applications in one place.
							</p>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
							<div className="relative w-full sm:w-[20rem] xl:w-[22rem]">
								<Search
									className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground"
									aria-hidden="true"
								/>
								<Input
									value={search}
									placeholder="Search jobs, companies, roles..."
									className="h-11 bg-white pl-11 pr-14 text-sm shadow-none dark:border-border dark:bg-card"
									onChange={(event) => setSearch(event.target.value)}
								/>
							</div>

							<Select
								value={statusFilter}
								onValueChange={(value) =>
									setStatusFilter(value as DashboardStatusFilter)
								}
							>
								<SelectTrigger className="h-11! w-full bg-white font-semibold shadow-none sm:w-40 dark:border-border dark:bg-card">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{statusFilters.map((filter) => (
										<SelectItem key={filter.value} value={filter.value}>
											{filter.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Button
								className="h-11 px-4"
								onClick={() => setIsCreatingJob(true)}
							>
								<Plus className="size-4" aria-hidden="true" />
								Add Job
							</Button>
						</div>
					</section>
				)}
				statsSlot={<StatsCardGrid stats={stats} />}
			/>

			<JobDetailsDrawer
				job={selectedJob}
				open={selectedJob !== null}
				onAddReminder={(job) => setReminderDialogJobId(job.id)}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedJobId(null);
					}
				}}
			/>

			{reminderDialogJob ? (
				<ReminderFormDialog
					open={reminderDialogJob !== null}
					initialValues={getReminderFormValues(
						reminderDialogJob.reminderDetails ?? null,
					)}
					onOpenChange={(open) => {
						if (!open) {
							setReminderDialogJobId(null);
						}
					}}
					onSubmit={async (values) => {
						await saveReminder(reminderDialogJob.id, values);
					}}
				/>
			) : null}

			{isCreatingJob ? (
				<JobFormDrawer
					key="create-job"
					mode="create"
					open={isCreatingJob}
					onOpenChange={setIsCreatingJob}
					defaultStatus={settings.defaultStatus}
					onSubmit={async (job) => {
						await createJob(job);
					}}
				/>
			) : null}

			{editingJob ? (
				<JobFormDrawer
					key={editingJob.id}
					job={editingJob}
					mode="edit"
					open={editingJob !== null}
					onOpenChange={(open) => {
						if (!open) {
							setEditingJobId(null);
						}
					}}
					onSubmit={async (nextJob) => {
						await saveJob(nextJob);
					}}
				/>
			) : null}
		</>
	);
}
