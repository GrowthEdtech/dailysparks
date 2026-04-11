import { firestoreGeoAioEvidenceStore } from "./firestore-geo-aio-evidence-store";
import {
  GEO_AIO_EVIDENCE_STATUSES,
  type GeoAioEvidenceRecord,
  type GeoAioEvidenceStatus,
} from "./geo-aio-evidence-schema";
import { localGeoAioEvidenceStore } from "./local-geo-aio-evidence-store";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

export type CreateGeoAioEvidenceInput = {
  promptId: string;
  promptTextSnapshot: string;
  queryVariant: string;
  aiOverviewStatus: GeoAioEvidenceStatus;
  citationUrls: string[];
  dailySparksCited: boolean;
  evidenceUrl: string;
  screenshotUrl: string;
  observedAt: string;
  notes: string;
};

export type GeoAioEvidenceStore = {
  listEvidence(): Promise<GeoAioEvidenceRecord[]>;
  createEvidence(record: GeoAioEvidenceRecord): Promise<GeoAioEvidenceRecord>;
};

function getGeoAioEvidenceStore(): GeoAioEvidenceStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreGeoAioEvidenceStore
    : localGeoAioEvidenceStore;
}

function trimString(value: string) {
  return value.trim();
}

function trimStringList(values: string[]) {
  return values.map((value) => trimString(value)).filter(Boolean);
}

function normalizeStatus(value: GeoAioEvidenceStatus) {
  return GEO_AIO_EVIDENCE_STATUSES.includes(value) ? value : "inconclusive";
}

export async function listGeoAioEvidence() {
  const evidence = await getGeoAioEvidenceStore().listEvidence();

  return [...evidence].sort((left, right) =>
    right.observedAt.localeCompare(left.observedAt) ||
    right.createdAt.localeCompare(left.createdAt),
  );
}

export async function createGeoAioEvidence(input: CreateGeoAioEvidenceInput) {
  const timestamp = new Date().toISOString();
  const nextEvidence: GeoAioEvidenceRecord = {
    id: crypto.randomUUID(),
    promptId: trimString(input.promptId),
    promptTextSnapshot: trimString(input.promptTextSnapshot),
    queryVariant: trimString(input.queryVariant),
    aiOverviewStatus: normalizeStatus(input.aiOverviewStatus),
    citationUrls: trimStringList(input.citationUrls),
    dailySparksCited: input.dailySparksCited,
    evidenceUrl: trimString(input.evidenceUrl),
    screenshotUrl: trimString(input.screenshotUrl),
    observedAt: trimString(input.observedAt) || timestamp,
    notes: trimString(input.notes),
    createdAt: timestamp,
  };

  return getGeoAioEvidenceStore().createEvidence(nextEvidence);
}
