import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { OnboardingReminderStatus } from "./mvp-types";
import type { OnboardingReminderRunRecord } from "./onboarding-reminder-history-schema";
import type { OnboardingReminderHistoryStore } from "./onboarding-reminder-history-store-types";

type LocalOnboardingReminderHistoryData = {
  entries: OnboardingReminderRunRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_ONBOARDING_REMINDER_HISTORY_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "onboarding-reminder-history.json",
    )
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value) || null;
}

function normalizeStatus(value: unknown): OnboardingReminderStatus {
  return value === "failed" ? "failed" : "sent";
}

function normalizeStageIndex(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : 1;
}

function normalizeEntry(
  raw: Partial<OnboardingReminderRunRecord> | undefined,
): OnboardingReminderRunRecord {
  const createdAt = normalizeString(raw?.createdAt) || new Date().toISOString();
  const runAt = normalizeString(raw?.runAt) || createdAt;

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    runAt,
    runDate: normalizeString(raw?.runDate) || runAt.slice(0, 10),
    parentId: normalizeString(raw?.parentId),
    parentEmail: normalizeString(raw?.parentEmail),
    stageIndex: normalizeStageIndex(raw?.stageIndex),
    stageLabel: normalizeString(raw?.stageLabel),
    status: normalizeStatus(raw?.status),
    messageId: normalizeNullableString(raw?.messageId),
    errorMessage: normalizeNullableString(raw?.errorMessage),
    createdAt,
  };
}

function createEmptyStore(): LocalOnboardingReminderHistoryData {
  return { entries: [] };
}

function normalizeStore(rawStore: unknown): LocalOnboardingReminderHistoryData {
  if (!rawStore || typeof rawStore !== "object") {
    return createEmptyStore();
  }

  const entries = Array.isArray((rawStore as { entries?: unknown }).entries)
    ? ((rawStore as { entries: Array<Partial<OnboardingReminderRunRecord>> }).entries).map(
        (entry) => normalizeEntry(entry),
      )
    : [];

  return { entries };
}

async function readStore(): Promise<LocalOnboardingReminderHistoryData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    return normalizeStore(JSON.parse(content) as unknown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyStore();
    }

    throw error;
  }
}

async function writeStore(store: LocalOnboardingReminderHistoryData) {
  const filePath = getStoreFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localOnboardingReminderHistoryStore: OnboardingReminderHistoryStore = {
  async listEntries() {
    const store = await readStore();

    return [...store.entries].sort((left, right) =>
      right.runAt.localeCompare(left.runAt),
    );
  },

  async createEntry(record) {
    const store = await readStore();
    const normalized = normalizeEntry(record);
    store.entries.push(normalized);
    await writeStore(store);
    return normalized;
  },
};
