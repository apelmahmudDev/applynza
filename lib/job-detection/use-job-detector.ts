import { useCallback, useEffect, useRef, useState } from "react";

import { detectJobFromActiveTab } from "@/lib/job-detection/detect-active-tab";
import type { JobDetectorMessage } from "@/lib/job-detection/messages";
import type { DetectedJob } from "@/lib/job-detection/types";

type JobDetectorState = {
	job: DetectedJob | null;
	isDetecting: boolean;
	error: string;
};

export function useJobDetector() {
	const requestIdRef = useRef(0);
	const activeTabIdRef = useRef<number | null>(null);
	const [state, setState] = useState<JobDetectorState>({
		job: null,
		isDetecting: true,
		error: "",
	});

	const detectJob = useCallback(async () => {
		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		setState((currentState) => ({ ...currentState, isDetecting: true, error: "" }));

		try {
			const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
			activeTabIdRef.current = activeTab?.id ?? null;
			const job = await detectJobFromActiveTab();

			if (requestIdRef.current !== requestId) return;
			setState({ job, isDetecting: false, error: "" });
		} catch {
			if (requestIdRef.current !== requestId) return;
			setState({
				job: null,
				isDetecting: false,
				error: "Could not auto-detect this page. You can still edit manually.",
			});
		}
	}, []);

	useEffect(() => {
		void detectJob();

		const handleMessage = (
			message: JobDetectorMessage,
			sender: { tab?: { id?: number } },
		) => {
			if (message.type !== "APPLYNZA_JOB_CHANGED") return;
			if (sender.tab?.id !== activeTabIdRef.current) return;
			setState({ job: message.job, isDetecting: false, error: "" });
		};

		const handleTabChange = () => {
			void detectJob();
		};

		browser.runtime.onMessage.addListener(handleMessage);
		browser.tabs.onActivated.addListener(handleTabChange);
		browser.tabs.onUpdated.addListener(handleTabChange);

		return () => {
			browser.runtime.onMessage.removeListener(handleMessage);
			browser.tabs.onActivated.removeListener(handleTabChange);
			browser.tabs.onUpdated.removeListener(handleTabChange);
		};
	}, [detectJob]);

	const hasDetectedJob = Boolean(
		state.job &&
			(state.job.title ||
				state.job.company ||
				state.job.location ||
				state.job.salary ||
				state.job.descriptionText),
	);

	return {
		...state,
		detectJob,
		retryDetection: detectJob,
		hasDetectedJob,
	};
}
