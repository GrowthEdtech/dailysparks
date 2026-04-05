import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  PlannedNotificationRunRecord,
  PlannedNotificationRunSource,
  PlannedNotificationRunStatus,
} from "./planned-notification-history-schema";
import type { PlannedNotificationHistoryStore } from "./planned-notification-history-store-types";
import type { PlannedNotificationFamily } from "./planned-notification-state";

type LocalPlannedNotificationHistoryData = {
  entries: PlannedNotificationRunRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_PLANNED_NOTIFICATION_HISTORY_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "planned-notification-history.json",
    )
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value) || null;
}

function normalizeFamily(value: unknown): PlannedNotificationFamily {
  if (
    value === "trial-ending-reminder" ||
    value === "billing-status-update" ||
    value === "delivery-support-alert"
  ) {
    return value;
  }

  return "trial-ending-reminder";
}

function normalizeSource(value: unknown): PlannedNotificationRunSource {
  if (
    value === "growth-reconciliation" ||
    value === "stripe-webhook" ||
    value === "manual-resend" ||
    value === "manual-resolve"
  ) {
    return value;
  }

  return "growth-reconciliation";
}

function normalizeStatus(value: unknown): PlannedNotificationRunStatus {
  if (
    value === "sent" ||
    value === "skipped" ||
    value === "failed" ||
    value === "resolved"
  ) {
    return value;
  }

  return "skipped";
}

function normalizeEntry(
  raw: Partial<PlannedNotificationRunRecord> | undefined,
): PlannedNotificationRunRecord {
  const createdAt = normalizeString(raw?.createdAt) || new Date().toISOString();
  const runAt = normalizeString(raw?.runAt) || createdAt;

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    runAt,
    runDate: normalizeString(raw?.runDate) || runAt.slice(0, 10),
    parentId: normalizeString(raw?.parentId),
    parentEmail: normalizeString(raw?.parentEmail),
    notificationFamily: normalizeFamily(raw?.notificationFamily),
    source: normalizeSource(raw?.source),
    status: normalizeStatus(raw?.status),
    reason: normalizeNullableString(raw?.reason),
    deduped: raw?.deduped === true,
    messageId: normalizeNullableString(raw?.messageId),
    errorMessage: normalizeNullableString(raw?.errorMessage),
    invoiceId: normalizeNullableString(raw?.invoiceId),
    invoiceStatus: normalizeNullableString(raw?.invoiceStatus),
    trialEndsAt: normalizeNullableString(raw?.trialEndsAt),
    reasonKey: normalizeNullableString(raw?.reasonKey),
    createdAt,
  };
}

function createEmptyStore(): LocalPlannedNotificationHistoryData {
  return { entries: [] };
}

function normalizeStore(rawStore: unknown): LocalPlannedNotificationHistoryData {
  if (!rawStore || typeof rawStore !== "object") {
    return createEmptyStore();
  }

  const entries = Array.isArray((rawStore as { entries?: unknown }).entries)
    ? (
        (rawStore as { entries: Array<Partial<PlannedNotificationRunRecord>> }).entries
      ).map((entry) => normalizeEntry(entry))
    : [];

  return { entries };
}

async function readStore(): Promise<LocalPlannedNotificationHistoryData> {
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

async function writeStore(store: LocalPlannedNotificationHistoryData) {
  const filePath = getStoreFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localPlannedNotificationHistoryStore: PlannedNotificationHistoryStore = {
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
