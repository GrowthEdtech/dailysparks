import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  CreateEditorialSourceInput,
  EditorialIngestionMode,
  EditorialSourceRecord,
  EditorialSourceStore,
} from "./editorial-source-store";
import { createSeededEditorialSources } from "./editorial-source-store";
import {
  EDITORIAL_INGESTION_MODES,
} from "./editorial-source-store";
import type { Programme } from "./mvp-types";
import type {
  EditorialSourceRole,
  EditorialUsageTier,
} from "./editorial-policy";

type EditorialSourceStoreData = {
  sources: EditorialSourceRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_EDITORIAL_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "editorial-sources.json",
    )
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean);
}

function isProgramme(value: string): value is Programme {
  return value === "PYP" || value === "MYP" || value === "DP";
}

function normalizeProgrammeList(value: unknown) {
  return normalizeStringList(value).filter((item): item is Programme =>
    isProgramme(item),
  );
}

function isEditorialSourceRole(value: string): value is EditorialSourceRole {
  return (
    value === "daily-news" ||
    value === "explainer" ||
    value === "pyp-friendly" ||
    value === "source-of-record"
  );
}

function normalizeRoleList(value: unknown) {
  return normalizeStringList(value).filter((item): item is EditorialSourceRole =>
    isEditorialSourceRole(item),
  );
}

function isEditorialUsageTier(value: string): value is EditorialUsageTier {
  return (
    value === "primary-selection" ||
    value === "background-context" ||
    value === "fact-check"
  );
}

function normalizeUsageTierList(value: unknown) {
  return normalizeStringList(value).filter((item): item is EditorialUsageTier =>
    isEditorialUsageTier(item),
  );
}

function isIngestionMode(value: string): value is EditorialIngestionMode {
  return (
    EDITORIAL_INGESTION_MODES as readonly string[]
  ).includes(value);
}

function normalizeSourceRecord(
  raw: Partial<EditorialSourceRecord> | undefined,
): EditorialSourceRecord {
  const timestamp = new Date().toISOString();
  const name = normalizeString(raw?.name);
  const domain = normalizeString(raw?.domain).toLowerCase();
  const ingestionModeValue = normalizeString(raw?.ingestionMode);
  const ingestionMode: EditorialIngestionMode = isIngestionMode(ingestionModeValue)
    ? ingestionModeValue
    : "metadata-only";

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    name,
    domain,
    homepage: normalizeString(raw?.homepage),
    roles: normalizeRoleList(raw?.roles),
    usageTiers: normalizeUsageTierList(raw?.usageTiers),
    recommendedProgrammes: normalizeProgrammeList(raw?.recommendedProgrammes),
    sections: normalizeStringList(raw?.sections),
    ingestionMode,
    active: normalizeBoolean(raw?.active),
    notes: normalizeString(raw?.notes),
    seededFromPolicy: normalizeBoolean(raw?.seededFromPolicy),
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
  };
}

async function readStore(): Promise<EditorialSourceStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as { sources?: EditorialSourceRecord[] };
    const sources = Array.isArray(parsed.sources)
      ? parsed.sources.map((source) => normalizeSourceRecord(source))
      : [];

    if (sources.length === 0) {
      const seededSources = createSeededEditorialSources();
      await writeStore({ sources: seededSources });
      return { sources: seededSources };
    }

    return { sources };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const seededSources = createSeededEditorialSources();
      await writeStore({ sources: seededSources });
      return { sources: seededSources };
    }

    throw error;
  }
}

async function writeStore(store: EditorialSourceStoreData) {
  const filePath = getStoreFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

function createSourceRecord(input: CreateEditorialSourceInput): EditorialSourceRecord {
  const timestamp = new Date().toISOString();

  return normalizeSourceRecord({
    ...input,
    id: crypto.randomUUID(),
    seededFromPolicy: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export const localEditorialSourceStore: EditorialSourceStore = {
  async listSources() {
    const store = await readStore();
    return store.sources;
  },

  async createSource(input) {
    const store = await readStore();
    const nextSource = createSourceRecord(input);
    const nextStore = {
      sources: [...store.sources, nextSource],
    };

    await writeStore(nextStore);
    return nextSource;
  },

  async updateSource(id, input) {
    const store = await readStore();
    const existingSource = store.sources.find((source) => source.id === id);

    if (!existingSource) {
      return null;
    }

    const nextSource = normalizeSourceRecord({
      ...existingSource,
      ...input,
      id: existingSource.id,
      seededFromPolicy: existingSource.seededFromPolicy,
      createdAt: existingSource.createdAt,
      updatedAt: new Date().toISOString(),
    });
    const nextStore = {
      sources: store.sources.map((source) =>
        source.id === id ? nextSource : source,
      ),
    };

    await writeStore(nextStore);
    return nextSource;
  },
};
