"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserSessionPersistence,
  getAuth,
  setPersistence,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { getFirebaseWebConfig } from "./firebase-web-config";

const firebaseWebConfig = getFirebaseWebConfig({
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

let authInitialization: Promise<ReturnType<typeof getAuth>> | null = null;

function getFirebaseClientApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(firebaseWebConfig);
}

async function getFirebaseClientAuth() {
  if (!authInitialization) {
    const auth = getAuth(getFirebaseClientApp());
    authInitialization = setPersistence(auth, browserSessionPersistence).then(
      () => auth,
    );
  }

  return authInitialization;
}

export async function signInWithGooglePopup() {
  const auth = await getFirebaseClientAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
  });

  return signInWithPopup(auth, provider);
}

export async function signOutFirebaseClientSession() {
  const auth = await getFirebaseClientAuth();
  await signOut(auth);
}
