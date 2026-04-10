import { firestoreMarketingReferralStore } from "./firestore-marketing-referral-store";
import { localMarketingReferralStore } from "./local-marketing-referral-store";
import type {
  MarketingLeadDeliveryStatus,
  MarketingLeadStageInterest,
} from "./marketing-lead-store-types";
import type {
  MarketingReferralInviteFilters,
  MarketingReferralInviteRecord,
  MarketingReferralInviteStore,
} from "./marketing-referral-store-types";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

function getMarketingReferralStore(): MarketingReferralInviteStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreMarketingReferralStore
    : localMarketingReferralStore;
}

function normalizeString(value: string) {
  return value.trim();
}

function normalizeNullableString(value: string | null | undefined) {
  return normalizeString(value ?? "") || null;
}

function normalizeStageInterest(
  value: MarketingLeadStageInterest | string | null | undefined,
): MarketingLeadStageInterest {
  return value === "MYP" || value === "DP" ? value : "NOT_SURE";
}

export async function listMarketingReferralInvites(
  filters: MarketingReferralInviteFilters = {},
) {
  return getMarketingReferralStore().listInvites(filters);
}

export async function createMarketingReferralInvite(input: {
  referrerParentId: string;
  referrerParentEmail: string;
  referrerParentFullName: string;
  inviteeEmail: string;
  inviteeFullName?: string;
  inviteeStageInterest?: MarketingLeadStageInterest | string | null;
  sourcePath?: string;
}) {
  const store = getMarketingReferralStore();
  const normalizedInviteeEmail = normalizeString(input.inviteeEmail).toLowerCase();
  const existingInvite =
    (
      await store.listInvites({
        referrerParentId: normalizeString(input.referrerParentId),
        inviteeEmail: normalizedInviteeEmail,
        limit: 1,
      })
    )[0] ?? null;
  const timestamp = new Date().toISOString();

  return store.upsertInvite({
    id: existingInvite?.id ?? crypto.randomUUID(),
    token: crypto.randomUUID(),
    referrerParentId: normalizeString(input.referrerParentId),
    referrerParentEmail: normalizeString(input.referrerParentEmail).toLowerCase(),
    referrerParentFullName: normalizeString(input.referrerParentFullName),
    inviteeEmail: normalizedInviteeEmail,
    inviteeFullName: normalizeString(input.inviteeFullName ?? ""),
    inviteeStageInterest: normalizeStageInterest(input.inviteeStageInterest),
    sourcePath: normalizeString(input.sourcePath ?? "") || "/dashboard",
    deliveryStatus: existingInvite?.deliveryStatus ?? "pending",
    deliveryMessageId: existingInvite?.deliveryMessageId ?? null,
    deliveryErrorMessage: existingInvite?.deliveryErrorMessage ?? null,
    sentAt: existingInvite?.sentAt ?? null,
    acceptedAt: existingInvite?.acceptedAt ?? null,
    trialStartedAt: existingInvite?.trialStartedAt ?? null,
    inviteeParentId: existingInvite?.inviteeParentId ?? null,
    createdAt: existingInvite?.createdAt ?? timestamp,
    updatedAt: timestamp,
  } satisfies MarketingReferralInviteRecord);
}

export async function recordMarketingReferralInviteDelivery(input: {
  inviteId: string;
  status: MarketingLeadDeliveryStatus;
  messageId?: string | null;
  errorMessage?: string | null;
}) {
  const store = getMarketingReferralStore();
  const invite =
    (await store.listInvites({ limit: 500 })).find(
      (candidate) => candidate.id === input.inviteId,
    ) ?? null;

  if (!invite) {
    throw new Error("Marketing referral invite could not be found.");
  }

  return store.upsertInvite({
    ...invite,
    deliveryStatus: input.status,
    deliveryMessageId: input.messageId ?? null,
    deliveryErrorMessage: input.errorMessage ?? null,
    sentAt: input.status === "sent" ? new Date().toISOString() : invite.sentAt,
    updatedAt: new Date().toISOString(),
  });
}

export async function markMarketingReferralAccepted(input: {
  token: string;
  inviteeEmail?: string | null;
}) {
  const store = getMarketingReferralStore();
  const invite =
    (
      await store.listInvites({
        token: normalizeString(input.token),
        limit: 1,
      })
    )[0] ?? null;

  if (!invite) {
    return null;
  }

  if (
    input.inviteeEmail &&
    invite.inviteeEmail !== normalizeString(input.inviteeEmail).toLowerCase()
  ) {
    return null;
  }

  return store.upsertInvite({
    ...invite,
    acceptedAt: invite.acceptedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function markMarketingReferralTrialStarted(input: {
  inviteeEmail: string;
  inviteeParentId?: string | null;
}) {
  const store = getMarketingReferralStore();
  const invite =
    (
      await store.listInvites({
        inviteeEmail: normalizeString(input.inviteeEmail).toLowerCase(),
        limit: 1,
      })
    )[0] ?? null;

  if (!invite) {
    return null;
  }

  return store.upsertInvite({
    ...invite,
    trialStartedAt: invite.trialStartedAt ?? new Date().toISOString(),
    inviteeParentId:
      normalizeNullableString(input.inviteeParentId) ?? invite.inviteeParentId,
    updatedAt: new Date().toISOString(),
  });
}
