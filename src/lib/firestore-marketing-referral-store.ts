import { getFirebaseAdminDb } from "./firebase-admin";
import type {
  MarketingLeadDeliveryStatus,
  MarketingLeadStageInterest,
} from "./marketing-lead-store-types";
import type {
  MarketingReferralInviteFilters,
  MarketingReferralInviteRecord,
  MarketingReferralInviteStore,
} from "./marketing-referral-store-types";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value) || null;
}

function normalizeStageInterest(value: unknown): MarketingLeadStageInterest {
  return value === "MYP" || value === "DP" ? value : "NOT_SURE";
}

function normalizeDeliveryStatus(value: unknown): MarketingLeadDeliveryStatus {
  return value === "sent" || value === "failed" || value === "skipped"
    ? value
    : "pending";
}

function normalizeInvite(
  id: string,
  raw: Partial<MarketingReferralInviteRecord> | undefined,
): MarketingReferralInviteRecord {
  const timestamp = new Date().toISOString();

  return {
    id,
    token: normalizeString(raw?.token) || crypto.randomUUID(),
    referrerParentId: normalizeString(raw?.referrerParentId),
    referrerParentEmail: normalizeString(raw?.referrerParentEmail).toLowerCase(),
    referrerParentFullName: normalizeString(raw?.referrerParentFullName),
    inviteeEmail: normalizeString(raw?.inviteeEmail).toLowerCase(),
    inviteeFullName: normalizeString(raw?.inviteeFullName),
    inviteeStageInterest: normalizeStageInterest(raw?.inviteeStageInterest),
    sourcePath: normalizeString(raw?.sourcePath) || "/dashboard",
    deliveryStatus: normalizeDeliveryStatus(raw?.deliveryStatus),
    deliveryMessageId: normalizeNullableString(raw?.deliveryMessageId),
    deliveryErrorMessage: normalizeNullableString(raw?.deliveryErrorMessage),
    sentAt: normalizeNullableString(raw?.sentAt),
    acceptedAt: normalizeNullableString(raw?.acceptedAt),
    trialStartedAt: normalizeNullableString(raw?.trialStartedAt),
    inviteeParentId: normalizeNullableString(raw?.inviteeParentId),
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
  };
}

function matchesFilters(
  invite: MarketingReferralInviteRecord,
  filters: MarketingReferralInviteFilters,
) {
  if (
    filters.referrerParentId &&
    invite.referrerParentId !== filters.referrerParentId.trim()
  ) {
    return false;
  }

  if (
    filters.inviteeEmail &&
    invite.inviteeEmail !== filters.inviteeEmail.trim().toLowerCase()
  ) {
    return false;
  }

  if (filters.token && invite.token !== filters.token.trim()) {
    return false;
  }

  return true;
}

export const firestoreMarketingReferralStore: MarketingReferralInviteStore = {
  async listInvites(filters = {}) {
    const db = getFirebaseAdminDb();
    let query = db.collection("marketingReferralInvites") as FirebaseFirestore.Query;

    if (filters.referrerParentId) {
      query = query.where("referrerParentId", "==", filters.referrerParentId.trim());
    }

    if (filters.inviteeEmail) {
      query = query.where(
        "inviteeEmail",
        "==",
        filters.inviteeEmail.trim().toLowerCase(),
      );
    }

    if (filters.token) {
      query = query.where("token", "==", filters.token.trim());
    }

    const snapshot = await query.get();
    const invites = snapshot.docs
      .map((document) =>
        normalizeInvite(
          document.id,
          document.data() as Partial<MarketingReferralInviteRecord> | undefined,
        ),
      )
      .filter((invite) => matchesFilters(invite, filters))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return typeof filters.limit === "number" && filters.limit > 0
      ? invites.slice(0, filters.limit)
      : invites;
  },

  async upsertInvite(record) {
    const db = getFirebaseAdminDb();
    const normalized = normalizeInvite(record.id, record);
    await db
      .collection("marketingReferralInvites")
      .doc(normalized.id)
      .set(normalized);
    return normalized;
  },
};
