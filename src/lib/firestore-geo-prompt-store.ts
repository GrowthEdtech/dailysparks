import { getFirebaseAdminDb } from "./firebase-admin";
import {
  GEO_ENGINE_TYPES,
  GEO_PROMPT_PRIORITIES,
  type GeoEngineType,
  type GeoPromptPriority,
  type GeoPromptRecord,
} from "./geo-prompt-schema";
import type { GeoPromptStore } from "./geo-prompt-store";
import type { Programme } from "./mvp-types";

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
  id: string,
  raw: Partial<GeoPromptRecord> | undefined,
): GeoPromptRecord {
  const timestamp = new Date().toISOString();

  return {
    id,
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

export const firestoreGeoPromptStore: GeoPromptStore = {
  async listPrompts() {
    const snapshot = await getFirebaseAdminDb().collection("geoPrompts").get();

    return snapshot.docs.map((document) =>
      normalizePromptRecord(
        document.id,
        document.data() as Partial<GeoPromptRecord> | undefined,
      ),
    );
  },

  async createPrompt(record) {
    const nextPrompt = normalizePromptRecord(record.id, record);

    await getFirebaseAdminDb()
      .collection("geoPrompts")
      .doc(nextPrompt.id)
      .set(nextPrompt);

    return nextPrompt;
  },

  async updatePrompt(id, updater) {
    const db = getFirebaseAdminDb();
    const collection = db.collection("geoPrompts");
    const snapshot = await collection.get();
    const prompts = snapshot.docs.map((document) =>
      normalizePromptRecord(
        document.id,
        document.data() as Partial<GeoPromptRecord> | undefined,
      ),
    );
    const existingPrompt = prompts.find((prompt) => prompt.id === id);

    if (!existingPrompt) {
      return null;
    }

    const nextPrompts = updater(prompts, existingPrompt).map((prompt) =>
      normalizePromptRecord(prompt.id, prompt),
    );
    const batch = db.batch();

    for (const prompt of nextPrompts) {
      batch.set(collection.doc(prompt.id), prompt);
    }

    await batch.commit();

    return nextPrompts.find((prompt) => prompt.id === id) ?? null;
  },
};
