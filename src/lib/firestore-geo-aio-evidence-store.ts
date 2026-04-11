import { getFirebaseAdminDb } from "./firebase-admin";
import {
  GEO_AIO_EVIDENCE_STATUSES,
  type GeoAioEvidenceRecord,
  type GeoAioEvidenceStatus,
} from "./geo-aio-evidence-schema";
import type { GeoAioEvidenceStore } from "./geo-aio-evidence-store";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeString(item)).filter(Boolean);
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeStatus(value: unknown): GeoAioEvidenceStatus {
  const normalized = normalizeString(value);
  return GEO_AIO_EVIDENCE_STATUSES.includes(
    normalized as GeoAioEvidenceStatus,
  )
    ? (normalized as GeoAioEvidenceStatus)
    : "inconclusive";
}

function normalizeEvidenceRecord(
  id: string,
  raw: Partial<GeoAioEvidenceRecord> | undefined,
): GeoAioEvidenceRecord {
  return {
    id,
    promptId: normalizeString(raw?.promptId),
    promptTextSnapshot: normalizeString(raw?.promptTextSnapshot),
    queryVariant:
      normalizeString(raw?.queryVariant) ||
      normalizeString(raw?.promptTextSnapshot),
    aiOverviewStatus: normalizeStatus(raw?.aiOverviewStatus),
    citationUrls: normalizeStringList(raw?.citationUrls),
    dailySparksCited: normalizeBoolean(raw?.dailySparksCited),
    evidenceUrl: normalizeString(raw?.evidenceUrl),
    screenshotUrl: normalizeString(raw?.screenshotUrl),
    observedAt: normalizeString(raw?.observedAt) || new Date().toISOString(),
    notes: normalizeString(raw?.notes),
    createdAt: normalizeString(raw?.createdAt) || new Date().toISOString(),
  };
}

export const firestoreGeoAioEvidenceStore: GeoAioEvidenceStore = {
  async listEvidence() {
    const snapshot = await getFirebaseAdminDb()
      .collection("geoAioEvidence")
      .get();

    return snapshot.docs.map((document) =>
      normalizeEvidenceRecord(
        document.id,
        document.data() as Partial<GeoAioEvidenceRecord> | undefined,
      ),
    );
  },

  async createEvidence(record) {
    const nextEvidence = normalizeEvidenceRecord(record.id, record);

    await getFirebaseAdminDb()
      .collection("geoAioEvidence")
      .doc(nextEvidence.id)
      .set(nextEvidence);

    return nextEvidence;
  },
};
