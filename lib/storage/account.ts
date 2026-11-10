import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

export const ANONYMOUS_ACCOUNT_ID = "anonymous";
export const ACTIVE_ACCOUNT_STORAGE_KEY = "applynza.active-account-id";

export function getCurrentAccountId() {
	if (!isFirebaseConfigured()) {
		return ANONYMOUS_ACCOUNT_ID;
	}

	return getFirebaseAuth().currentUser?.uid ?? ANONYMOUS_ACCOUNT_ID;
}

export function getAccountStorageKey(key: string, accountId = getCurrentAccountId()) {
	return `applynza.accounts.${accountId}.${key}`;
}
