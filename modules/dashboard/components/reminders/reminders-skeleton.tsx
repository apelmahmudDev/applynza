import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export function RemindersSkeleton() {
	return (
		<div className="space-y-6">
			{Array.from({ length: 2 }, (_, sectionIndex) => (
				<section key={`reminder-section-skeleton-${sectionIndex}`} className="space-y-3">
					<Skeleton className="h-6 w-36" />
					<div className="overflow-hidden rounded-md border border-slate-100 bg-white dark:border-none dark:bg-card">
						<Table>
							<TableBody>
								{Array.from({ length: 3 }, (_, rowIndex) => (
									<TableRow
										key={`reminder-row-skeleton-${sectionIndex}-${rowIndex}`}
										className="h-[76px] border-slate-100 dark:border-border/60"
									>
										<TableCell className="px-6 py-4">
											<div className="flex items-center gap-4">
												<Skeleton className="size-11 rounded-lg" />
												<div className="space-y-2">
													<Skeleton className="h-4 w-44" />
													<Skeleton className="h-4 w-28" />
												</div>
											</div>
										</TableCell>
										<TableCell className="px-6 py-4">
											<Skeleton className="h-6 w-20" />
										</TableCell>
										<TableCell className="px-6 py-4">
											<Skeleton className="h-4 w-52" />
										</TableCell>
										<TableCell className="px-6 py-4">
											<div className="space-y-2">
												<Skeleton className="h-4 w-24" />
												<Skeleton className="h-4 w-16" />
											</div>
										</TableCell>
										<TableCell className="px-6 py-4">
											<div className="flex justify-end gap-2">
												<Skeleton className="size-9 rounded-xl" />
												<Skeleton className="size-9 rounded-xl" />
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</section>
			))}
		</div>
	);
}
