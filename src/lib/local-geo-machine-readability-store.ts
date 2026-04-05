import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  GEO_READINESS_STATUSES,
  type GeoMachineReadabilityStatusRecord,
  type GeoReadinessStatus,
} from "./geo-machine-readability-schema";
import {
  buildDefaultGeoMachineReadabilityStatus,
  type GeoMachineReadabilityStore,
} from "./geo-machine-readability-store";

type LocalGeoMachineReadabilityStoreData = {
  status: GeoMachineReadabilityStatusRecord;
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_GEO_MACHINE_READABILITY_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "geo-machine-readability.json",
    )
  );
}

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

async function readStore(): Promise<LocalGeoMachineReadabilityStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as {
      status?: GeoMachineReadabilityStatusRecord;
    };

    return {
      status: normalizeMachineReadabilityStatus(parsed.status),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        status: buildDefaultGeoMachineReadabilityStatus(),
      };
    }

    throw error;
  }
}

async function writeStore(store: LocalGeoMachineReadabilityStoreData) {
  const filePath = getStoreFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localGeoMachineReadabilityStore: GeoMachineReadabilityStore = {
  async getStatus() {
    const store = await readStore();
    return store.status;
  },

  async saveStatus(status) {
    const normalizedStatus = normalizeMachineReadabilityStatus(status);
    await writeStore({ status: normalizedStatus });
    return normalizedStatus;
  },
};
