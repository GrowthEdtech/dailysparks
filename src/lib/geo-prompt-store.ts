import { firestoreGeoPromptStore } from "./firestore-geo-prompt-store";
import { type GeoEngineType, type GeoPromptPriority, type GeoPromptRecord } from "./geo-prompt-schema";
import { localGeoPromptStore } from "./local-geo-prompt-store";
import type { Programme } from "./mvp-types";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

export type CreateGeoPromptInput = {
  websiteDerivedSeedId?: string | null;
  prompt: string;
  intentLabel: string;
  priority: GeoPromptPriority;
  targetProgrammes: Programme[];
  engineCoverage: GeoEngineType[];
  fanOutHints: string[];
  active: boolean;
  notes: string;
};

export type UpdateGeoPromptInput = Partial<CreateGeoPromptInput>;

export type GeoPromptStore = {
  listPrompts(): Promise<GeoPromptRecord[]>;
  createPrompt(record: GeoPromptRecord): Promise<GeoPromptRecord>;
  updatePrompt(
    id: string,
    updater: (
      prompts: GeoPromptRecord[],
      currentPrompt: GeoPromptRecord,
    ) => GeoPromptRecord[],
  ): Promise<GeoPromptRecord | null>;
};

function getGeoPromptStore(): GeoPromptStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreGeoPromptStore
    : localGeoPromptStore;
}

function sortPrompts(prompts: GeoPromptRecord[]) {
  return [...prompts].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

function trimString(value: string) {
  return value.trim();
}

function trimStringList(values: string[]) {
  return values.map((value) => trimString(value)).filter(Boolean);
}

function trimCreateInput(input: CreateGeoPromptInput): CreateGeoPromptInput {
  return {
    websiteDerivedSeedId:
      input.websiteDerivedSeedId === undefined
        ? undefined
        : trimString(input.websiteDerivedSeedId ?? ""),
    prompt: trimString(input.prompt),
    intentLabel: trimString(input.intentLabel),
    priority: input.priority,
    targetProgrammes: input.targetProgrammes,
    engineCoverage: input.engineCoverage,
    fanOutHints: trimStringList(input.fanOutHints),
    active: input.active,
    notes: trimString(input.notes),
  };
}

function trimUpdateInput(input: UpdateGeoPromptInput): UpdateGeoPromptInput {
  return {
    ...(input.websiteDerivedSeedId !== undefined
      ? { websiteDerivedSeedId: trimString(input.websiteDerivedSeedId ?? "") }
      : {}),
    ...(input.prompt !== undefined ? { prompt: trimString(input.prompt) } : {}),
    ...(input.intentLabel !== undefined
      ? { intentLabel: trimString(input.intentLabel) }
      : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.targetProgrammes !== undefined
      ? { targetProgrammes: input.targetProgrammes }
      : {}),
    ...(input.engineCoverage !== undefined
      ? { engineCoverage: input.engineCoverage }
      : {}),
    ...(input.fanOutHints !== undefined
      ? { fanOutHints: trimStringList(input.fanOutHints) }
      : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
    ...(input.notes !== undefined ? { notes: trimString(input.notes) } : {}),
  };
}

export async function listGeoPrompts() {
  return sortPrompts(await getGeoPromptStore().listPrompts());
}

export async function createGeoPrompt(input: CreateGeoPromptInput) {
  const trimmedInput = trimCreateInput(input);
  const timestamp = new Date().toISOString();
  const nextPrompt: GeoPromptRecord = {
    id: crypto.randomUUID(),
    ...trimmedInput,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return getGeoPromptStore().createPrompt(nextPrompt);
}

export async function updateGeoPrompt(id: string, input: UpdateGeoPromptInput) {
  const store = getGeoPromptStore();
  const trimmedInput = trimUpdateInput(input);

  return store.updatePrompt(id, (prompts, currentPrompt) =>
    prompts.map((prompt) =>
      prompt.id === currentPrompt.id
        ? {
            ...prompt,
            ...trimmedInput,
            updatedAt: new Date().toISOString(),
          }
        : prompt,
    ),
  );
}
