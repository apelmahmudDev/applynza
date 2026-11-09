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
	const configured = isFirebaseConfigured();

	useEffect(() => {
		let isMounted = true;
		let unsubscribeAuth: (() => void) | undefined;
		startStorageSyncListener();

		void getSyncSettings().then((nextSettings) => {
			if (isMounted) {
				setSettings(nextSettings);
			}
		});

		if (configured) {
			unsubscribeAuth = onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
				if (!isMounted) {
					return;
				}

				setUser(nextUser);
				if (nextUser && (await getSyncSettings()).enabled) {
					startRemoteListeners();
				} else {
					stopRemoteListeners();
				}
				setIsLoading(false);
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
		try {
			await signInWithGoogle();
			toast.success("Signed in with Google.");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not sign in with Google.",
			);
		} finally {
			setIsBusy(false);
		}
	}, []);

	const signOut = useCallback(async () => {
		setIsBusy(true);
		try {
			await setSyncEnabled(false);
			await signOutFromFirebase();
			setUser(null);
			setSettings((current) => ({ ...current, enabled: false }));
			toast.success("Signed out. Your local data is unchanged.");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Could not sign out.");
		} finally {
			setIsBusy(false);
		}
	}, []);

	const toggleSync = useCallback(async (enabled: boolean) => {
		setIsBusy(true);
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
			toast.error(error instanceof Error ? error.message : "Could not update sync.");
			setSettings(await getSyncSettings());
		} finally {
			setIsBusy(false);
		}
	}, []);

	const sync = useCallback(async () => {
		setIsBusy(true);
		try {
			await syncNow();
			setSettings(await getSyncSettings());
			toast.success("Data synced successfully.");
		} catch (error) {
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
		isConfigured: configured,
		signIn,
		signOut,
		toggleSync,
		sync,
	};
}
