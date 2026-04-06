import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  GEO_ENGINE_TYPES,
  GEO_PROMPT_PRIORITIES,
  type GeoEngineType,
  type GeoPromptPriority,
  type GeoPromptRecord,
} from "./geo-prompt-schema";
import type { GeoPromptStore } from "./geo-prompt-store";
import type { Programme } from "./mvp-types";

type LocalGeoPromptStoreData = {
  prompts: GeoPromptRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_GEO_PROMPT_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "geo-prompts.json",
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

function isProgramme(value: string): value is Programme {
  return value === "PYP" || value === "MYP" || value === "DP";
}

function normalizeProgrammes(value: unknown) {
  return normalizeStringList(value).filter(isProgramme);
}

function normalizePriority(value: unknown): GeoPromptPriority {
  const normalized = normalizeString(value);
  return GEO_PROMPT_PRIORITIES.includes(normalized as GeoPromptPriority)
    ? (normalized as GeoPromptPriority)
    : "medium";
}

function normalizeEngineCoverage(value: unknown): GeoEngineType[] {
  return normalizeStringList(value).filter((item): item is GeoEngineType =>
    GEO_ENGINE_TYPES.includes(item as GeoEngineType),
  );
}

function normalizePromptRecord(
  raw: Partial<GeoPromptRecord> | undefined,
): GeoPromptRecord {
  const timestamp = new Date().toISOString();

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    websiteDerivedSeedId: normalizeString(raw?.websiteDerivedSeedId) || null,
    prompt: normalizeString(raw?.prompt),
    intentLabel: normalizeString(raw?.intentLabel),
    priority: normalizePriority(raw?.priority),
    targetProgrammes: normalizeProgrammes(raw?.targetProgrammes),
    engineCoverage: normalizeEngineCoverage(raw?.engineCoverage),
    fanOutHints: normalizeStringList(raw?.fanOutHints),
    active: raw?.active !== false,
    notes: normalizeString(raw?.notes),
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
  };
}

async function readStore(): Promise<LocalGeoPromptStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as { prompts?: GeoPromptRecord[] };

    return {
      prompts: Array.isArray(parsed.prompts)
        ? parsed.prompts.map((prompt) => normalizePromptRecord(prompt))
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { prompts: [] };
    }

    throw error;
  }
}

async function writeStore(store: LocalGeoPromptStoreData) {
  const filePath = getStoreFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localGeoPromptStore: GeoPromptStore = {
  async listPrompts() {
    const store = await readStore();
    return store.prompts;
  },

  async createPrompt(record) {
    const normalizedRecord = normalizePromptRecord(record);
    const store = await readStore();

    await writeStore({
      prompts: [...store.prompts, normalizedRecord],
    });

    return normalizedRecord;
  },

  async updatePrompt(id, updater) {
    const store = await readStore();
    const existingPrompt = store.prompts.find((prompt) => prompt.id === id);

    if (!existingPrompt) {
      return null;
    }

    const nextPrompts = updater(store.prompts, existingPrompt).map((prompt) =>
      normalizePromptRecord(prompt),
    );
    const nextPrompt = nextPrompts.find((prompt) => prompt.id === id) ?? null;

    await writeStore({ prompts: nextPrompts });

    return nextPrompt;
  },
};
