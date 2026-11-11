import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";

type JobTableSkeletonProps = {
	columnCount: number;
	rowCount?: number;
};

export function JobTableSkeleton({
	columnCount,
	rowCount = 6,
}: JobTableSkeletonProps) {
	return (
		<TableBody aria-label="Loading jobs">
			{Array.from({ length: rowCount }, (_, rowIndex) => (
				<TableRow
					key={`job-skeleton-${rowIndex}`}
					className="h-[72px] border-slate-100 dark:border-border/60"
				>
					{Array.from({ length: columnCount }, (_, columnIndex) => (
						<TableCell
							key={`job-skeleton-${rowIndex}-${columnIndex}`}
							className="px-5 py-3"
						>
							<Skeleton
								className={
									columnIndex === 0
										? "h-4 w-4/5"
										: columnIndex === 1
											? "h-4 w-3/5"
											: "h-4 w-2/5"
								}
							/>
						</TableCell>
					))}
				</TableRow>
			))}
		</TableBody>
	);
}
