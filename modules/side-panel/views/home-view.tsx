import { useEffect, useState } from "react";

import {
	AlertCircle,
	Bookmark,
	CalendarDays,
	CheckCircle2,
	CircleDollarSign,
	Info,
	ExternalLink,
	Brain,
	LoaderCircle,
	MapPin,
	Building2,
	PencilLine,
	PlusCircle,
	BriefcaseBusiness,
	Sparkles,
	Loader,
	X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CompanyMark } from "@/modules/side-panel/components/company-mark";
import { DetectionMessage } from "@/modules/side-panel/components/detection-message";
import { ListHeader } from "@/modules/side-panel/components/list-header";
import { RecentJobRow } from "@/modules/side-panel/components/recent-job-row";
import { ReminderManagementRow } from "@/modules/side-panel/components/reminder-management-row";
import {
	SidePanelLayout,
	SidePanelTopBar,
} from "@/modules/side-panel/components/side-panel-layout";
import { SectionEmptyState } from "@/modules/side-panel/components/section-empty-state";
import { StatItem } from "@/modules/side-panel/components/stat-item";
import type {
	RecentJob,
	Reminder,
	SidePanelJobForm,
} from "@/modules/side-panel/types";
import { formatDisplayUrl } from "@/modules/side-panel/utils/format";
import { getBrand } from "@/modules/side-panel/utils/job-mappers";

type HomeViewProps = {
	isDarkMode: boolean;
	displayedJobs: RecentJob[];
	reminders: Reminder[];
	detectedJob: SidePanelJobForm | null;
	isDetecting: boolean;
	detectionError: string;
	confidence: "high" | "medium" | "low" | null;
	isAnalyzing: boolean;
	isAnalysisAvailable: boolean;
	isSaving: boolean;
	savedCount: number;
	appliedCount: number;
	interviewCount: number;
	onAddJob: () => void;
	onEditDetectedJob: () => void;
	onAnalyzeDetectedJob: () => void;
	onSaveDetectedJob: () => void;
	onRetryDetection: () => void;
	onOpenJob: (jobId: string) => void;
	onOpenReminder: (reminderId: string) => void;
	onOpenApplications: () => void;
	onOpenReminders: () => void;
	onMarkReminderDone: (reminderId: string) => void;
};

export function HomeView({
	isDarkMode,
	displayedJobs,
	reminders,
	detectedJob,
	isDetecting,
	detectionError,
	confidence,
	isAnalyzing,
	isAnalysisAvailable,
	isSaving,
	savedCount,
	appliedCount,
	interviewCount,
	onAddJob,
	onEditDetectedJob,
	onAnalyzeDetectedJob,
	onSaveDetectedJob,
	onRetryDetection,
	onOpenJob,
	onOpenReminder,
	onOpenApplications,
	onOpenReminders,
	onMarkReminderDone,
}: HomeViewProps) {
	const [isDetectionBannerDismissed, setIsDetectionBannerDismissed] =
		useState(false);
	const detectedDetailChips = [
		{
			icon: MapPin,
			label: detectedJob?.location || "Location not found",
		},
		{
			icon: CircleDollarSign,
			label: detectedJob?.salary || "Salary not found",
		},
		{
			icon: Building2,
			label: detectedJob?.workplaceType || "Workplace not found",
		},
		{
			icon: BriefcaseBusiness,
			label: detectedJob?.employmentType || "Job type not found",
		},
	];

	useEffect(() => {
		setIsDetectionBannerDismissed(false);
	}, [
		detectedJob?.title,
		detectedJob?.company,
		detectedJob?.location,
		detectedJob?.url,
		detectedJob?.salary,
		detectedJob?.workplaceType,
		detectedJob?.employmentType,
	]);

	return (
		<SidePanelLayout header={<SidePanelTopBar onAddJob={onAddJob} />}>
			<div className="space-y-5">
				<section className="space-y-2.5">
					<div className="flex items-center gap-3 px-1">
						<Sparkles className="size-4 text-primary" aria-hidden="true" />
						<h2 className="text-sm font-bold text-foreground">
							{detectedJob ? "Job found on this page" : "No job found on this page"}
						</h2>
					</div>
					{!isDetecting && detectedJob && !isDetectionBannerDismissed && (
						<div
							className={cn(
								"rounded-md px-2.5 py-2",
								isDarkMode
									? "border border-white/8 bg-[#3A3047] text-slate-100"
									: "border border-primary/10 bg-[linear-gradient(135deg,#F4F3FF_0%,#F8F7FF_100%)] text-primary",
							)}
						>
							<div className="flex items-center justify-between gap-3">
								<div className="flex min-w-0 items-center gap-2.5">
									<span
										className={cn(
											"flex size-5 shrink-0 items-center justify-center rounded-full shadow-sm",
											isDarkMode
												? "bg-white/10 text-slate-100"
												: "bg-white/80 text-primary",
										)}
									>
										<Info className="size-3.5" aria-hidden="true" />
									</span>
									<p
										className={cn(
											"truncate text-xs font-medium",
											isDarkMode ? "text-slate-100" : "text-primary",
										)}
									>
										We detected some information, please review before saving.
									</p>
								</div>
								<button
									type="button"
									className={cn(
										"flex size-5 shrink-0 items-center justify-center transition-opacity hover:opacity-70",
										isDarkMode ? "text-slate-300" : "text-primary/80",
									)}
									aria-label="Dismiss review message"
									onClick={() => setIsDetectionBannerDismissed(true)}
								>
									<X className="size-3.5" aria-hidden="true" />
								</button>
							</div>
						</div>
					)}
					<div
						className={cn(
							"transition-colors",
							detectedJob && !isDetecting
								? "p-0"
								: "rounded-md border border-border/70 bg-white p-3 dark:bg-card",
						)}
					>
						{isDetecting ? (
							<DetectionMessage
								icon={Loader}
								title="Detecting job details"
								description="Reading visible job information from the active tab."
								isDarkMode={isDarkMode}
								isLoading
							/>
						) : detectedJob ? (
							<div className="rounded-md border border-border/70 bg-white p-3.5 dark:bg-card">
								<div className="flex gap-4">
									<CompanyMark
										brand={getBrand(detectedJob.company, detectedJob.platform)}
										logoUrl={detectedJob.logoUrl}
										companyName={detectedJob.company}
										size="lg"
										appearance="soft"
									/>
									<div className="min-w-0 flex-1 pt-1">
										<h3 className="line-clamp-2 text-base font-semibold leading-6 text-[#171C35] dark:text-foreground">
											{detectedJob.title || "Untitled role"}
										</h3>
										<div className="mt-2 flex min-w-0 items-center gap-2 text-sm font-medium text-[#5B55D6] dark:text-primary">
											<Building2
												className="size-3.5 shrink-0 text-[#5B55D6] dark:text-primary"
												aria-hidden="true"
											/>
											<span className="truncate">
												{detectedJob.company || "Unknown company"}
											</span>
										</div>
									</div>
								</div>

								<div className="mt-4 flex flex-wrap gap-2.5">
									{detectedDetailChips.map((item) => (
										<DetectedInfoChip
											key={`${item.icon.name}-${item.label}`}
											icon={item.icon}
											label={item.label}
										/>
									))}
								</div>

								{detectedJob.url ? (
									<a
										href={detectedJob.url}
										target="_blank"
										rel="noreferrer"
										className="mt-4 flex min-w-0 items-center justify-between gap-3 border-t border-[#EEEAFD] pt-3 text-xs text-[#5F6480] transition-opacity hover:opacity-90 dark:border-white/10 dark:text-muted-foreground"
									>
										<div className="flex min-w-0 items-center gap-2.5">
											<p className="min-w-0 truncate">
												<span className="font-medium text-[#4B516C] dark:text-foreground/90">
													Source:
												</span>{" "}
												{detectedJob.platform || "Job page"} ·{" "}
												<span className="text-[#5B55D6] dark:text-primary">
													{formatDisplayUrl(detectedJob.url)}
												</span>
											</p>
										</div>
										<ExternalLink
											className="size-4 shrink-0 text-[#5B55D6] dark:text-primary"
											aria-hidden="true"
										/>
									</a>
								) : null}

								<div className="mt-4 space-y-3">
									{isAnalysisAvailable ? (
										<Button
											type="button"
											variant="outline"
											className={cn(
												"h-10 w-full",
												"border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/15",
											)}
											disabled={isAnalyzing}
											onClick={onAnalyzeDetectedJob}
										>
											{isAnalyzing ? (
												<LoaderCircle
													className="size-4 animate-spin"
													aria-hidden="true"
												/>
											) : (
												<Brain className="size-4" aria-hidden="true" />
											)}
											{isAnalyzing
												? "Analyzing Job Page..."
												: "Analyze Job Page"}
										</Button>
									) : null}
									<div className="grid grid-cols-2 gap-3">
										<Button
											type="button"
											variant="outline"
											className={cn(
												"h-10",
												"border-[#C9C4FF] bg-white text-[#5B55D6] hover:bg-[#F7F6FF] dark:border-primary/30 dark:bg-transparent dark:text-primary dark:hover:bg-primary/10",
											)}
											onClick={onEditDetectedJob}
										>
											<PencilLine className="size-4" aria-hidden="true" />
											Edit Details
										</Button>
										<Button
											type="button"
											className="h-10"
											disabled={isSaving}
											onClick={onSaveDetectedJob}
										>
											<PlusCircle className="size-4" aria-hidden="true" />
											{isSaving ? "Saving..." : "Save Job"}
										</Button>
									</div>
								</div>
							</div>
						) : (
							<>
								<DetectionMessage
									icon={detectionError ? AlertCircle : Sparkles}
									title={
										detectionError
											? "Detection failed"
											: "No job information found"
									}
									description={
										detectionError ||
										"We couldn't find job details here. Open a job posting page or add the application manually."
									}
									isDarkMode={isDarkMode}
								/>
								<div className="mt-5 space-y-3">
									{isAnalysisAvailable ? (
										<Button
											type="button"
											variant="outline"
											className={cn(
												"h-10 w-full rounded-md text-sm font-semibold",
												"border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/15",
											)}
											disabled={isAnalyzing}
											onClick={onAnalyzeDetectedJob}
										>
											{isAnalyzing ? (
												<LoaderCircle
													className="size-4 animate-spin"
													aria-hidden="true"
												/>
											) : (
												<Brain className="size-4" aria-hidden="true" />
											)}
											{isAnalyzing
												? "Analyzing Job Page..."
												: "Analyze This Page"}
										</Button>
									) : null}
									<div className="grid grid-cols-2 gap-3">
										<Button
											type="button"
											variant="outline"
											className={cn(
												"h-10 rounded-md text-sm font-semibold",
												"border-input bg-card text-foreground hover:bg-muted/60",
											)}
											onClick={onRetryDetection}
										>
											<Loader className="size-4" aria-hidden="true" />
											Retry
										</Button>
										<Button
											type="button"
											className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:brightness-95"
											onClick={onAddJob}
										>
											<PlusCircle className="size-4" aria-hidden="true" />
											Add Manually
										</Button>
									</div>
								</div>
							</>
						)}
					</div>
				</section>

				<section className="grid grid-cols-3 rounded-md border border-border/70 bg-card py-2.5 transition-colors">
					<StatItem
						icon={Bookmark}
						value={String(savedCount)}
						label="Saved"
						isDarkMode={isDarkMode}
					/>
					<StatItem
						icon={CheckCircle2}
						value={String(appliedCount)}
						label="Applied"
						bordered
						isDarkMode={isDarkMode}
					/>
					<StatItem
						icon={CalendarDays}
						value={String(interviewCount)}
						label="Interview"
						bordered
						isDarkMode={isDarkMode}
					/>
				</section>

				<div className="space-y-2">
					<ListHeader
						title="Recent Jobs"
						isDarkMode={isDarkMode}
						onViewAll={onOpenApplications}
					/>
					<section className="overflow-hidden rounded-md border border-border/70 bg-card transition-colors">
						{displayedJobs.map((job) => (
							<RecentJobRow
								key={job.id}
								job={job}
								isDarkMode={isDarkMode}
								onOpen={() => onOpenJob(job.id)}
							/>
						))}
						{!displayedJobs.length ? (
							<SectionEmptyState
								icon={Bookmark}
								title="No recent jobs yet"
								description="Jobs you save will apppear here for quick access"
							/>
						) : null}
					</section>
				</div>

				<div className="space-y-2">
					<ListHeader
						title="Upcoming Reminders"
						isDarkMode={isDarkMode}
						onViewAll={onOpenReminders}
					/>
					<section className="overflow-hidden rounded-md border border-border/70 bg-card transition-colors">
						{reminders.map((reminder) => (
							<ReminderManagementRow
								key={reminder.id}
								reminder={reminder}
								isDarkMode={isDarkMode}
								onOpen={() => onOpenReminder(reminder.id)}
								onMarkDone={() => onMarkReminderDone(reminder.id)}
							/>
						))}
						{!reminders.length ? (
							<SectionEmptyState
								icon={CalendarDays}
								title="No upcoming reminders yet"
								description="Add one from a job form or edit screen to stay on top of follow-ups."
							/>
						) : null}
					</section>
				</div>
			</div>
		</SidePanelLayout>
	);
}

type DetectedInfoChipProps = {
	icon: typeof MapPin;
	label: string;
};

function DetectedInfoChip({ icon: Icon, label }: DetectedInfoChipProps) {
	return (
		<div className="inline-flex max-w-full items-center gap-1.5 rounded-sm bg-[#F6F5FF] px-2 py-1.5 text-[11px] font-medium text-[#3B4160] dark:bg-primary/10 dark:text-foreground/85">
			<span className="flex size-4 shrink-0 items-center justify-center text-[#5B55D6] dark:text-primary">
				<Icon className="size-3" aria-hidden="true" />
			</span>
			<span className="truncate">{label}</span>
		</div>
	);
}
