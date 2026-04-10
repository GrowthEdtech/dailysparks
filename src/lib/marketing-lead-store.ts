import { firestoreMarketingLeadStore } from "./firestore-marketing-lead-store";
import { localMarketingLeadStore } from "./local-marketing-lead-store";
import {
  type MarketingLeadDeliveryStatus,
  type MarketingLeadFilters,
  type MarketingLeadRecord,
  type MarketingLeadSource,
  type MarketingLeadStageInterest,
  type MarketingLeadStore,
} from "./marketing-lead-store-types";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

type CaptureMarketingLeadInput = {
  email: string;
  fullName: string;
  childStageInterest: MarketingLeadStageInterest;
  source: MarketingLeadSource;
  pagePath: string;
  referrerUrl: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

type CaptureMarketingLeadResult = {
  lead: MarketingLeadRecord;
  isNew: boolean;
};

function getMarketingLeadStore(): MarketingLeadStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreMarketingLeadStore
    : localMarketingLeadStore;
}

function normalizeString(value: string) {
  return value.trim();
}

function normalizeNullableString(value: string | null | undefined) {
  return normalizeString(value ?? "") || null;
}

export async function listMarketingLeads(filters: MarketingLeadFilters = {}) {
  return getMarketingLeadStore().listLeads(filters);
}

export async function captureMarketingLead(
  input: CaptureMarketingLeadInput,
): Promise<CaptureMarketingLeadResult> {
  const store = getMarketingLeadStore();
  const normalizedEmail = normalizeString(input.email).toLowerCase();
  const existingLead =
    (await store.listLeads({
      email: normalizedEmail,
      source: input.source,
      limit: 1,
    }))[0] ?? null;
  const timestamp = new Date().toISOString();

  const nextLead: MarketingLeadRecord = {
    id: existingLead?.id ?? crypto.randomUUID(),
    email: normalizedEmail,
    fullName: normalizeString(input.fullName),
    childStageInterest: input.childStageInterest,
    source: input.source,
    pagePath: normalizeString(input.pagePath) || "/ib-parent-starter-kit",
    referrerUrl: normalizeNullableString(input.referrerUrl),
    utmSource: normalizeNullableString(input.utmSource),
    utmMedium: normalizeNullableString(input.utmMedium),
    utmCampaign: normalizeNullableString(input.utmCampaign),
    utmContent: normalizeNullableString(input.utmContent),
    utmTerm: normalizeNullableString(input.utmTerm),
    captureCount: (existingLead?.captureCount ?? 0) + 1,
    deliveryStatus: existingLead?.deliveryStatus ?? "pending",
    deliveryMessageId: existingLead?.deliveryMessageId ?? null,
    deliveryErrorMessage: existingLead?.deliveryErrorMessage ?? null,
    deliveredAt: existingLead?.deliveredAt ?? null,
    createdAt: existingLead?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const lead = await store.upsertLead(nextLead);

  return {
    lead,
    isNew: existingLead === null,
  };
}

export async function recordMarketingLeadDelivery(input: {
  leadId: string;
  status: MarketingLeadDeliveryStatus;
  messageId?: string | null;
  errorMessage?: string | null;
}) {
  const store = getMarketingLeadStore();
  const existingLead =
    (await store.listLeads({ limit: 500 })).find((lead) => lead.id === input.leadId) ??
    null;

  if (!existingLead) {
    throw new Error("Marketing lead could not be found.");
  }

  const deliveredAt = input.status === "sent" ? new Date().toISOString() : existingLead.deliveredAt;

  return store.upsertLead({
    ...existingLead,
    deliveryStatus: input.status,
    deliveryMessageId: input.messageId ?? null,
    deliveryErrorMessage: input.errorMessage ?? null,
    deliveredAt,
    updatedAt: new Date().toISOString(),
  });
}
