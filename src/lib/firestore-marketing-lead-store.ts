import { getFirebaseAdminDb } from "./firebase-admin";
import type {
  MarketingLeadDeliveryStatus,
  MarketingLeadFilters,
  MarketingLeadRecord,
  MarketingLeadSource,
  MarketingLeadStageInterest,
  MarketingLeadStore,
} from "./marketing-lead-store-types";

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
  id: string,
  raw: Partial<MarketingLeadRecord> | undefined,
): MarketingLeadRecord {
  const timestamp = new Date().toISOString();

  return {
    id,
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

function matchesFilters(lead: MarketingLeadRecord, filters: MarketingLeadFilters) {
  if (filters.email && lead.email !== filters.email.trim().toLowerCase()) {
    return false;
  }

  if (filters.source && lead.source !== filters.source) {
    return false;
  }

  return true;
}

export const firestoreMarketingLeadStore: MarketingLeadStore = {
  async listLeads(filters = {}) {
    const db = getFirebaseAdminDb();
    let query = db.collection("marketingLeads") as FirebaseFirestore.Query;

    if (filters.email) {
      query = query.where("email", "==", filters.email.trim().toLowerCase());
    }

    if (filters.source) {
      query = query.where("source", "==", filters.source);
    }

    const snapshot = await query.get();
    const leads = snapshot.docs
      .map((document) =>
        normalizeLead(
          document.id,
          document.data() as Partial<MarketingLeadRecord> | undefined,
        ),
      )
      .filter((lead) => matchesFilters(lead, filters))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return typeof filters.limit === "number" && filters.limit > 0
      ? leads.slice(0, filters.limit)
      : leads;
  },

  async upsertLead(record) {
    const db = getFirebaseAdminDb();
    const normalized = normalizeLead(record.id, record);
    await db.collection("marketingLeads").doc(normalized.id).set(normalized);
    return normalized;
  },
};
