import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { JobDetailsDrawer } from "@/modules/dashboard/components/job-details/job-details-drawer";
import { ReminderFormDialog } from "@/modules/dashboard/components/reminders/reminder-form-dialog";
import { reminderTypeOptions } from "@/modules/dashboard/components/reminders/reminder-form.types";
import { getReminderFormValues } from "@/modules/dashboard/components/reminders/reminder-form.utils";
import { RemindersDatePicker } from "@/modules/dashboard/components/reminders/reminders-date-picker";
import { RemindersStats } from "@/modules/dashboard/components/reminders/reminders-stats";
import { RemindersSkeleton } from "@/modules/dashboard/components/reminders/reminders-skeleton";
import { RemindersTableSection } from "@/modules/dashboard/components/reminders/reminders-table-section";
import type { ReminderRow } from "@/modules/dashboard/components/reminders/types";
import { useDashboardReminders } from "@/modules/dashboard/hooks/use-dashboard-reminders";

export function RemindersView() {
	const {
		jobs,
		search,
		setSearch,
		selectedReminderType,
		setSelectedReminderType,
		selectedDate,
		setSelectedDate,
		sections,
		stats,
		totalVisibleReminders,
		isLoading,
		saveReminder,
		markReminderDone,
	} = useDashboardReminders();
	const [editingReminder, setEditingReminder] = useState<ReminderRow | null>(null);
	const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
	const [selectedReminderRow, setSelectedReminderRow] = useState<ReminderRow | null>(
		null,
	);

	const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
	const jobsById = new Map(jobs.map((job) => [job.id, job]));

	return (
		<div>
			<section className="mb-5 flex flex-col gap-5 pt-5 pb-2 xl:flex-row xl:items-center xl:justify-between">
				<div className="min-w-0">
					<h1 className="text-3xl font-bold tracking-[-0.05em] text-slate-950 dark:text-foreground">
						Reminders
					</h1>
					<p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">
						Never miss an important follow-up.
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
							placeholder="Search jobs, companies..."
							className="h-11 bg-white pl-11 pr-14 text-sm shadow-none dark:border-border dark:bg-card"
							onChange={(event) => setSearch(event.target.value)}
						/>
					</div>

					<Select
						value={selectedReminderType}
						onValueChange={(value) =>
							setSelectedReminderType(
								value as (typeof reminderTypeOptions)[number] | "all",
							)
						}
					>
						<SelectTrigger className="h-11! w-full bg-white font-semibold shadow-none sm:w-40 dark:border-border dark:bg-card">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All types</SelectItem>
							{reminderTypeOptions.map((option) => (
								<SelectItem key={option} value={option}>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<RemindersDatePicker
						selectedDate={selectedDate}
						onSelectDate={setSelectedDate}
					/>
				</div>
			</section>

			<RemindersStats stats={stats} />
			{isLoading ? (
				<RemindersSkeleton />
			) : (
				<>
					<section className="mt-6 mb-8 space-y-6">
						<div className="space-y-5">
							{sections.length ? (
								sections.map((section) => (
									<RemindersTableSection
										key={section.id}
										section={section}
										jobsById={jobsById}
										onEditReminder={setEditingReminder}
										onMarkCompleted={async (row) => {
											const completed = await markReminderDone(row.jobId);

											if (completed) {
												toast.success("Marked this reminder as completed.");
											} else {
												toast.error(
													"Could not mark this reminder as completed.",
												);
											}
										}}
										onOpenJob={(row) => {
											setSelectedReminderRow(row);
											setSelectedJobId(row.jobId);
										}}
									/>
								))
							) : (
								<div className="rounded-md border border-slate-100 bg-white px-6 py-10 text-center text-sm font-medium text-slate-500 shadow-[0_4px_16px_rgba(15,23,42,0.01)] dark:border-none dark:bg-card dark:text-muted-foreground">
									No reminders found for the current filters.
								</div>
							)}

							<div className="flex flex-col gap-4 text-sm font-medium text-slate-500 dark:text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
								<p>
									Showing {totalVisibleReminders} reminder
									{totalVisibleReminders === 1 ? "" : "s"}
								</p>
								{selectedDate ? (
									<Button
										type="button"
										variant="outline"
										className="h-10 rounded-md border-slate-100 bg-white px-4 font-semibold text-slate-700 shadow-none dark:border-border dark:bg-card dark:text-foreground"
										onClick={() => setSelectedDate(undefined)}
									>
										Clear Date
									</Button>
								) : null}
							</div>
						</div>
					</section>
				</>
			)}

			{editingReminder ? (
				<ReminderFormDialog
					open={editingReminder !== null}
					title="Edit Reminder"
					submitLabel="Update Reminder"
					initialValues={editingReminder.reminderDetails}
					onOpenChange={(open) => {
						if (!open) {
							setEditingReminder(null);
						}
					}}
					onSubmit={async (values) => {
						await saveReminder(editingReminder.jobId, values);
						setEditingReminder(null);
					}}
				/>
			) : null}

			<JobDetailsDrawer
				job={selectedJob}
				open={selectedJob !== null}
				onAddReminder={(job) => {
					setEditingReminder({
						id: `job-${job.id}`,
						jobId: job.id,
						title: job.title,
						company: job.company,
						companyMark: job.company.charAt(0).toUpperCase(),
						companyMarkClassName:
							"bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100",
						kind: "Follow-up",
						note:
							job.reminderDetails?.note ??
							"Follow up on the application status and next steps.",
						dueLabel: job.reminder,
						timeLabel: job.reminderDetails?.time ?? "10:00 AM",
						reminderDetails: getReminderFormValues(job.reminderDetails ?? null),
					});
				}}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedJobId(null);
						setSelectedReminderRow(null);
					}
				}}
				reminderInfo={selectedReminderRow}
			/>
		</div>
	);
}
