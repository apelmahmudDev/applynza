import { detectLinkedInJobInPage } from "@/lib/job-detection/linkedin";
import type { JobDetectorMessage } from "@/lib/job-detection/messages";

export default defineContentScript({
	matches: ["*://*.linkedin.com/*"],
	runAt: "document_idle",
	main() {
		let lastSignature = "";
		let lastUrl = window.location.href;
		let followUpTimer: ReturnType<typeof setTimeout> | undefined;

		const readJob = () => {
			try {
				return detectLinkedInJobInPage();
			} catch {
				return null;
			}
		};

		const hasCoreJobDetails = (job: ReturnType<typeof readJob>) =>
			Boolean(job && (job.title || job.company || job.location));

		const sleep = (ms: number) =>
			new Promise<void>((resolve) => {
				window.setTimeout(resolve, ms);
			});

		const readJobWithRetries = async () => {
			const maxAttempts = 8;
			let lastJob: ReturnType<typeof readJob> = null;

			for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
				const job = readJob();
				if (job) {
					lastJob = job;
					if (hasCoreJobDetails(job)) return job;
				}

				if (attempt < maxAttempts - 1) {
					await sleep(300);
				}
			}

			return lastJob;
		};

		const scheduleFollowUpPublish = (delay = 1200) => {
			if (followUpTimer) clearTimeout(followUpTimer);
			followUpTimer = setTimeout(() => void publish(true), delay);
		};

		const publish = async (force = false) => {
			const job = readJob();
			if (job && !hasCoreJobDetails(job)) {
				scheduleFollowUpPublish();
			}

			const signature = job
				? [job.url, job.title, job.company, job.descriptionText.length].join("|")
				: "none";
			if (!force && signature === lastSignature) return;

			lastSignature = signature;
			try {
				await browser.runtime.sendMessage({ type: "APPLYNZA_JOB_CHANGED", job } satisfies JobDetectorMessage);
			} catch {
				// The popup and side panel are not always open.
			}
		};

		let publishTimer: ReturnType<typeof setTimeout> | undefined;
		const schedulePublish = (delay = 500) => {
			if (publishTimer) clearTimeout(publishTimer);
			publishTimer = setTimeout(() => void publish(), delay);
		};

		browser.runtime.onMessage.addListener((message: JobDetectorMessage) => {
			if (message.type !== "APPLYNZA_GET_JOB") return;
			return readJobWithRetries().then((job) => ({ ok: true, job }));
		});

		const observer = new MutationObserver(() => schedulePublish());
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true,
			characterData: true,
		});

		const urlTimer = window.setInterval(() => {
			if (window.location.href === lastUrl) return;
			lastUrl = window.location.href;
			schedulePublish(150);
			schedulePublish(900);
		}, 700);

		window.addEventListener("pagehide", () => {
			observer.disconnect();
			window.clearInterval(urlTimer);
			if (followUpTimer) clearTimeout(followUpTimer);
		});

		void publish(true);
	},
});
