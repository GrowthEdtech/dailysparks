import type {
  EditorialSourceRole,
  EditorialUsageTier,
} from "./editorial-policy";
import {
  DAILY_SPARKS_SOURCE_WHITELIST_V1,
  getRecommendedSourcesForProgramme,
} from "./editorial-policy";
import { firestoreEditorialSourceStore } from "./firestore-editorial-source-store";
import { localEditorialSourceStore } from "./local-editorial-source-store";
import type { Programme } from "./mvp-types";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

export const EDITORIAL_INGESTION_MODES = [
  "metadata-only",
  "summary-link",
] as const;

export type EditorialIngestionMode =
  (typeof EDITORIAL_INGESTION_MODES)[number];

export type EditorialSourceRecord = {
  id: string;
  name: string;
  domain: string;
  homepage: string;
  roles: EditorialSourceRole[];
  usageTiers: EditorialUsageTier[];
  recommendedProgrammes: Programme[];
  sections: string[];
  ingestionMode: EditorialIngestionMode;
  active: boolean;
  notes: string;
  seededFromPolicy: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateEditorialSourceInput = {
  name: string;
  domain: string;
  homepage: string;
  roles: EditorialSourceRole[];
  usageTiers: EditorialUsageTier[];
  recommendedProgrammes: Programme[];
  sections: string[];
  ingestionMode: EditorialIngestionMode;
  active: boolean;
  notes: string;
};

export type UpdateEditorialSourceInput = Partial<CreateEditorialSourceInput>;

export type EditorialSourceStore = {
  listSources(): Promise<EditorialSourceRecord[]>;
  createSource(input: CreateEditorialSourceInput): Promise<EditorialSourceRecord>;
  updateSource(
    id: string,
    input: UpdateEditorialSourceInput,
  ): Promise<EditorialSourceRecord | null>;
};

const PROGRAMMES: Programme[] = ["PYP", "MYP", "DP"];

function getEditorialSourceStore(): EditorialSourceStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreEditorialSourceStore
    : localEditorialSourceStore;
}

function buildProgrammeMap() {
  const programmeBySourceId = new Map<string, Set<Programme>>();

  for (const programme of PROGRAMMES) {
    for (const source of getRecommendedSourcesForProgramme(programme)) {
      const currentProgrammes =
        programmeBySourceId.get(source.id) ?? new Set<Programme>();
      currentProgrammes.add(programme);
      programmeBySourceId.set(source.id, currentProgrammes);
    }
  }

  return programmeBySourceId;
}

export function createSeededEditorialSources(): EditorialSourceRecord[] {
  const timestamp = new Date().toISOString();
  const programmeBySourceId = buildProgrammeMap();

  return DAILY_SPARKS_SOURCE_WHITELIST_V1.map((source) => ({
    id: source.id,
    name: source.name,
    domain: new URL(source.homepage).hostname.replace(/^www\./, ""),
    homepage: source.homepage,
    roles: [...source.roles],
    usageTiers: [...source.usageTiers],
    recommendedProgrammes: Array.from(
      programmeBySourceId.get(source.id) ?? [],
    ),
    sections: [],
    ingestionMode: "metadata-only",
    active: true,
    notes: source.summary,
    seededFromPolicy: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export async function listEditorialSources() {
  return getEditorialSourceStore().listSources();
}

export async function createEditorialSource(input: CreateEditorialSourceInput) {
  return getEditorialSourceStore().createSource(input);
}

export async function updateEditorialSource(
  id: string,
  input: UpdateEditorialSourceInput,
) {
  return getEditorialSourceStore().updateSource(id, input);
}
