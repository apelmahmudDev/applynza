import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
	getAuth,
	GoogleAuthProvider,
	signInWithPopup,
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

export function isFirebaseConfigured() {
	return Object.values(firebaseConfig).every(Boolean);
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
	const provider = new GoogleAuthProvider();
	const result = await signInWithPopup(getFirebaseAuth(), provider);
	return result.user;
}

export function signOutFromFirebase() {
	return signOut(getFirebaseAuth());
}
