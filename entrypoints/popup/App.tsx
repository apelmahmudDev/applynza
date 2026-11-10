import { useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";
import { useSyncAccount } from "@/modules/dashboard/hooks/use-sync-account";
import { saveJobToStorage, type SaveJobResult } from "@/lib/jobs/storage";
import { DetectedJobView } from "@/modules/popup/components/detected-job-view";
import { EditJobView } from "@/modules/popup/components/edit-job-view";
import { PopupShell } from "@/modules/popup/components/popup-shell";
import { SavedJobView } from "@/modules/popup/components/saved-job-view";
import { useDetectedJob } from "@/modules/popup/hooks/use-detected-job";
import type { JobForm, PopupView } from "@/modules/popup/types";

function App() {
	const [view, setView] = useState<PopupView>("detected");
	const [isSaving, setIsSaving] = useState(false);
	const [saveResult, setSaveResult] = useState<SaveJobResult | null>(null);
	const { settings: syncSettings, isLoading: isSyncLoading } = useSyncAccount();
	const {
		job,
		setJob,
		isDetecting,
		isAnalyzing,
		isAnalysisAvailable,
		error,
		confidence,
		analyzeCurrentJob,
	} = useDetectedJob();

	const saveJob = async (savedJob: JobForm = job) => {
		setIsSaving(true);

		try {
			const result = await saveJobToStorage(savedJob);
			setSaveResult(result);
			setJob(result.job);
			setView("saved");
			toast.success(
				result.action === "updated"
					? "Saved changes to this job."
					: "Saved this job locally.",
			);
		} catch {
			toast.error("Could not save this job. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const analyzeJob = async () => {
		try {
			await analyzeCurrentJob();
			toast.success("Job details updated from the page analysis.");
		} catch (analysisError) {
			const message =
				analysisError instanceof Error
					? analysisError.message
					: "Could not analyze this page right now.";
			toast.error(message);
		}
	};

	return (
		<>
			<PopupShell>
				{view === "detected" && (
					<DetectedJobView
						job={job}
						confidence={confidence}
						error={error}
						isDetecting={isDetecting}
						isAnalyzing={isAnalyzing}
						isAnalysisAvailable={isAnalysisAvailable}
						isSaving={isSaving}
						isSyncEnabled={!isSyncLoading && syncSettings.enabled}
						onAnalyze={analyzeJob}
						onEdit={() => setView("edit")}
						onSave={saveJob}
					/>
				)}
				{view === "edit" && (
					<EditJobView
						job={job}
						onCancel={() => setView("detected")}
						onSave={saveJob}
					/>
				)}
				{view === "saved" && (
					<SavedJobView
						job={job}
						saveAction={saveResult?.action}
						isSyncEnabled={!isSyncLoading && syncSettings.enabled}
					/>
				)}
			</PopupShell>
			<Toaster position="top-center" richColors />
		</>
	);
}

export default App;
