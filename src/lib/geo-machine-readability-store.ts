import { firestoreGeoMachineReadabilityStore } from "./firestore-geo-machine-readability-store";
import {
  GEO_READINESS_STATUSES,
  type GeoMachineReadabilityStatusRecord,
  type GeoReadinessStatus,
} from "./geo-machine-readability-schema";
import { localGeoMachineReadabilityStore } from "./local-geo-machine-readability-store";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

export type UpdateGeoMachineReadabilityInput = {
  llmsTxtStatus?: GeoReadinessStatus;
  llmsFullTxtStatus?: GeoReadinessStatus;
  ssrStatus?: GeoReadinessStatus;
  jsonLdStatus?: GeoReadinessStatus;
  notes?: string;
  lastCheckedAt?: string | null;
};

export type GeoMachineReadabilityStore = {
  getStatus(): Promise<GeoMachineReadabilityStatusRecord>;
  saveStatus(
    status: GeoMachineReadabilityStatusRecord,
  ): Promise<GeoMachineReadabilityStatusRecord>;
};

function getGeoMachineReadabilityStore(): GeoMachineReadabilityStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreGeoMachineReadabilityStore
    : localGeoMachineReadabilityStore;
}

function isGeoReadinessStatus(value: string): value is GeoReadinessStatus {
  return GEO_READINESS_STATUSES.includes(value as GeoReadinessStatus);
}

function normalizeOptionalStatus(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return isGeoReadinessStatus(normalized) ? normalized : undefined;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function buildDefaultGeoMachineReadabilityStatus(): GeoMachineReadabilityStatusRecord {
  const timestamp = new Date().toISOString();

  return {
    llmsTxtStatus: "not-configured",
    llmsFullTxtStatus: "not-configured",
    ssrStatus: "needs-attention",
    jsonLdStatus: "needs-attention",
    notes: "",
    lastCheckedAt: null,
    updatedAt: timestamp,
  };
}

export async function getGeoMachineReadabilityStatus() {
  return getGeoMachineReadabilityStore().getStatus();
}

export async function updateGeoMachineReadabilityStatus(
  input: UpdateGeoMachineReadabilityInput,
) {
  const store = getGeoMachineReadabilityStore();
  const currentStatus = await store.getStatus();
  const nextStatus: GeoMachineReadabilityStatusRecord = {
    ...currentStatus,
    ...(input.llmsTxtStatus !== undefined
      ? { llmsTxtStatus: normalizeOptionalStatus(input.llmsTxtStatus) ?? currentStatus.llmsTxtStatus }
      : {}),
    ...(input.llmsFullTxtStatus !== undefined
      ? {
          llmsFullTxtStatus:
            normalizeOptionalStatus(input.llmsFullTxtStatus) ??
            currentStatus.llmsFullTxtStatus,
        }
      : {}),
    ...(input.ssrStatus !== undefined
      ? { ssrStatus: normalizeOptionalStatus(input.ssrStatus) ?? currentStatus.ssrStatus }
      : {}),
    ...(input.jsonLdStatus !== undefined
      ? {
          jsonLdStatus:
            normalizeOptionalStatus(input.jsonLdStatus) ??
            currentStatus.jsonLdStatus,
        }
      : {}),
    ...(input.notes !== undefined ? { notes: normalizeString(input.notes) } : {}),
    ...(input.lastCheckedAt !== undefined
      ? { lastCheckedAt: input.lastCheckedAt ? normalizeString(input.lastCheckedAt) : null }
      : {}),
    updatedAt: new Date().toISOString(),
  };

  return store.saveStatus(nextStatus);
}
