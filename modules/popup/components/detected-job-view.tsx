import {
	AlertCircle,
	Brain,
	Building2,
	ExternalLink,
	FilePlus2,
	Grid2X2,
	LoaderCircle,
	MapPin,
	PanelRight,
	Radar,
	SearchX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DetectionConfidence } from "@/lib/job-detection/types";
import { openDashboard } from "@/lib/open-dashboard";
import { openSidePanel } from "@/lib/open-side-panel";
import type { JobForm } from "@/modules/popup/types";
import { cn } from "@/lib/utils";

type DetectedJobViewProps = {
	job: JobForm;
	confidence: DetectionConfidence | null;
	error: string;
	isDetecting: boolean;
	isAnalyzing: boolean;
	isAnalysisAvailable: boolean;
	isSaving: boolean;
	onAnalyze: () => void;
	onEdit: () => void;
	onSave: () => void;
};

export function DetectedJobView({
	job,
	confidence,
	error,
	isDetecting,
	isAnalyzing,
	isAnalysisAvailable,
	isSaving,
	onAnalyze,
	onEdit,
	onSave,
}: DetectedJobViewProps) {
	const hasDetectedJob = Boolean(
		job.title || job.company || job.location || job.url,
	);

	return (
		<section className="flex flex-1 flex-col px-5 py-5">
			<div className="mb-4 flex items-center justify-between">
				<p className="text-sm font-semibold text-slate-900 dark:text-foreground">
					{isDetecting
						? "Detecting job details..."
						: hasDetectedJob
							? "Job detected on this page"
							: "No job detected"}
				</p>
				{hasDetectedJob && (
					<span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/16 dark:text-emerald-300">
						{job.platform || "Other"}
					</span>
				)}
			</div>

			{hasDetectedJob && confidence === "low" && (
				<div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
					We detected some information, but please review before saving.
				</div>
			)}

			{isDetecting ? (
				<DetectionStateCard
					icon={Radar}
					title="Scanning the active tab"
					description="Applynza is checking visible headings, page metadata, and common job-page fields."
					tone="neutral"
					isLoading
				/>
			) : hasDetectedJob ? (
				<article className="rounded-md border border-slate-200 bg-white p-4 dark:border-none dark:bg-card">
					<h2 className="line-clamp-3 text-base font-semibold leading-6 text-slate-950 dark:text-foreground">
						{job.title || "Untitled role"}
					</h2>
					<div className="mt-2 space-y-1.5">
						<p className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-foreground/85">
							<Building2
								className="size-3.5 shrink-0 text-slate-400 dark:text-muted-foreground"
								aria-hidden="true"
							/>
							<span className="truncate">
								{job.company || "Unknown company"}
							</span>
						</p>
						<p className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-muted-foreground">
							<MapPin
								className="size-3.5 shrink-0 text-slate-400 dark:text-muted-foreground"
								aria-hidden="true"
							/>
							<span className="truncate">
								{job.location || "Location not found"}
							</span>
						</p>
					</div>
					{job.url && (
						<a
							href={job.url}
							target="_blank"
							rel="noreferrer"
							className="mt-4 flex items-center gap-1.5 truncate text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
						>
							<span className="truncate">{formatDisplayUrl(job.url)}</span>
							<ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
						</a>
					)}
				</article>
			) : error ? (
				<DetectionStateCard
					icon={AlertCircle}
					title="Detection is unavailable"
					description={error}
					tone="error"
				/>
			) : (
				<DetectionStateCard
					icon={SearchX}
					title="No job details found"
					description="Open a job posting page, or add the application manually if this site blocks automatic detection."
					tone="empty"
				/>
			)}

			<div className="mt-5 grid grid-cols-1 gap-3">
				{isAnalysisAvailable && (
					<Button
						type="button"
						variant="outline"
						className="h-10 rounded-md border-blue-200 bg-blue-50 text-sm font-bold text-blue-700 shadow-[0_2px_5px_rgba(15,23,42,0.04)] hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/12 dark:text-blue-200 dark:hover:bg-blue-500/18"
						disabled={isDetecting || isAnalyzing}
						onClick={onAnalyze}
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
							: hasDetectedJob
								? "Analyze Job Page"
								: "Analyze This Page"}
					</Button>
				)}
				<div className="grid grid-cols-2 gap-4">
					<Button
						type="button"
						variant="outline"
						className="h-10 rounded-md border-slate-200 bg-white text-sm px-4 font-semibold text-slate-900 hover:bg-slate-50 dark:border-none dark:bg-[#2c2c2c] dark:text-foreground dark:hover:bg-[#323232]"
						onClick={onEdit}
					>
						<FilePlus2 className="size-4" aria-hidden="true" />
						{hasDetectedJob ? "Edit Before Saving" : "Add Manually"}
					</Button>
					<Button
						type="button"
						className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
						disabled={isSaving || isDetecting || !hasDetectedJob}
						onClick={() => onSave()}
					>
						{isSaving ? "Saving..." : "Save Job"}
					</Button>
				</div>
			</div>

			<div className="mt-8 grid grid-cols-2 gap-4">
				<Button
					type="button"
					variant="outline"
					className="h-[94px] flex-col gap-3 rounded-md border-slate-200 bg-white text-sm font-semibold text-slate-950 hover:bg-slate-50 dark:border-none dark:bg-card dark:text-foreground dark-hover-surface"
					onClick={openDashboard}
				>
					<span className="flex size-8 items-center justify-center rounded-sm bg-blue-50 text-blue-600 dark:bg-blue-500/16 dark:text-blue-200">
						<Grid2X2 className="size-5" aria-hidden="true" />
					</span>
					Open Dashboard
				</Button>
				<Button
					type="button"
					variant="outline"
					className="h-[94px] flex-col gap-3 rounded-md border-slate-200 bg-white text-sm font-semibold text-slate-950 hover:bg-slate-50 dark:border-none dark:bg-card dark:text-foreground dark-hover-surface"
					onClick={openSidePanel}
				>
					<span className="flex size-8 items-center justify-center rounded-sm bg-slate-50 text-slate-700 dark:bg-[#262222] dark:text-slate-100">
						<PanelRight className="size-5" aria-hidden="true" />
					</span>
					Open Side Panel
				</Button>
			</div>

			<p className="mt-auto pt-7 text-center text-xs font-medium text-slate-700 dark:text-muted-foreground">
				All data is stored locally in your browser.
			</p>
		</section>
	);
}

type DetectionStateCardProps = {
	icon: typeof Radar;
	title: string;
	description: string;
	tone: "neutral" | "empty" | "error";
	isLoading?: boolean;
};

function DetectionStateCard({
	icon: Icon,
	title,
	description,
	tone,
	isLoading = false,
}: DetectionStateCardProps) {
	const toneStyles = {
		neutral:
			"border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/12 dark:text-blue-200",
		empty:
			"border-slate-200 bg-slate-50 text-slate-700 dark:border-[#454040] dark:bg-[#2c2c2c] dark:text-slate-200",
		error:
			"border-red-100 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/12 dark:text-red-200",
	};

	return (
		<div
			className={cn("rounded-lg border p-4 dark:border-none", toneStyles[tone])}
		>
			<div className="flex items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white text-blue-600 shadow-sm dark:bg-[#221f1f] dark:text-blue-300">
					<Icon
						className={`size-5 ${isLoading ? "animate-spin" : ""}`}
						aria-hidden="true"
					/>
				</div>
				<div className="min-w-0">
					<h2 className="text-sm font-bold leading-5">{title}</h2>
					<p className="mt-1 text-xs font-medium leading-5 opacity-85">
						{description}
					</p>
				</div>
			</div>
		</div>
	);
}

function formatDisplayUrl(url: string) {
	try {
		const parsedUrl = new URL(url);
		return `${parsedUrl.hostname.replace(/^www\./, "")}${parsedUrl.pathname}`;
	} catch {
		return url;
	}
}
