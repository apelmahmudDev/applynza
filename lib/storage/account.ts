import { onAuthStateChanged } from "firebase/auth";

import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

export const ANONYMOUS_ACCOUNT_ID = "anonymous";
export const ACTIVE_ACCOUNT_STORAGE_KEY = "applynza.active-account-id";
export const ACCOUNT_CHANGED_EVENT = "applynza:account-changed";

let authInitialization: Promise<void> | null = null;

export function waitForAuthInitialization() {
	if (!isFirebaseConfigured()) {
		return Promise.resolve();
	}

	authInitialization ??= new Promise<void>((resolve) => {
		let unsubscribe = () => {};
		unsubscribe = onAuthStateChanged(getFirebaseAuth(), () => {
			unsubscribe();
			resolve();
		});
	});

	return authInitialization;
}

export function getCurrentAccountId() {
	if (!isFirebaseConfigured()) {
		return ANONYMOUS_ACCOUNT_ID;
	}

	return getFirebaseAuth().currentUser?.uid ?? ANONYMOUS_ACCOUNT_ID;
}

export function getAccountStorageKey(key: string, accountId = getCurrentAccountId()) {
	return `applynza.accounts.${accountId}.${key}`;
}
