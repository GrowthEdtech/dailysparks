import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  GEO_AIO_EVIDENCE_STATUSES,
  type GeoAioEvidenceRecord,
  type GeoAioEvidenceStatus,
} from "./geo-aio-evidence-schema";
import type { GeoAioEvidenceStore } from "./geo-aio-evidence-store";

type LocalGeoAioEvidenceStoreData = {
  evidence: GeoAioEvidenceRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_GEO_AIO_EVIDENCE_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "geo-aio-evidence.json",
    )
  );
}

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
  raw: Partial<GeoAioEvidenceRecord> | undefined,
): GeoAioEvidenceRecord {
  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
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

async function readStore(): Promise<LocalGeoAioEvidenceStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as {
      evidence?: GeoAioEvidenceRecord[];
    };

    return {
      evidence: Array.isArray(parsed.evidence)
        ? parsed.evidence.map((entry) => normalizeEvidenceRecord(entry))
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { evidence: [] };
    }

    throw error;
  }
}

async function writeStore(store: LocalGeoAioEvidenceStoreData) {
  const filePath = getStoreFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localGeoAioEvidenceStore: GeoAioEvidenceStore = {
  async listEvidence() {
    const store = await readStore();
    return store.evidence;
  },

  async createEvidence(record) {
    const normalizedRecord = normalizeEvidenceRecord(record);
    const store = await readStore();

    await writeStore({
      evidence: [...store.evidence, normalizedRecord],
    });

    return normalizedRecord;
  },
};
