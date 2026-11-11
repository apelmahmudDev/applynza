import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
	getAuth,
	GoogleAuthProvider,
	signInWithCredential,
	signOut,
	type Auth,
	type User,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
	apiKey: import.meta.env.WXT_FIREBASE_API_KEY?.trim() ?? "",
	authDomain: import.meta.env.WXT_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
	projectId: import.meta.env.WXT_FIREBASE_PROJECT_ID?.trim() ?? "",
	storageBucket: import.meta.env.WXT_FIREBASE_STORAGE_BUCKET?.trim() ?? "",
	messagingSenderId: import.meta.env.WXT_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? "",
	appId: import.meta.env.WXT_FIREBASE_APP_ID?.trim() ?? "",
};
const googleOAuthClientId =
	import.meta.env.WXT_GOOGLE_OAUTH_CLIENT_ID?.trim() ?? "";

export function isFirebaseConfigured() {
	return Object.values(firebaseConfig).every(Boolean) && Boolean(googleOAuthClientId);
}

export function getFirebaseApp(): FirebaseApp {
	if (!isFirebaseConfigured()) {
		throw new Error(
			"Firebase is not configured. Add the WXT_FIREBASE_* environment variables first.",
		);
	}

	return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
	return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
	return getFirestore(getFirebaseApp());
}

export async function signInWithGoogle(): Promise<User> {
	if (!googleOAuthClientId) {
		throw new Error(
			"Google sign-in is not configured. Add the OAuth client ID first.",
		);
	}

	const redirectUri = chrome.identity.getRedirectURL();
	const state = createRandomToken();
	const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
	authUrl.search = new URLSearchParams({
		client_id: googleOAuthClientId,
		redirect_uri: redirectUri,
		response_type: "id_token",
		scope: "openid email profile",
		state,
		nonce: createRandomToken(),
	}).toString();

	const responseUrl = await chrome.identity.launchWebAuthFlow({
		url: authUrl.toString(),
		interactive: true,
	});

	if (!responseUrl) {
		throw new Error("Google sign-in was cancelled.");
	}

	const response = new URL(responseUrl);
	const responseParams = new URLSearchParams(response.hash.slice(1));
	const returnedState = responseParams.get("state");
	const idToken = responseParams.get("id_token");
	const error = responseParams.get("error");

	if (error) {
		throw new Error("Google sign-in could not be completed.");
	}

	if (returnedState !== state || !idToken) {
		throw new Error("Google sign-in returned an invalid response.");
	}

	const credential = GoogleAuthProvider.credential(idToken);
	const result = await signInWithCredential(getFirebaseAuth(), credential);
	return result.user;
}

function createRandomToken() {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function signOutFromFirebase() {
	return signOut(getFirebaseAuth());
}
