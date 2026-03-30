export type ProfileStoreBackend = "local" | "firestore";

function normalizeBackend(value: string | undefined) {
  const trimmed = value?.trim().toLowerCase();

  if (trimmed === "firestore") {
    return "firestore";
  }

  return "local";
}

export function getFirebaseProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    ""
  );
}

export function getProfileStoreBackend(): ProfileStoreBackend {
  return normalizeBackend(process.env.DAILY_SPARKS_STORE_BACKEND);
}

export function validateProfileStoreConfig() {
  const backend = getProfileStoreBackend();

  if (process.env.NODE_ENV === "production" && backend !== "firestore") {
    throw new Error(
      "Production requires DAILY_SPARKS_STORE_BACKEND=firestore.",
    );
  }

  if (backend === "firestore" && !getFirebaseProjectId()) {
    throw new Error(
      "FIREBASE_PROJECT_ID is required when DAILY_SPARKS_STORE_BACKEND=firestore.",
    );
  }
}
