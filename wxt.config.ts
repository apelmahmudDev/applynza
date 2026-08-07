import { readFileSync } from "node:fs";
import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

const aiApiBaseUrl = process.env.WXT_AI_API_BASE_URL?.trim() ?? "";
const analyzeJobHostPermission = getHostPermission(aiApiBaseUrl);
const extensionVersion = getExtensionVersion();

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	manifest: {
		name: "Applynza: Job Application Tracker & Organizer",
		short_name: "Applynza",
		version: extensionVersion,
		permissions: ["activeTab", "scripting", "sidePanel", "storage"],
		host_permissions: [
			"http://*/*",
			"https://*/*",
			"*://*.linkedin.com/*",
			...(analyzeJobHostPermission ? [analyzeJobHostPermission] : []),
		],
	},
	vite: () => ({
		plugins: [tailwindcss()],
	}),
});

function getHostPermission(endpoint: string) {
	if (!endpoint) {
		return "";
	}

	try {
		const url = new URL(endpoint);
		return `${url.protocol}//${url.host}/*`;
	} catch {
		return "";
	}
}

function getExtensionVersion() {
	const packageJson = JSON.parse(
		readFileSync(new URL("./package.json", import.meta.url), "utf8"),
	) as { version?: string };

	return packageJson.version?.trim() || "0.0.0";
}
