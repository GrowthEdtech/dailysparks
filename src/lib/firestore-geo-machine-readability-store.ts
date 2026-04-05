import { getFirebaseAdminDb } from "./firebase-admin";
import {
  GEO_READINESS_STATUSES,
  type GeoMachineReadabilityStatusRecord,
  type GeoReadinessStatus,
} from "./geo-machine-readability-schema";
import {
  buildDefaultGeoMachineReadabilityStatus,
  type GeoMachineReadabilityStore,
} from "./geo-machine-readability-store";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown, fallback: GeoReadinessStatus) {
  const normalized = normalizeString(value);
  return GEO_READINESS_STATUSES.includes(normalized as GeoReadinessStatus)
    ? (normalized as GeoReadinessStatus)
    : fallback;
}

function normalizeMachineReadabilityStatus(
  raw: Partial<GeoMachineReadabilityStatusRecord> | undefined,
): GeoMachineReadabilityStatusRecord {
  const defaults = buildDefaultGeoMachineReadabilityStatus();

  return {
    llmsTxtStatus: normalizeStatus(raw?.llmsTxtStatus, defaults.llmsTxtStatus),
    llmsFullTxtStatus: normalizeStatus(
      raw?.llmsFullTxtStatus,
      defaults.llmsFullTxtStatus,
    ),
    ssrStatus: normalizeStatus(raw?.ssrStatus, defaults.ssrStatus),
    jsonLdStatus: normalizeStatus(raw?.jsonLdStatus, defaults.jsonLdStatus),
    notes: normalizeString(raw?.notes),
    lastCheckedAt: normalizeString(raw?.lastCheckedAt) || null,
    updatedAt: normalizeString(raw?.updatedAt) || defaults.updatedAt,
  };
}

export const firestoreGeoMachineReadabilityStore: GeoMachineReadabilityStore = {
  async getStatus() {
    const document = await getFirebaseAdminDb()
      .collection("geoMachineReadability")
      .doc("status")
      .get();

    if (!document.exists) {
      return buildDefaultGeoMachineReadabilityStatus();
    }

    return normalizeMachineReadabilityStatus(
      document.data() as Partial<GeoMachineReadabilityStatusRecord> | undefined,
    );
  },

  async saveStatus(status) {
    const normalizedStatus = normalizeMachineReadabilityStatus(status);

    await getFirebaseAdminDb()
      .collection("geoMachineReadability")
      .doc("status")
      .set(normalizedStatus);

    return normalizedStatus;
  },
};
