export const THEME_STORAGE_KEY = "applynza.theme";
export const LEGACY_THEME_STORAGE_KEY = "applypilot.theme";

export type ThemePreference = "light" | "dark";

export async function getStoredThemePreference(): Promise<ThemePreference | null> {
	const stored = await browser.storage.local.get([
		THEME_STORAGE_KEY,
		LEGACY_THEME_STORAGE_KEY,
	]);
	const theme = stored[THEME_STORAGE_KEY] ?? stored[LEGACY_THEME_STORAGE_KEY];

	return theme === "light" || theme === "dark" ? theme : null;
}

export async function setStoredThemePreference(theme: ThemePreference) {
	await browser.storage.local.set({
		[THEME_STORAGE_KEY]: theme,
		[LEGACY_THEME_STORAGE_KEY]: theme,
	});
}
