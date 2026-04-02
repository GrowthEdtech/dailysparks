import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  PROMPT_POLICY_STATUSES,
  type PromptPolicyRecord,
  type PromptPolicyStatus,
} from "./prompt-policy-schema";
import type { PromptPolicyStore } from "./prompt-policy-store-types";

type LocalPromptPolicyStoreData = {
  policies: PromptPolicyRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_PROMPT_POLICY_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "prompt-policies.json",
    )
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown): PromptPolicyStatus {
  const normalized = normalizeString(value);
  return PROMPT_POLICY_STATUSES.includes(normalized as PromptPolicyStatus)
    ? (normalized as PromptPolicyStatus)
    : "draft";
}

function normalizePolicyRecord(
  raw: Partial<PromptPolicyRecord> | undefined,
): PromptPolicyRecord {
  const timestamp = new Date().toISOString();

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    name: normalizeString(raw?.name),
    versionLabel: normalizeString(raw?.versionLabel),
    status: normalizeStatus(raw?.status),
    sharedInstructions: normalizeString(raw?.sharedInstructions),
    antiRepetitionInstructions: normalizeString(raw?.antiRepetitionInstructions),
    outputContractInstructions: normalizeString(raw?.outputContractInstructions),
    pypInstructions: normalizeString(raw?.pypInstructions),
    mypInstructions: normalizeString(raw?.mypInstructions),
    dpInstructions: normalizeString(raw?.dpInstructions),
    notes: normalizeString(raw?.notes),
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
    activatedAt: normalizeString(raw?.activatedAt) || null,
  };
}

async function readStore(): Promise<LocalPromptPolicyStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as {
      policies?: PromptPolicyRecord[];
    };

    return {
      policies: Array.isArray(parsed.policies)
        ? parsed.policies.map((policy) => normalizePolicyRecord(policy))
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { policies: [] };
    }

    throw error;
  }
}

async function writeStore(store: LocalPromptPolicyStoreData) {
  const filePath = getStoreFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localPromptPolicyStore: PromptPolicyStore = {
  async listPolicies() {
    const store = await readStore();
    return store.policies;
  },

  async getPolicy(id) {
    const store = await readStore();
    return store.policies.find((policy) => policy.id === id) ?? null;
  },

  async createPolicy(record) {
    const normalizedRecord = normalizePolicyRecord(record);
    const store = await readStore();

    await writeStore({
      policies: [...store.policies, normalizedRecord],
    });

    return normalizedRecord;
  },

  async updatePolicy(id, updater) {
    const store = await readStore();
    const existingPolicy = store.policies.find((policy) => policy.id === id);

    if (!existingPolicy) {
      return null;
    }

    const nextPolicies = updater(store.policies, existingPolicy).map((policy) =>
      normalizePolicyRecord(policy),
    );
    const nextPolicy = nextPolicies.find((policy) => policy.id === id) ?? null;

    await writeStore({ policies: nextPolicies });

    return nextPolicy;
  },
};
