export const THEME_STORAGE_KEY = "applynza.theme";
export const LEGACY_THEME_STORAGE_KEY = "applypilot.theme";
import {
	ANONYMOUS_ACCOUNT_ID,
	getAccountStorageKey,
	getCurrentAccountId,
} from "@/lib/storage/account";

export type ThemePreference = "light" | "dark";

export async function getStoredThemePreference(): Promise<ThemePreference | null> {
	const accountId = getCurrentAccountId();
	const stored = await browser.storage.local.get([
		getAccountStorageKey(THEME_STORAGE_KEY, accountId),
		THEME_STORAGE_KEY,
		LEGACY_THEME_STORAGE_KEY,
	]);
	let theme = stored[getAccountStorageKey(THEME_STORAGE_KEY, accountId)];

	if (!theme && accountId === ANONYMOUS_ACCOUNT_ID) {
		theme = stored[THEME_STORAGE_KEY] ?? stored[LEGACY_THEME_STORAGE_KEY];
		if (theme === "light" || theme === "dark") {
			await saveThemeToAccountCache(accountId, theme);
		}
	}

	return theme === "light" || theme === "dark" ? theme : null;
}

export async function setStoredThemePreference(theme: ThemePreference) {
	await browser.storage.local.set({
		[THEME_STORAGE_KEY]: theme,
		[LEGACY_THEME_STORAGE_KEY]: theme,
		[getAccountStorageKey(THEME_STORAGE_KEY)]: theme,
	});
	void import("@/lib/sync/service").then(({ queueSync }) => queueSync());
}

export async function saveThemeToAccountCache(
	accountId: string,
	theme: unknown,
) {
	if (theme) {
		await browser.storage.local.set({
			[getAccountStorageKey(THEME_STORAGE_KEY, accountId)]: theme,
		});
	}
}

export async function loadThemeFromAccountCache(accountId: string) {
	const stored = await browser.storage.local.get(
		getAccountStorageKey(THEME_STORAGE_KEY, accountId),
	);
	const theme = stored[getAccountStorageKey(THEME_STORAGE_KEY, accountId)];

	return theme === "light" || theme === "dark" ? theme : null;
}
