import type {
  MarketingLeadDeliveryStatus,
  MarketingLeadStageInterest,
} from "./marketing-lead-store-types";

export type MarketingReferralInviteRecord = {
  id: string;
  token: string;
  referrerParentId: string;
  referrerParentEmail: string;
  referrerParentFullName: string;
  inviteeEmail: string;
  inviteeFullName: string;
  inviteeStageInterest: MarketingLeadStageInterest;
  sourcePath: string;
  deliveryStatus: MarketingLeadDeliveryStatus;
  deliveryMessageId: string | null;
  deliveryErrorMessage: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  trialStartedAt: string | null;
  inviteeParentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingReferralInviteFilters = {
  referrerParentId?: string;
  inviteeEmail?: string;
  token?: string;
  limit?: number;
};

export type MarketingReferralInviteStore = {
  listInvites(
    filters?: MarketingReferralInviteFilters,
  ): Promise<MarketingReferralInviteRecord[]>;
  upsertInvite(
    record: MarketingReferralInviteRecord,
  ): Promise<MarketingReferralInviteRecord>;
};
