import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { onAuthStateChanged, type User } from "firebase/auth";

import {
	getFirebaseAuth,
	isFirebaseConfigured,
	signInWithGoogle,
	signOutFromFirebase,
} from "@/lib/firebase/client";
import {
	getSyncSettings,
	cancelSignOut,
	completeSignOut,
	prepareForAccountSwitch,
	prepareForSignOut,
	isAccountSignOutInProgress,
	setSyncEnabled,
	startRemoteListeners,
	startStorageSyncListener,
	switchLocalAccount,
	stopRemoteListeners,
	type SyncSettings,
} from "@/lib/sync/service";
import { ACCOUNT_CHANGED_EVENT } from "@/lib/storage/account";

export function useSyncAccount() {
	const [user, setUser] = useState<User | null>(null);
	const [settings, setSettings] = useState<SyncSettings>({
		enabled: false,
		lastSyncedAt: null,
		lastError: null,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [isBusy, setIsBusy] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const configured = isFirebaseConfigured();

	useEffect(() => {
		let isMounted = true;
		let unsubscribeAuth: (() => void) | undefined;
		startStorageSyncListener();

		void getSyncSettings()
			.then((nextSettings) => {
				if (isMounted) {
					setSettings(nextSettings);
				}
			})
			.catch((error: unknown) => {
				if (isMounted) {
					setErrorMessage(
						error instanceof Error
							? error.message
							: "Could not load sync settings.",
					);
				}
			});

		function handleSyncSettingsChange(
			changes: Record<
				string,
				{ newValue?: unknown; oldValue?: unknown }
			>,
			areaName: string,
		) {
			if (areaName !== "local" || !changes["applynza.sync-settings"]) {
				return;
			}

			void getSyncSettings()
				.then((nextSettings) => {
					if (isMounted) {
						setSettings(nextSettings);
					}
				})
				.catch((error: unknown) => {
					if (isMounted) {
						setErrorMessage(
							error instanceof Error
								? error.message
								: "Could not update sync status.",
						);
					}
				});
		}

		browser.storage.onChanged.addListener(handleSyncSettingsChange);

		if (configured) {
			unsubscribeAuth = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
				void (async () => {
					if (!isMounted) {
						return;
					}

					setUser(nextUser);
					if (isAccountSignOutInProgress()) {
						if (isMounted) {
							setIsLoading(false);
						}
						return;
					}

					try {
						await switchLocalAccount(nextUser?.uid ?? "anonymous");
						if (nextUser) {
							const syncSettings = await getSyncSettings();

							if (!syncSettings.enabled) {
								await setSyncEnabled(true);
							} else {
								await import("@/lib/sync/service").then(({ syncNow }) =>
									syncNow(),
								);
								startRemoteListeners();
							}
						} else {
							stopRemoteListeners();
						}
						window.dispatchEvent(new Event(ACCOUNT_CHANGED_EVENT));
					} catch (error: unknown) {
						if (isMounted) {
							setErrorMessage(
								error instanceof Error
									? error.message
									: "Could not load sync status.",
							);
						}
						stopRemoteListeners();
					} finally {
						if (isMounted) {
							setIsLoading(false);
						}
					}
				})();
			});
		} else {
			setIsLoading(false);
		}

		return () => {
			isMounted = false;
			browser.storage.onChanged.removeListener(handleSyncSettingsChange);
			unsubscribeAuth?.();
			stopRemoteListeners();
		};
	}, [configured]);

	const signIn = useCallback(async () => {
		setIsBusy(true);
		setErrorMessage(null);
		try {
			await prepareForAccountSwitch();
			await signInWithGoogle();
			toast.success("Signed in with Google.");
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Could not sign in with Google.",
			);
			toast.error(
				error instanceof Error ? error.message : "Could not sign in with Google.",
			);
		} finally {
			setIsBusy(false);
		}
	}, []);

	const signOut = useCallback(async () => {
		setIsBusy(true);
		setErrorMessage(null);
		try {
			const accountId = await prepareForSignOut();
			await signOutFromFirebase();
			await completeSignOut(accountId);
			setUser(null);
			setSettings({
				enabled: false,
				lastSyncedAt: null,
				lastError: null,
			});
			window.dispatchEvent(new Event(ACCOUNT_CHANGED_EVENT));
			toast.success("Signed out. Local synced data was removed.");
			return true;
		} catch (error) {
			cancelSignOut();
			if (settings.enabled && getFirebaseAuth().currentUser) {
				startRemoteListeners();
			}
			setErrorMessage(
				error instanceof Error ? error.message : "Could not sign out.",
			);
			toast.error(
				"Could not complete sign-out. Your local data is still safe. Please retry.",
			);
			return false;
		} finally {
			setIsBusy(false);
		}
	}, [settings]);

	const toggleSync = useCallback(async (enabled: boolean) => {
		setIsBusy(true);
		setErrorMessage(null);
		try {
			await setSyncEnabled(enabled);
			setSettings(await getSyncSettings());
			if (enabled) {
				startRemoteListeners();
				toast.success("Sync enabled.");
			} else {
				toast.success("Sync disabled. Your cloud data was kept.");
			}
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Could not update sync.",
			);
			toast.error(error instanceof Error ? error.message : "Could not update sync.");
			setSettings(await getSyncSettings());
		} finally {
			setIsBusy(false);
		}
	}, []);

	return {
		user,
		settings,
		isLoading,
		isBusy,
		errorMessage,
		isConfigured: configured,
		signIn,
		signOut,
		toggleSync,
	};
}
