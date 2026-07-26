import {
	reminderTypeOptions,
	type ReminderTypeOption,
} from "@/modules/dashboard/components/reminders/reminder-form.types";
import type { JobForm } from "@/modules/popup/types";

export const JOBS_STORAGE_KEY = "applynza.jobs";
export const LEGACY_JOBS_STORAGE_KEY = "applypilot.jobs";

export type StoredJob = JobForm & {
	id: string;
	createdAt: string;
	updatedAt: string;
};

export type SaveJobResult = {
	job: StoredJob;
	action: "created" | "updated";
};

export async function createJobInStorage(job: JobForm): Promise<SaveJobResult> {
	const jobs = await getStoredJobs();
	const now = new Date().toISOString();
	const storedJob: StoredJob = {
		...normalizeJob(job),
		id: createJobId(),
		createdAt: now,
		updatedAt: now,
	};

	await setStoredJobs([storedJob, ...jobs]);

	return {
		job: storedJob,
		action: "created",
	};
}

export async function saveJobToStorage(job: JobForm): Promise<SaveJobResult> {
	const jobs = await getStoredJobs();
	const now = new Date().toISOString();
	const duplicateIndex = jobs.findIndex((storedJob) =>
		isDuplicateJob(storedJob, job),
	);

	if (duplicateIndex >= 0) {
		const existingJob = jobs[duplicateIndex];
		const updatedJob: StoredJob = {
			...existingJob,
			...normalizeJob(job),
			id: existingJob.id,
			createdAt: existingJob.createdAt,
			updatedAt: now,
		};

		const nextJobs = [...jobs];
		nextJobs[duplicateIndex] = updatedJob;
		await setStoredJobs(nextJobs);

		return {
			job: updatedJob,
			action: "updated",
		};
	}

	const storedJob: StoredJob = {
		...normalizeJob(job),
		id: createJobId(),
		createdAt: now,
		updatedAt: now,
	};

	await setStoredJobs([storedJob, ...jobs]);

	return {
		job: storedJob,
		action: "created",
	};
}

export async function updateJobInStorage(
	jobId: string,
	job: JobForm,
): Promise<SaveJobResult> {
	const jobs = await getStoredJobs();
	const now = new Date().toISOString();
	const existingJob = jobs.find((storedJob) => storedJob.id === jobId);

	if (!existingJob) {
		return createJobInStorage(job);
	}

	const updatedJob: StoredJob = {
		...existingJob,
		...normalizeJob(job),
		id: existingJob.id,
		createdAt: existingJob.createdAt,
		updatedAt: now,
	};

	const nextJobs = jobs.map((storedJob) =>
		storedJob.id === jobId ? updatedJob : storedJob,
	);

	await setStoredJobs(nextJobs);

	return {
		job: updatedJob,
		action: "updated",
	};
}

export async function deleteJobFromStorage(jobId: string) {
	const jobs = await getStoredJobs();
	const nextJobs = jobs.filter((job) => job.id !== jobId);

	if (nextJobs.length === jobs.length) {
		return false;
	}

	await setStoredJobs(nextJobs);
	return true;
}

export async function getStoredJobs(): Promise<StoredJob[]> {
	const stored = await browser.storage.local.get([
		JOBS_STORAGE_KEY,
		LEGACY_JOBS_STORAGE_KEY,
	]);
	const jobs = stored[JOBS_STORAGE_KEY] ?? stored[LEGACY_JOBS_STORAGE_KEY];

	if (!Array.isArray(jobs)) {
		return [];
	}

	return jobs.map(toStoredJob).filter((job): job is StoredJob => job !== null);
}

async function setStoredJobs(jobs: StoredJob[]) {
	await browser.storage.local.set({
		[JOBS_STORAGE_KEY]: jobs,
		[LEGACY_JOBS_STORAGE_KEY]: jobs,
	});
}

function isDuplicateJob(storedJob: StoredJob, job: JobForm) {
	const storedUrl = normalizeUrl(storedJob.url);
	const jobUrl = normalizeUrl(job.url);

	if (storedUrl && jobUrl && storedUrl === jobUrl) {
		return true;
	}

	return (
		normalizeComparable(storedJob.company) === normalizeComparable(job.company) &&
		normalizeComparable(storedJob.title) === normalizeComparable(job.title)
	);
}

function normalizeJob(job: JobForm): JobForm {
	const toText = (value: unknown) => (typeof value === "string" ? value : "");

	return {
		title: toText(job.title).trim(),
		company: normalizeCompanyName(toText(job.company)),
		location: toText(job.location).trim(),
		url: toText(job.url).trim(),
		platform: toText(job.platform).trim(),
		salary: toText(job.salary).trim(),
		currency: toText(job.currency).trim(),
		logoUrl: toText(job.logoUrl).trim(),
		descriptionText: toText(job.descriptionText).trim(),
		descriptionHtml: toText(job.descriptionHtml).trim(),
		employmentType: toText(job.employmentType).trim(),
		workplaceType: toText(job.workplaceType).trim(),
		experienceLevel: toText(job.experienceLevel).trim(),
		status: job.status,
		savedDate: toText(job.savedDate).trim(),
		deadline: toText(job.deadline).trim(),
		reminderType: normalizeReminderType(job.reminderType),
		followUpDate: toText(job.followUpDate).trim(),
		followUpTime: toText(job.followUpTime).trim(),
		reminderNote: toText(job.reminderNote).trim(),
		reminderEnabled: Boolean(job.reminderEnabled) && Boolean(toText(job.followUpDate).trim()),
		reminderDone:
			Boolean(job.reminderEnabled) && Boolean(toText(job.followUpDate).trim())
				? Boolean(job.reminderDone)
				: false,
		notes: toText(job.notes).trim(),
	};
}

function normalizeUrl(url: string) {
	try {
		const parsedUrl = new URL(url);
		parsedUrl.hash = "";
		parsedUrl.searchParams.sort();
		return parsedUrl.toString().replace(/\/$/, "");
	} catch {
		return url.trim().replace(/\/$/, "");
	}
}

function normalizeComparable(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeCompanyName(value: string) {
	return value.trim().replace(/\s+logo$/i, "");
}

function createJobId() {
	if (globalThis.crypto?.randomUUID) {
		return globalThis.crypto.randomUUID();
	}

	return `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toStoredJob(value: unknown): StoredJob | null {
	if (!value || typeof value !== "object") {
		return null;
	}

	const job = value as Partial<StoredJob>;

	if (
		typeof job.id !== "string" ||
		typeof job.title !== "string" ||
		typeof job.company !== "string" ||
		typeof job.location !== "string" ||
		typeof job.url !== "string" ||
		typeof job.platform !== "string" ||
		typeof job.status !== "string" ||
		typeof job.notes !== "string" ||
		typeof job.createdAt !== "string" ||
		typeof job.updatedAt !== "string"
	) {
		return null;
	}

	return {
		id: job.id,
		title: job.title,
		company: normalizeCompanyName(job.company),
		location: job.location,
		url: job.url,
		platform: job.platform,
		salary: typeof job.salary === "string" ? job.salary : "",
		currency: typeof job.currency === "string" ? job.currency : "",
		logoUrl: typeof job.logoUrl === "string" ? job.logoUrl : "",
		descriptionText:
			typeof job.descriptionText === "string" ? job.descriptionText : "",
		descriptionHtml:
			typeof job.descriptionHtml === "string" ? job.descriptionHtml : "",
		employmentType:
			typeof job.employmentType === "string" ? job.employmentType : "",
		workplaceType:
			typeof job.workplaceType === "string" ? job.workplaceType : "",
		experienceLevel:
			typeof job.experienceLevel === "string" ? job.experienceLevel : "",
		status: normalizeStoredStatus(job.status),
		savedDate: typeof job.savedDate === "string" ? job.savedDate : "",
		deadline: typeof job.deadline === "string" ? job.deadline : "",
		reminderType: normalizeReminderType(job.reminderType),
		followUpDate: typeof job.followUpDate === "string" ? job.followUpDate : "",
		followUpTime: typeof job.followUpTime === "string" ? job.followUpTime : "",
		reminderNote: typeof job.reminderNote === "string" ? job.reminderNote : "",
		reminderEnabled:
			typeof job.reminderEnabled === "boolean" ? job.reminderEnabled : false,
		reminderDone:
			typeof job.reminderDone === "boolean" ? job.reminderDone : false,
		notes: job.notes,
		createdAt: job.createdAt,
		updatedAt: job.updatedAt,
	};
}

function normalizeReminderType(value: unknown): ReminderTypeOption {
	return typeof value === "string" &&
		(reminderTypeOptions as readonly string[]).includes(value)
		? (value as ReminderTypeOption)
		: "Follow up";
}

function normalizeStoredStatus(value: unknown): StoredJob["status"] {
	if (value === "Interviewing") return "Interviewing";
	if (value === "Applied") return "Applied";
	if (value === "Offer") return "Offer";
	if (value === "Interested") return "Saved";
	if (value === "Rejected") return "Saved";
	return "Saved";
}
