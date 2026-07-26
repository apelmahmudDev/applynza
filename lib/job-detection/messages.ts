import type { DetectedJob } from "@/lib/job-detection/types";

export type JobDetectorMessage =
	| { type: "APPLYNZA_GET_JOB" }
	| { type: "APPLYNZA_JOB_CHANGED"; job: DetectedJob | null };
