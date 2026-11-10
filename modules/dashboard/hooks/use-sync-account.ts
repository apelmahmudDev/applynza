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
	setSyncEnabled,
	startRemoteListeners,
	startStorageSyncListener,
	stopRemoteListeners,
	syncNow,
	type SyncSettings,
} from "@/lib/sync/service";

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

		if (configured) {
			unsubscribeAuth = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
				void (async () => {
					if (!isMounted) {
						return;
					}

					setUser(nextUser);
					try {
						if (nextUser && (await getSyncSettings()).enabled) {
							startRemoteListeners();
						} else {
							stopRemoteListeners();
						}
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
			unsubscribeAuth?.();
			stopRemoteListeners();
		};
	}, [configured]);

	const signIn = useCallback(async () => {
		setIsBusy(true);
		setErrorMessage(null);
		try {
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
			await setSyncEnabled(false);
			await signOutFromFirebase();
			setUser(null);
			setSettings((current) => ({ ...current, enabled: false }));
			toast.success("Signed out. Your local data is unchanged.");
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Could not sign out.",
			);
			toast.error(error instanceof Error ? error.message : "Could not sign out.");
		} finally {
			setIsBusy(false);
		}
	}, []);

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

	const sync = useCallback(async () => {
		setIsBusy(true);
		setErrorMessage(null);
		try {
			await syncNow();
			setSettings(await getSyncSettings());
			toast.success("Data synced successfully.");
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Could not sync data.",
			);
			toast.error(error instanceof Error ? error.message : "Could not sync data.");
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
		sync,
	};
}
