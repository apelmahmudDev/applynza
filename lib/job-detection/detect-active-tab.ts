import type { DetectedJob } from "@/lib/job-detection/types";
import type { JobDetectorMessage } from "@/lib/job-detection/messages";

export async function detectJobFromActiveTab(): Promise<DetectedJob | null> {
	const [tab] = await browser.tabs.query({
		active: true,
		currentWindow: true,
	});

	if (!tab?.id || !tab.url || !isDetectableUrl(tab.url)) {
		return null;
	}

	const isLinkedIn = new URL(tab.url).hostname.toLowerCase().includes("linkedin.com");
	if (isLinkedIn) {
		try {
			const response = (await browser.tabs.sendMessage(tab.id, {
				type: "APPLYNZA_GET_JOB",
			} satisfies JobDetectorMessage)) as { job?: DetectedJob | null };
			return response?.job ?? null;
		} catch {
			// If the content script is not ready yet, fall back to generic page parsing.
		}
	}

	const [result] = await browser.scripting.executeScript({
		target: { tabId: tab.id },
		func: detectJobInPage,
	});

	return result?.result ?? null;
}

function isDetectableUrl(url: string) {
	return /^https?:\/\//.test(url);
}

function detectJobInPage(): DetectedJob | null {
	type ParsedDetectedJob = Partial<
		DetectedJob & {
			description: string;
			employmentType: string;
			workplaceType: string;
		}
	>;

	const url = window.location.href;
	const platform = detectPlatform(url);
	const platformLabel = formatPlatform(platform, url);

	const structuredDetected = parseStructuredJobData();
	const platformDetected = parsePlatformJob(platform);
	const metaDetected = parseMetaJobData();
	const genericDetected = parseGenericJobPage();

	const detected = mergeDetected(
		structuredDetected,
		platformDetected,
		metaDetected,
		genericDetected,
	);
	const formattedDescription = getFormattedDescription(platform);
	const pageText = getPageText();

	if (!hasDetectedJobDetails(detected)) {
		return null;
	}

	return {
		title: detected.title ?? "",
		company: detected.company ?? "",
		location: detected.location ?? "",
		url,
		platform: platformLabel,
		descriptionText:
			formattedDescription.text ||
			detected.description ||
			pageText.slice(0, 8000),
		descriptionHtml: formattedDescription.html,
		salary: detected.salary ?? findSalaryFromText(pageText),
		logoUrl: detected.logoUrl || getLogoUrl(),
		employmentType: detected.employmentType || getJobTypeFromText(pageText),
		workplaceType: detected.workplaceType || getWorkplaceTypeFromText(pageText),
		confidence: getConfidence(detected),
	};

	function detectPlatform(pageUrl: string) {
		const hostname = new URL(pageUrl).hostname.toLowerCase();

		if (hostname.includes("linkedin.com")) return "linkedin";
		if (hostname.includes("indeed.")) return "indeed";
		if (hostname.includes("greenhouse.io")) return "greenhouse";
		if (hostname.includes("lever.co")) return "lever";
		if (hostname.includes("workdayjobs.com")) return "workday";
		if (hostname.includes("ashbyhq.com")) return "ashby";
		if (hostname.includes("bdjobs.com")) return "bdjobs";
		if (hostname.includes("wellfound.com") || hostname.includes("angel.co")) {
			return "wellfound";
		}
		if (hostname.includes("glassdoor.")) return "glassdoor";
		if (hostname.includes("remoteok.com")) return "remoteok";

		return "unknown";
	}

	function formatPlatform(platformName: string, pageUrl: string) {
		const labels: Record<string, string> = {
			linkedin: "LinkedIn",
			indeed: "Indeed",
			greenhouse: "Greenhouse",
			lever: "Lever",
			workday: "Workday",
			ashby: "Ashby",
			bdjobs: "Bdjobs",
			wellfound: "Wellfound",
			glassdoor: "Glassdoor",
			remoteok: "RemoteOK",
		};

		if (labels[platformName]) return labels[platformName];

		return getMeta("og:site_name") || new URL(pageUrl).hostname.replace(/^www\./, "");
	}

	function parsePlatformJob(platformName: string): ParsedDetectedJob {
		switch (platformName) {
			case "indeed":
				return parseIndeedJob();
			case "greenhouse":
				return parseGreenhouseJob();
			case "lever":
				return parseLeverJob();
			case "workday":
				return parseWorkdayJob();
			case "ashby":
				return parseAshbyJob();
			case "bdjobs":
				return parseBdjobsJob();
			case "wellfound":
				return parseWellfoundJob();
			case "glassdoor":
				return parseGlassdoorJob();
			case "remoteok":
				return parseRemoteOkJob();
			default:
				return {};
		}
	}

	function parseIndeedJob(): ParsedDetectedJob {
		const compensation = text("#salaryInfoAndJobType");
		const { salary, employmentType } = parseIndeedCompensation(compensation);

		return {
			title: text('[data-testid="jobsearch-JobInfoHeader-title"]') || text("h1"),
			company:
				text('[data-testid="inlineHeader-companyName"]') ||
				text('[data-company-name="true"]'),
			location:
				text('[data-testid="inlineHeader-companyLocation"]') ||
				text('[data-testid="job-location"]') ||
				text("#jobLocationText"),
			description: text("#jobDescriptionText") || text("#jobDescriptionText > div"),
			salary:
				salary ||
				text('#salaryInfoAndJobType .css-1oc7tea') ||
				text('[aria-label="Pay"] [data-testid="list-item"] span'),
			employmentType:
				employmentType ||
				text('#salaryInfoAndJobType .css-1u1g3ig') ||
				text('[aria-label="Job type"] [data-testid="list-item"] span'),
			logoUrl:
				text('img[data-testid="jobsearch-JobInfoHeader-logo-overlay-lower"]', "src") ||
				text(".jobsearch-JobInfoHeader-logo", "src") ||
				getLogoUrl(),
		};
	}

	function parseGreenhouseJob(): ParsedDetectedJob {
		const pageText = getPageText();

		return {
			title: text(".app-title") || text("h1"),
			company: text(".company-name") || getCompanyFromTitle(document.title),
			location: text(".location") || text('[data-qa="job-location"]'),
			description: text("#content") || text(".job__description"),
			salary: findSalaryFromText(pageText),
			employmentType: getJobTypeFromText(pageText),
			workplaceType: getWorkplaceTypeFromText(pageText),
			logoUrl: getLogoUrl(),
		};
	}

	function parseLeverJob(): ParsedDetectedJob {
		const pageText = getPageText();

		return {
			title: text(".posting-headline h2") || text("h1"),
			company: text(".main-header-logo img", "alt") || getCompanyFromTitle(document.title),
			location: text(".posting-categories .location") || text(".location"),
			description: text(".section-wrapper.page-full-width") || text(".posting-page"),
			salary: findSalaryFromText(pageText),
			employmentType:
				text(".posting-categories .commitment") || getJobTypeFromText(pageText),
			workplaceType: getWorkplaceTypeFromText(pageText),
			logoUrl: text(".main-header-logo img", "src") || getLogoUrl(),
		};
	}

	function parseWorkdayJob(): ParsedDetectedJob {
		const pageText = getPageText();

		return {
			title:
				text('[data-automation-id="jobPostingHeader"]') ||
				text('[data-automation-id="job-title"]') ||
				text("h1"),
			company: getMeta("og:site_name") || getCompanyFromTitle(document.title),
			location:
				text('[data-automation-id="locations"]') ||
				text('[data-automation-id="location"]'),
			description: text('[data-automation-id="jobPostingDescription"]') || text("main"),
			salary: findSalaryFromText(pageText),
			employmentType: getJobTypeFromText(pageText),
			workplaceType: getWorkplaceTypeFromText(pageText),
			logoUrl: getLogoUrl(),
		};
	}

	function parseAshbyJob(): ParsedDetectedJob {
		const pageText = getPageText();

		return {
			title: text("h1"),
			company: getMeta("og:site_name") || getCompanyFromTitle(document.title),
			location: text('[class*="location"]') || findLocationFromText(pageText),
			description: text('[class*="description"]') || text("main"),
			salary: findSalaryFromText(pageText),
			employmentType: getJobTypeFromText(pageText),
			workplaceType: getWorkplaceTypeFromText(pageText),
			logoUrl: getLogoUrl(),
		};
	}

	function parseBdjobsJob(): ParsedDetectedJob {
		const title = getBdjobsTitle();
		const company = getBdjobsCompany();
		const detailsRoot =
			document.querySelector<HTMLElement>("app-details-main") ||
			document.querySelector<HTMLElement>("main");
		const pageText = detailsRoot ? cleanText(detailsRoot.innerText) : getPageText();

		return {
			title,
			company,
			location:
				getBdjobsLabeledValue("Job Location") ||
				text('[data-testid="job-location"]') ||
				text('[class*="location"]') ||
				findLocationFromText(pageText),
			description: pageText,
			salary:
				getBdjobsInlineSalary() ||
				getBdjobsCompensation() ||
				getBdjobsLabeledValue("Salary") ||
				getBdjobsLabeledValue("Compensation & Other Benefits") ||
				findSalaryFromText(pageText),
			logoUrl:
				text('img[alt*="logo"]', "src") ||
				text('img[src*="bdjobs/recruiter/logos"]', "src") ||
				getLogoUrl(),
			employmentType:
				getBdjobsLabeledValue("Employment Status") ||
				getJobTypeFromText(pageText),
			workplaceType:
				getBdjobsLabeledValue("Workplace") ||
				getBdjobsLabeledValue("Work Place") ||
				getWorkplaceTypeFromText(pageText),
		};
	}

	function parseWellfoundJob(): ParsedDetectedJob {
		const pageText = getPageText();

		return {
			title: text("h1") || text('[data-testid*="job-title"]'),
			company:
				text('[data-testid*="company"]') ||
				text('[class*="company"]') ||
				getCompanyFromTitle(document.title),
			location:
				text('[data-testid*="location"]') ||
				text('[class*="location"]') ||
				findLocationFromText(pageText),
			description:
				text('[data-testid*="description"]') ||
				text('[class*="description"]') ||
				text("main"),
			salary: findSalaryFromText(pageText),
			employmentType: getJobTypeFromText(pageText),
			workplaceType: getWorkplaceTypeFromText(pageText),
			logoUrl: getLogoUrl(),
		};
	}

	function parseGlassdoorJob(): ParsedDetectedJob {
		const pageText = getPageText();

		return {
			title: text('[data-test="job-title"]') || text("h1"),
			company:
				text('[data-test="employer-name"]') ||
				text('[data-test="company-name"]') ||
				text('[class*="employer"]') ||
				getCompanyFromTitle(document.title),
			location:
				text('[data-test="location"]') ||
				text('[class*="location"]') ||
				findLocationFromText(pageText),
			description:
				text('[data-test="jobDescription"]') ||
				text('[data-brandviews*="joblisting-description"]') ||
				text('[class*="jobDescription"]') ||
				text("main"),
			salary: text('[data-test*="salary"]') || findSalaryFromText(pageText),
			employmentType: getJobTypeFromText(pageText),
			workplaceType: getWorkplaceTypeFromText(pageText),
			logoUrl: getLogoUrl(),
		};
	}

	function parseRemoteOkJob(): ParsedDetectedJob {
		const pageText = getPageText();

		return {
			title: text("h1") || text('[itemprop="title"]'),
			company:
				text('[itemprop="name"]') ||
				text('[class*="company"]') ||
				getCompanyFromTitle(document.title),
			location: text('[class*="location"]') || findLocationFromText(pageText),
			description: text('[class*="description"]') || text("main"),
			salary: text('[class*="salary"]') || findSalaryFromText(pageText),
			employmentType: getJobTypeFromText(pageText),
			workplaceType: getWorkplaceTypeFromText(pageText) || "Remote",
			logoUrl: getLogoUrl(),
		};
	}

	function parseStructuredJobData(): ParsedDetectedJob {
		const scripts = Array.from(
			document.querySelectorAll('script[type="application/ld+json"]'),
		);

		for (const script of scripts) {
			try {
				const parsed = JSON.parse(script.textContent || "");
				const items = Array.isArray(parsed) ? parsed : [parsed];

				for (const item of items) {
					const jobPosting = findJobPosting(item);

					if (jobPosting) {
						return {
							title: cleanText(jobPosting.title || jobPosting.name),
							company: cleanText(jobPosting.hiringOrganization?.name),
							location:
								getStructuredLocation(jobPosting.jobLocation) ||
								getStructuredLocation(jobPosting.applicantLocationRequirements),
							description: stripHtml(jobPosting.description),
							salary: extractSalary(jobPosting),
							logoUrl:
								cleanText(jobPosting.hiringOrganization?.logo?.url) ||
								cleanText(jobPosting.hiringOrganization?.logo) ||
								getLogoUrl(),
							employmentType: Array.isArray(jobPosting.employmentType)
								? jobPosting.employmentType
										.map((value: unknown) => cleanText(value))
										.filter(Boolean)
										.join(", ")
								: cleanText(jobPosting.employmentType),
							workplaceType: /remote/i.test(cleanText(jobPosting.jobLocationType))
								? "Remote"
								: "",
						};
					}
				}
			} catch {
				continue;
			}
		}

		return {};
	}

	function findJobPosting(data: unknown): any {
		if (!data || typeof data !== "object") return null;

		if (Array.isArray(data)) {
			for (const child of data) {
				const found = findJobPosting(child);
				if (found) return found;
			}

			return null;
		}

		const item = data as Record<string, any>;
		const type = item["@type"];
		const types = Array.isArray(type) ? type : [type];

		if (types.includes("JobPosting")) return item;

		for (const value of Object.values(item)) {
			if (Array.isArray(value)) {
				for (const child of value) {
					const found = findJobPosting(child);
					if (found) return found;
				}
			} else if (value && typeof value === "object") {
				const found = findJobPosting(value);
				if (found) return found;
			}
		}

		return null;
	}

	function parseMetaJobData(): ParsedDetectedJob {
		const title = getMeta("og:title") || getMeta("twitter:title");
		const description =
			getMeta("description") || getMeta("og:description") || getMeta("twitter:description");
		const pageText = getPageText();

		return {
			title: removeCompanyFromTitle(title || document.title),
			company: getMeta("og:site_name") || getCompanyFromTitle(title || document.title),
			location: findLocationText() || findLocationFromText(pageText),
			description,
			salary: findSalaryFromText(pageText),
			logoUrl: getLogoUrl(),
			employmentType: getJobTypeFromText(pageText),
			workplaceType: getWorkplaceTypeFromText(pageText),
		};
	}

	function parseGenericJobPage(): ParsedDetectedJob {
		const pageText = getPageText();
		const title =
			text('[data-testid*="job-title"]') ||
			text('[itemprop="title"]') ||
			text('h1[class*="job" i]') ||
			text('h1[class*="title" i]') ||
			text("h1") ||
			removeCompanyFromTitle(document.title);
		const company =
			text('[class*="company" i]') ||
			text('[data-testid*="company" i]') ||
			getMeta("og:site_name") ||
			getCompanyFromTitle(document.title);

		return {
			title,
			company,
			location: findLocationText() || findLocationFromText(pageText),
			salary: findSalaryFromText(pageText),
			logoUrl: getLogoUrl(),
			employmentType: getJobTypeFromText(pageText),
			workplaceType: getWorkplaceTypeFromText(pageText),
			description:
				text('[data-testid*="job-description"]') ||
				text('[class*="job-description" i]') ||
				text('[id*="job-description" i]') ||
				text('[class*="description" i]') ||
				text('[id*="description" i]') ||
				text('[class*="job-detail" i]') ||
				text("main"),
		};
	}

	function mergeDetected(...items: ParsedDetectedJob[]) {
		return items.reduce<ParsedDetectedJob>((result, item) => {
			for (const key of Object.keys(item) as Array<keyof ParsedDetectedJob>) {
				if (!result[key] && item[key]) {
					result[key] = item[key] as never;
				}
			}

			return result;
		}, {});
	}

	function getFormattedDescription(platformName: string) {
		if (platformName === "indeed") {
			return formatDescriptionElement(
				document.querySelector<HTMLElement>("#jobDescriptionText"),
			);
		}

		if (platformName === "bdjobs") {
			return formatDescriptionElement(
				document.querySelector<HTMLElement>("app-details-main"),
			);
		}

		if (platformName === "glassdoor") {
			const descriptionModule = document.querySelector<HTMLElement>(
				'[data-brandviews*="joblisting-description"]',
			);

			return formatDescriptionElement(
				descriptionModule?.querySelector<HTMLElement>(
					'[class*="JobDetails_jobDescription"]',
				) || descriptionModule,
			);
		}

		return { html: "", text: "" };
	}

	function getBdjobsTitle() {
		const headerTitle =
			text("button h2 + h2") ||
			text("div.flex-col-reverse h2 + h2") ||
			text("app-details-main h2 + h2");

		if (headerTitle) {
			return headerTitle;
		}

		const headingCandidates = Array.from(document.querySelectorAll("h1, h2"))
			.map((element) => cleanText(element.textContent))
			.filter(Boolean);

		return (
			headingCandidates.find(
				(candidate) =>
					candidate.length > 8 &&
					!candidate.toLowerCase().includes("application deadline") &&
					!candidate.toLowerCase().includes("job highlights") &&
					!candidate.toLowerCase().includes("skills & expertise") &&
					!candidate.toLowerCase().includes("responsibilities") &&
					!candidate.toLowerCase().includes("compensation & other benefits") &&
					!candidate.toLowerCase().includes("company information") &&
					!candidate.toLowerCase().includes("report this job"),
			) || ""
		);
	}

	function getBdjobsCompany() {
		const companyFromCard =
			text("button h2") ||
			text("div.flex-col-reverse button h2") ||
			text("app-company-info-card h2") ||
			text('img[alt$=" logo"]', "alt").replace(/\s+logo$/i, "");

		if (companyFromCard) {
			return companyFromCard;
		}

		const headingCandidates = Array.from(document.querySelectorAll("button h2, h2"))
			.map((element) => cleanText(element.textContent))
			.filter(Boolean);

		return (
			headingCandidates.find(
				(candidate) =>
					candidate.length > 2 &&
					!candidate.toLowerCase().includes("job highlights") &&
					!candidate.toLowerCase().includes("matching details") &&
					!candidate.toLowerCase().includes("skills & expertise") &&
					!candidate.toLowerCase().includes("responsibilities"),
			) || getCompanyFromTitle(document.title)
		);
	}

	function getBdjobsLabeledValue(label: string) {
		const normalizedLabel = label.trim().toLowerCase();
		const candidates = Array.from(document.querySelectorAll("p, h3, h4"));

		for (const candidate of candidates) {
			const candidateText = cleanText(candidate.textContent).replace(/\s*:\s*$/, "");
			if (candidateText.toLowerCase() !== normalizedLabel) {
				continue;
			}

			const nextText = cleanText(candidate.nextElementSibling?.textContent);
			if (nextText) {
				return nextText;
			}

			const parent = candidate.parentElement;
			if (!parent) {
				continue;
			}

			const siblings = Array.from(parent.children);
			const index = siblings.indexOf(candidate as HTMLElement);
			const siblingText = cleanText(siblings[index + 1]?.textContent);
			if (siblingText) {
				return siblingText;
			}
		}

		return "";
	}

	function getBdjobsCompensation() {
		const heading = Array.from(document.querySelectorAll("p, h3, h4")).find(
			(element) =>
				cleanText(element.textContent).toLowerCase() ===
				"compensation & other benefits",
		);

		const section = heading?.parentElement;
		if (!section) {
			return "";
		}

		return Array.from(section.querySelectorAll("li"))
			.map((item) => cleanText(item.textContent))
			.filter(Boolean)
			.join(" | ");
	}

	function getBdjobsInlineSalary() {
		const salaryLabel = Array.from(document.querySelectorAll("span, p, div")).find(
			(element) => cleanText(element.textContent) === "Salary:",
		);

		if (!salaryLabel) {
			return "";
		}

		const siblingText = cleanText(salaryLabel.nextElementSibling?.textContent);
		if (siblingText) {
			return siblingText;
		}

		const parent = salaryLabel.parentElement;
		if (!parent) {
			return "";
		}

		const values = Array.from(parent.children)
			.map((child) => cleanText(child.textContent))
			.filter(Boolean)
			.filter((value) => value !== "Salary:");

		return values[0] || "";
	}

	function text(selector: string, attr?: string) {
		const element = document.querySelector(selector);
		if (!element) return "";

		if (attr) return cleanText(element.getAttribute(attr));

		return cleanText(element.textContent);
	}

	function getMeta(property: string) {
		return cleanText(
			document
				.querySelector(`meta[property="${property}"], meta[name="${property}"]`)
				?.getAttribute("content"),
		);
	}

	function getStructuredLocation(locationData: any) {
		const locations = Array.isArray(locationData) ? locationData : [locationData];

		return locations
			.map((location) => {
				const address = location?.address || location;
				return [
					address?.addressLocality,
					address?.addressRegion,
					address?.addressCountry?.name || address?.addressCountry,
				]
					.filter(Boolean)
					.join(", ");
			})
			.filter(Boolean)
			.join(" / ");
	}

	function extractSalary(jobPosting: any) {
		const baseSalary = jobPosting.baseSalary;
		const value = baseSalary?.value || baseSalary;
		const amount = value?.value || value?.minValue || value?.maxValue;
		const max = value?.maxValue;
		const currency = baseSalary?.currency || jobPosting.salaryCurrency;

		if (!amount) return "";

		if (value?.minValue && max) {
			return cleanText(`${currency || ""} ${value.minValue} - ${max}`);
		}

		return cleanText([currency, amount].filter(Boolean).join(" "));
	}

	function getPageText() {
		return cleanText(
			document.querySelector("main")?.textContent ||
				document.body?.textContent ||
				"",
		);
	}

	function findLocationText() {
		const candidates = Array.from(
			document.querySelectorAll(
				[
					'[class*="location" i]',
					'[id*="location" i]',
					'[data-testid*="location" i]',
					'[data-automation-id*="location" i]',
				].join(","),
			),
		)
			.map((element) => cleanText(element.textContent))
			.filter(Boolean);

		return candidates.find((candidate) => candidate.length < 120) || "";
	}

	function findLocationFromText(value: string) {
		const labelled = value.match(/(?:location|office)\s*[:\-]\s*([^\n|]{2,120})/i)?.[1];
		if (labelled) {
			return cleanText(labelled);
		}

		const workplace = value.match(/\b(remote|hybrid|on-site|onsite)\b/i)?.[1];
		return workplace ? cleanText(workplace) : "";
	}

	function getCompanyFromTitle(title: string) {
		const parts = title
			.split(/\s+(?:at|@|-|–|\|)\s+/i)
			.map((part) => cleanText(part))
			.filter(Boolean);

		return parts.length > 1 ? parts[parts.length - 1] : "";
	}

	function removeCompanyFromTitle(title: string) {
		return cleanText(title).split(/\s+(?:at|@|-|–|\|)\s+/i)[0] || cleanText(title);
	}

	function getLogoUrl() {
		return (
			getMeta("og:image") ||
			getMeta("twitter:image") ||
			text('img[alt*="logo" i]', "src") ||
			text('img[class*="logo" i]', "src") ||
			text('link[rel="icon"]', "href") ||
			text('link[rel="shortcut icon"]', "href")
		);
	}

	function stripHtml(value: string) {
		const element = document.createElement("div");
		element.innerHTML = value || "";
		return cleanText(element.textContent);
	}

	function parseIndeedCompensation(value: string) {
		const cleaned = cleanText(value);
		if (!cleaned) {
			return { salary: "", employmentType: "" };
		}

		const salary =
			cleaned.match(
				/(?:\$|USD|EUR|GBP|BDT|INR|CAD|AUD|€|£|৳|₹)\s?[\d,.]+(?:\s*(?:-|to)\s*(?:\$|USD|EUR|GBP|BDT|INR|CAD|AUD|€|£|৳|₹)?\s?[\d,.]+)?(?:\s+(?:an?\s+hour|per\s+hour|a\s+year|per\s+year|a\s+month|per\s+month|\/yr|\/mo|\/hr))?/i,
			)?.[0] || "";

		const employmentType =
			cleaned.match(
				/\b(full-time|part-time|contract|temporary|internship|intern|permanent|seasonal|freelance)\b/i,
			)?.[0] || "";

		return {
			salary: cleanText(salary),
			employmentType: cleanText(employmentType),
		};
	}

	function findSalaryFromText(value: string) {
		const patterns = [
			/(?:\$|USD|EUR|GBP|BDT|INR|CAD|AUD|€|£|৳|₹)\s?[\d,.]+(?:\s*(?:-|to)\s*(?:\$|USD|EUR|GBP|BDT|INR|CAD|AUD|€|£|৳|₹)?\s?[\d,.]+)?(?:\s+(?:an?\s+hour|per\s+hour|a\s+year|per\s+year|a\s+month|per\s+month|\/yr|\/mo|\/hr))?/i,
			/\d{1,3}(?:,\d{3})*\s?(?:USD|EUR|GBP|BDT|INR|CAD|AUD)(?:\s*(?:-|to)\s*\d{1,3}(?:,\d{3})*\s?(?:USD|EUR|GBP|BDT|INR|CAD|AUD))?/i,
			/(?:salary|salary range|pay|pay range|compensation)\s*[:\-]\s*[^\n|]{3,120}/i,
		];

		for (const pattern of patterns) {
			const match = value.match(pattern)?.[0];
			if (match) {
				return cleanText(match);
			}
		}

		return "";
	}

	function getJobTypeFromText(value: string) {
		const match = value.match(
			/\b(full-time|full time|part-time|part time|contract|temporary|internship|intern|freelance|permanent)\b/i,
		)?.[1];

		return match ? cleanText(match).replace(/\b\w/g, (char) => char.toUpperCase()) : "";
	}

	function getWorkplaceTypeFromText(value: string) {
		const match = value.match(/\b(remote|hybrid|on-site|onsite)\b/i)?.[1];
		if (!match) {
			return "";
		}

		if (/^onsite$/i.test(match)) {
			return "On-site";
		}

		return cleanText(match).replace(/\b\w/g, (char) => char.toUpperCase());
	}

	function formatDescriptionElement(source: HTMLElement | null) {
		if (!source) {
			return { html: "", text: "" };
		}

		const clone = source.cloneNode(true) as HTMLElement;

		clone
			.querySelectorAll(
				[
					"script",
					"style",
					"noscript",
					"iframe",
					"svg",
					"canvas",
					"button",
					"form",
					"input",
					"textarea",
					"select",
					"[hidden]",
					'[aria-hidden="true"]',
				].join(","),
			)
			.forEach((element) => element.remove());

		clone.querySelectorAll<HTMLElement>("*").forEach((element) => {
			const tagName = element.tagName.toLowerCase();

			Array.from(element.attributes).forEach((attribute) => {
				const keepHref = tagName === "a" && attribute.name === "href";
				const keepTitle = attribute.name === "title";

				if (!keepHref && !keepTitle) {
					element.removeAttribute(attribute.name);
				}
			});

			if (tagName === "a") {
				const href = element.getAttribute("href");

				if (href) {
					try {
						element.setAttribute("href", new URL(href, window.location.href).href);
					} catch {
						element.removeAttribute("href");
					}
				}
			}
		});

		const text = (clone.innerText || clone.textContent || "")
			.replace(/\r\n/g, "\n")
			.split("\n")
			.map((line) => line.replace(/[ \t]+/g, " ").trim())
			.reduce<string[]>((lines, line) => {
				const previousLine = lines.at(-1);

				if (line === "" && previousLine === "") {
					return lines;
				}

				lines.push(line);
				return lines;
			}, [])
			.join("\n")
			.trim();

		return {
			html: clone.innerHTML.trim(),
			text,
		};
	}

	function cleanText(value: unknown) {
		return String(value ?? "")
			.replace(/\u00a0/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	function getConfidence(item: ParsedDetectedJob): DetectedJob["confidence"] {
		if (item.title && item.company && item.location) return "high";
		if (item.title && item.company) return "medium";
		return "low";
	}

	function hasDetectedJobDetails(item: ParsedDetectedJob) {
		return Boolean(
			item.title ||
				item.company ||
				item.location ||
				item.salary ||
				item.description,
		);
	}
}
