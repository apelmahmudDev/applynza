import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { FileUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	mergeBackupWithCurrentData,
	readBackupPreview,
	type BackupPreview,
} from "@/lib/export/backup";

import { ExportCardShell } from "./export-card-shell";

export function RestoreControlsSection() {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [selectedFileName, setSelectedFileName] = useState("");
	const [preview, setPreview] = useState<BackupPreview | null>(null);
	const [isReading, setIsReading] = useState(false);
	const [isRestoring, setIsRestoring] = useState(false);

	const backupDateLabel = useMemo(() => {
		if (!preview?.exportedAt) {
			return "Unknown";
		}

		const timestamp = Date.parse(preview.exportedAt);
		if (Number.isNaN(timestamp)) {
			return "Unknown";
		}

		return new Intl.DateTimeFormat(undefined, {
			dateStyle: "long",
			timeStyle: "short",
		}).format(new Date(timestamp));
	}, [preview]);

	const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		setPreview(null);
		setSelectedFileName(file?.name ?? "");

		if (!file) {
			return;
		}

		setIsReading(true);

		try {
			const nextPreview = await readBackupPreview(file);
			setPreview(nextPreview);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Could not read that backup file.",
			);
			setSelectedFileName("");
			event.target.value = "";
		} finally {
			setIsReading(false);
		}
	};

	const handleRestore = async () => {
		if (!preview) {
			toast.error("Choose a valid Applynza backup file first.");
			return;
		}

		setIsRestoring(true);

		try {
			const result = await mergeBackupWithCurrentData(preview.backup);
			toast.success(
				`Merged ${result.importedJobs} backup jobs into ${result.mergedJobs} total jobs.`,
			);
		} catch {
			toast.error("Could not restore this backup. Please try again.");
		} finally {
			setIsRestoring(false);
		}
	};

	return (
		<ExportCardShell title="Restore Data">
			<div className="space-y-6">
				<input
					ref={inputRef}
					type="file"
					accept=".json,application/json"
					className="hidden"
					onChange={(event) => void handleFileChange(event)}
				/>

				<div className="space-y-3">
					<Button
						type="button"
						variant="outline"
						className="h-12 w-full rounded-md border-slate-200 bg-white text-base font-semibold shadow-none dark:border-border dark:bg-card"
						onClick={() => inputRef.current?.click()}
						disabled={isReading || isRestoring}
					>
						<FileUp className="size-5" aria-hidden="true" />
						{selectedFileName || "Choose Backup File"}
					</Button>

					<p className="text-sm text-slate-500 dark:text-muted-foreground">
						Select an Applynza JSON backup file to merge it with your current local data.
					</p>
				</div>

				<div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-muted/30">
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<PreviewRow label="Backup date" value={backupDateLabel} />
						<PreviewRow
							label="Jobs"
							value={preview ? String(preview.jobsCount) : "-"}
						/>
						<PreviewRow
							label="Reminders"
							value={preview ? String(preview.remindersCount) : "-"}
						/>
						<PreviewRow
							label="Settings"
							value={preview?.settingsIncluded ? "Included" : "-"}
						/>
					</div>
				</div>

				<div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100">
					Merge keeps your current records, adds missing backup records, and uses the latest version when the same job id exists in both places.
				</div>

				<Button
					type="button"
					className="h-12 w-full rounded-md bg-primary text-base font-bold text-primary-foreground hover:brightness-95"
					onClick={() => void handleRestore()}
					disabled={!preview || isReading || isRestoring}
				>
					<RefreshCw className="size-5" aria-hidden="true" />
					{isRestoring ? "Restoring..." : "Restore Data"}
				</Button>
			</div>
		</ExportCardShell>
	);
}

function PreviewRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-muted-foreground">
				{label}
			</p>
			<p className="text-sm font-semibold text-slate-950 dark:text-foreground">
				{value}
			</p>
		</div>
	);
}
