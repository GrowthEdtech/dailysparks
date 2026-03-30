import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { getFirebaseProjectId } from "./profile-store-config";

function getFirebaseAdminApp() {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  const projectId = getFirebaseProjectId();

  return initializeApp({
    credential: applicationDefault(),
    projectId: projectId || "gen-lang-client-0586185740",
  });
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
