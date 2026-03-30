import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { getFirebaseProjectId } from "./profile-store-config";

function getFirebaseAdminApp() {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  const projectId = getFirebaseProjectId();

  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID is required when DAILY_SPARKS_STORE_BACKEND=firestore.",
    );
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}
