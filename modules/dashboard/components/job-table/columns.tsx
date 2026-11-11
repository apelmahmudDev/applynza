import type { ColumnDef } from "@tanstack/react-table";
import { Bell, Globe } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
	DashboardJob,
	DashboardJobStatus,
	DashboardStatusFilter,
} from "@/modules/dashboard/types";
import { DataTableRowActions } from "./data-table-row-actions";
import { JobBrandMark } from "./job-brand-mark";

const statusStyles: Record<DashboardJobStatus, string> = {
	Applied:
		"bg-emerald-100 text-emerald-700 dark:bg-emerald-500/16 dark:text-emerald-200",
	Interview:
		"bg-violet-100 text-violet-700 dark:bg-violet-500/16 dark:text-violet-200",
	Saved: "bg-blue-100 text-blue-700 dark:bg-blue-500/16 dark:text-blue-200",
	Offer: "bg-amber-100 text-amber-700 dark:bg-amber-500/16 dark:text-amber-200",
};

type DashboardColumnsOptions = {
	showStatus?: boolean;
	statusFilter?: DashboardStatusFilter;
	onViewDetails?: (job: DashboardJob) => void;
	onSetReminder?: (job: DashboardJob) => void;
	onEditJob?: (job: DashboardJob) => void;
	onDeleteJob?: (job: DashboardJob) => void;
};

export function getDashboardColumns({
	showStatus = true,
	statusFilter = "all",
	onViewDetails,
	onSetReminder,
	onEditJob,
	onDeleteJob,
}: DashboardColumnsOptions = {}): ColumnDef<DashboardJob>[] {
	const dateColumnLabel = getDateColumnLabel(statusFilter);

	const columns: ColumnDef<DashboardJob>[] = [
		{
			accessorKey: "title",
			header: "Job Title",
			cell: ({ row }) => {
				const job = row.original;
				return (
					<div className="min-w-[220px] max-w-[460px]">
						<TruncatedText
							className="text-sm font-bold text-slate-950 dark:text-foreground"
							value={job.title}
						/>
						<p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-muted-foreground">
							{job.jobType}
						</p>
					</div>
				);
			},
		},
		{
			accessorKey: "company",
			header: "Company",
			cell: ({ row }) => {
				const job = row.original;
				return (
					<div className="flex min-w-[150px] max-w-[320px] items-center gap-3">
						<JobBrandMark
							brand={job.brand}
							logoUrl={job.logoUrl}
							company={job.company}
						/>
						<div className="min-w-0">
							<TruncatedText
								className="text-sm font-semibold text-slate-900 dark:text-foreground"
								value={job.company}
							/>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "location",
			header: "Location",
			cell: ({ row }) => {
				const job = row.original;
				const hasLocation = Boolean(job.location.trim());
				const hasWorkMode = Boolean(job.workMode.trim());
				const locationText = job.location.trim();

				return (
					<div className="min-w-[150px] max-w-[360px]">
						{hasLocation ? (
							<TruncatedText
								className="text-sm font-semibold text-slate-900 dark:text-foreground"
								value={locationText}
							/>
						) : (
							<p className="text-sm font-semibold text-slate-400 dark:text-muted-foreground/75">
								-
							</p>
						)}
						{hasWorkMode ? (
							<p className="mt-1 text-xs font-medium text-slate-500 dark:text-muted-foreground">
								{job.workMode}
							</p>
						) : null}
					</div>
				);
			},
		},
		{
			accessorKey: "source",
			header: "Source",
			cell: ({ row }) => <SourceCell job={row.original} />,
		},
	];

	if (showStatus) {
		columns.push({
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => (
				<span
					className={cn(
						"inline-flex min-w-20 justify-center rounded-full px-3 py-1 text-xs font-bold",
						statusStyles[row.original.status],
					)}
				>
					{row.original.status}
				</span>
			),
			filterFn: (row, id, value) => {
				if (value === "all") {
					return true;
				}

				return String(row.getValue(id)).toLowerCase() === value;
			},
		});
	}

	columns.push(
		{
			accessorKey: "appliedDate",
			header: dateColumnLabel,
			cell: ({ row }) => (
				<p className="min-w-[110px] text-sm font-medium text-slate-700 dark:text-foreground/85">
					{row.original.appliedDate}
				</p>
			),
		},
		{
			accessorKey: "reminder",
			header: "Reminder",
			cell: ({ row }) => (
				<div className="min-w-[90px]">
					{row.original.reminder === "-" ? (
						<span className="text-sm font-medium text-slate-400 dark:text-muted-foreground/75">
							-
						</span>
					) : (
						<span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-300">
							<Bell className="size-3.5" />
							{row.original.reminder}
						</span>
					)}
				</div>
			),
		},
		{
			id: "actions",
			header: () => (
				<div className="flex min-w-[76px] justify-end text-right">Actions</div>
			),
			cell: ({ row }) => (
				<DataTableRowActions
					job={row.original}
					onViewDetails={onViewDetails}
					onSetReminder={onSetReminder}
					onEditJob={onEditJob}
					onDeleteJob={onDeleteJob}
				/>
			),
		},
	);

	return columns;
}

function TruncatedText({
	value,
	className,
}: {
	value: string;
	className: string;
}) {
	const textRef = useRef<HTMLParagraphElement>(null);
	const [isTruncated, setIsTruncated] = useState(false);
	const [isTooltipOpen, setIsTooltipOpen] = useState(false);

	useLayoutEffect(() => {
		const element = textRef.current;
		if (!element) return;

		const updateTruncation = () => {
			setIsTruncated(element.scrollWidth > element.clientWidth);
		};

		updateTruncation();
		const frame = requestAnimationFrame(updateTruncation);
		const resizeObserver = new ResizeObserver(updateTruncation);
		resizeObserver.observe(element);

		return () => {
			cancelAnimationFrame(frame);
			resizeObserver.disconnect();
		};
	}, [value]);

	return (
		<TooltipProvider>
			<Tooltip
				open={isTruncated && isTooltipOpen}
				onOpenChange={setIsTooltipOpen}
			>
				<TooltipTrigger asChild>
					<p ref={textRef} className={cn("truncate", className)}>
						{value}
					</p>
				</TooltipTrigger>
				<TooltipContent side="top" sideOffset={6}>
					{value}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function getDateColumnLabel(statusFilter: DashboardStatusFilter) {
	if (statusFilter === "saved") return "Saved Date";
	if (statusFilter === "offer") return "Offer Date";
	if (statusFilter === "applied") return "Applied Date";
	if (statusFilter === "interview") return "Interview Date";

	return "Date Added";
}

function SourceCell({ job }: { job: DashboardJob }) {
	const extensionChrome = globalThis as typeof globalThis & {
		chrome?: {
			tabs?: {
				create: (options: { url: string }) => void;
			};
		};
	};
	const isDisabled = !job.source.url;
	const title = job.source.name === "Manual" ? "Manual" : "Open Job Link";

	const handleOpenSource = () => {
		if (!job.source.url) {
			return;
		}

		extensionChrome.chrome?.tabs?.create({ url: job.source.url });
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={handleOpenSource}
						disabled={isDisabled}
						aria-label={title}
						className={cn(
							"flex size-8 items-center justify-center rounded-md transition-colors",
							isDisabled
								? "cursor-not-allowed text-slate-400 dark:text-muted-foreground/60"
								: "hover:bg-slate-100 hover:text-slate-950 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground",
						)}
					>
						{job.source.faviconUrl ? (
							<img
								src={job.source.faviconUrl}
								alt=""
								className="size-4 rounded-sm object-cover"
							/>
						) : job.source.name === "Manual" ? (
							<span className="inline-flex size-4 items-center justify-center rounded-[4px] bg-slate-100 text-[10px] font-black uppercase text-slate-500 dark:bg-muted dark:text-muted-foreground">
								M
							</span>
						) : (
							<Globe className="size-4 text-slate-500 dark:text-muted-foreground" />
						)}
					</button>
				</TooltipTrigger>
				<TooltipContent side="top" sideOffset={6}>
					{title}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
