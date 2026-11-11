import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	DashboardJob,
	DashboardSourceFilter,
	DashboardStatusFilter,
} from "@/modules/dashboard/types";
import { DataTablePagination } from "./data-table-pagination";
import { JobTableSkeleton } from "./job-table-skeleton";

type DataTableProps = {
	columns:
		| ColumnDef<DashboardJob>[]
		| ((props: {
				statusFilter: DashboardStatusFilter;
		  }) => ColumnDef<DashboardJob>[]);
	data: DashboardJob[];
	isLoading?: boolean;
	statsSlot?: ReactNode;
	headerSlot?:
		| ReactNode
		| ((props: {
				statusFilter: DashboardStatusFilter;
				setStatusFilter: (value: DashboardStatusFilter) => void;
				search: string;
				setSearch: (value: string) => void;
		  }) => ReactNode);
	toolbarMode?: "full" | "tabs-only";
	showStatusTabs?: boolean;
	initialStatusFilter?: DashboardStatusFilter;
};

const filters: Array<{ value: DashboardStatusFilter; label: string }> = [
	{ value: "all", label: "All (42)" },
	{ value: "saved", label: "Saved (12)" },
	{ value: "applied", label: "Applied (18)" },
	{ value: "interview", label: "Interview (4)" },
	{ value: "offer", label: "Offer (1)" },
];

const sourceFilters: Array<{ value: DashboardSourceFilter; label: string }> = [
	{ value: "all", label: "All Sources" },
	{ value: "linkedin", label: "LinkedIn" },
	{ value: "company-site", label: "Company Site" },
	{ value: "indeed", label: "Indeed" },
	{ value: "manual", label: "Manual" },
];

export function DataTable({
	columns,
	data,
	isLoading = false,
	statsSlot,
	headerSlot,
	toolbarMode = "full",
	showStatusTabs = true,
	initialStatusFilter = "all",
}: DataTableProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] =
		useState<DashboardStatusFilter>(initialStatusFilter);
	const [sourceFilter, setSourceFilter] =
		useState<DashboardSourceFilter>("all");

	const filteredData = useMemo(() => {
		const query = search.trim().toLowerCase();

		return data.filter((job) => {
			const matchesQuery =
				!query ||
				[job.title, job.company].some((value) =>
					value.toLowerCase().includes(query),
				);
			const matchesStatus =
				statusFilter === "all" || job.status.toLowerCase() === statusFilter;
			const matchesSource =
				sourceFilter === "all" ||
				job.source.name.toLowerCase().replace(/\s+/g, "-") === sourceFilter;

			return matchesQuery && matchesStatus && matchesSource;
		});
	}, [data, search, sourceFilter, statusFilter]);

	const resolvedColumns = useMemo(
		() => (typeof columns === "function" ? columns({ statusFilter }) : columns),
		[columns, statusFilter],
	);

	const table = useReactTable({
		data: filteredData,
		columns: resolvedColumns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		initialState: {
			pagination: {
				pageSize: 10,
			},
		},
		state: {
			sorting,
		},
	});

	return (
		<div className="min-w-0 space-y-5 pb-8">
			{typeof headerSlot === "function"
				? headerSlot({ statusFilter, setStatusFilter, search, setSearch })
				: headerSlot}
			{statsSlot}

			<div className="min-w-0 overflow-hidden rounded-md border border-slate-100 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] dark:border-none dark:bg-card">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								key={headerGroup.id}
								className="border-slate-200 bg-slate-50/60 dark:border-border/70 dark:bg-muted/25"
							>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className="h-12 px-5 text-xs font-bold text-slate-500 dark:text-muted-foreground"
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					{isLoading ? (
						<JobTableSkeleton columnCount={resolvedColumns.length} />
					) : (
						<TableBody>
							{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className="dark-hover-surface h-[72px] border-slate-100 hover:bg-slate-50/80 dark:border-border/60"
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} className="px-5 py-3">
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
							) : (
								<TableRow>
									<TableCell
										colSpan={resolvedColumns.length}
										className="h-28 text-center text-sm font-semibold text-slate-500 dark:text-muted-foreground"
									>
										No jobs found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					)}
				</Table>
			</div>
			<DataTablePagination table={table} />
		</div>
	);
}
