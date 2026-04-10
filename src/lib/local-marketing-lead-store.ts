import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  MarketingLeadDeliveryStatus,
  MarketingLeadFilters,
  MarketingLeadRecord,
  MarketingLeadSource,
  MarketingLeadStageInterest,
  MarketingLeadStore,
} from "./marketing-lead-store-types";

type LocalMarketingLeadData = {
  leads: MarketingLeadRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_MARKETING_LEAD_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "marketing-leads.json",
    )
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value) || null;
}

function normalizeStageInterest(value: unknown): MarketingLeadStageInterest {
  return value === "MYP" || value === "DP" ? value : "NOT_SURE";
}

function normalizeSource(value: unknown): MarketingLeadSource {
  return value === "ib-parent-starter-kit" ? value : "ib-parent-starter-kit";
}

function normalizeDeliveryStatus(value: unknown): MarketingLeadDeliveryStatus {
  return value === "sent" || value === "failed" || value === "skipped"
    ? value
    : "pending";
}

function normalizeLead(
  raw: Partial<MarketingLeadRecord> | undefined,
): MarketingLeadRecord {
  const timestamp = new Date().toISOString();

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    email: normalizeString(raw?.email).toLowerCase(),
    fullName: normalizeString(raw?.fullName),
    childStageInterest: normalizeStageInterest(raw?.childStageInterest),
    source: normalizeSource(raw?.source),
    pagePath: normalizeString(raw?.pagePath) || "/ib-parent-starter-kit",
    referrerUrl: normalizeNullableString(raw?.referrerUrl),
    utmSource: normalizeNullableString(raw?.utmSource),
    utmMedium: normalizeNullableString(raw?.utmMedium),
    utmCampaign: normalizeNullableString(raw?.utmCampaign),
    utmContent: normalizeNullableString(raw?.utmContent),
    utmTerm: normalizeNullableString(raw?.utmTerm),
    captureCount:
      typeof raw?.captureCount === "number" && Number.isFinite(raw.captureCount)
        ? Math.max(1, Math.trunc(raw.captureCount))
        : 1,
    deliveryStatus: normalizeDeliveryStatus(raw?.deliveryStatus),
    deliveryMessageId: normalizeNullableString(raw?.deliveryMessageId),
    deliveryErrorMessage: normalizeNullableString(raw?.deliveryErrorMessage),
    deliveredAt: normalizeNullableString(raw?.deliveredAt),
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
  };
}

function createEmptyStore(): LocalMarketingLeadData {
  return { leads: [] };
}

function normalizeStore(rawStore: unknown): LocalMarketingLeadData {
  if (!rawStore || typeof rawStore !== "object") {
    return createEmptyStore();
  }

  const leads = Array.isArray((rawStore as { leads?: unknown }).leads)
    ? ((rawStore as { leads: Array<Partial<MarketingLeadRecord>> }).leads).map(
        (lead) => normalizeLead(lead),
      )
    : [];

  return { leads };
}

async function readStore(): Promise<LocalMarketingLeadData> {
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

async function writeStore(store: LocalMarketingLeadData) {
  const filePath = getStoreFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

function matchesFilters(lead: MarketingLeadRecord, filters: MarketingLeadFilters) {
  if (filters.email && lead.email !== filters.email.trim().toLowerCase()) {
    return false;
  }

  if (filters.source && lead.source !== filters.source) {
    return false;
  }

  return true;
}

export const localMarketingLeadStore: MarketingLeadStore = {
  async listLeads(filters = {}) {
    const store = await readStore();
    const leads = [...store.leads]
      .map((lead) => normalizeLead(lead))
      .filter((lead) => matchesFilters(lead, filters))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return typeof filters.limit === "number" && filters.limit > 0
      ? leads.slice(0, filters.limit)
      : leads;
  },

  async upsertLead(record) {
    const store = await readStore();
    const normalized = normalizeLead(record);
    const nextLeads = store.leads.filter((lead) => lead.id !== normalized.id);
    nextLeads.push(normalized);
    await writeStore({ leads: nextLeads });
    return normalized;
  },
};
