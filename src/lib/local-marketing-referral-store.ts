import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  MarketingLeadDeliveryStatus,
  MarketingLeadStageInterest,
} from "./marketing-lead-store-types";
import type {
  MarketingReferralInviteFilters,
  MarketingReferralInviteRecord,
  MarketingReferralInviteStore,
} from "./marketing-referral-store-types";

type LocalMarketingReferralData = {
  invites: MarketingReferralInviteRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_MARKETING_REFERRAL_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "marketing-referrals.json",
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

function normalizeDeliveryStatus(value: unknown): MarketingLeadDeliveryStatus {
  return value === "sent" || value === "failed" || value === "skipped"
    ? value
    : "pending";
}

function normalizeInvite(
  raw: Partial<MarketingReferralInviteRecord> | undefined,
): MarketingReferralInviteRecord {
  const timestamp = new Date().toISOString();

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
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

function createEmptyStore(): LocalMarketingReferralData {
  return { invites: [] };
}

function normalizeStore(rawStore: unknown): LocalMarketingReferralData {
  if (!rawStore || typeof rawStore !== "object") {
    return createEmptyStore();
  }

  const invites = Array.isArray((rawStore as { invites?: unknown }).invites)
    ? ((rawStore as { invites: Array<Partial<MarketingReferralInviteRecord>> })
        .invites).map((invite) => normalizeInvite(invite))
    : [];

  return { invites };
}

async function readStore(): Promise<LocalMarketingReferralData> {
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

async function writeStore(store: LocalMarketingReferralData) {
  const filePath = getStoreFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
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

export const localMarketingReferralStore: MarketingReferralInviteStore = {
  async getInviteById(id) {
    const store = await readStore();
    return store.invites.find((invite) => invite.id === id) ?? null;
  },

  async listInvites(filters = {}) {
    const store = await readStore();
    const invites = [...store.invites]
      .map((invite) => normalizeInvite(invite))
      .filter((invite) => matchesFilters(invite, filters))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return typeof filters.limit === "number" && filters.limit > 0
      ? invites.slice(0, filters.limit)
      : invites;
  },

  async upsertInvite(record) {
    const store = await readStore();
    const normalized = normalizeInvite(record);
    const nextInvites = store.invites.filter((invite) => invite.id !== normalized.id);
    nextInvites.push(normalized);
    await writeStore({ invites: nextInvites });
    return normalized;
  },
};
