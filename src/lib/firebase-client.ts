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

const firebaseWebConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyDVIBj0IL04by7bWQkTWHbqS_-3Oam2_D0",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "gen-lang-client-0586185740.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "gen-lang-client-0586185740",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "gen-lang-client-0586185740.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "551520576044",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:551520576044:web:083f09f90728215ed1a789",
};

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
