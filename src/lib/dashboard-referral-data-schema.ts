import type { MarketingReferralInviteRecord } from "./marketing-referral-store-types";

export type DashboardReferralSummary = {
  sentCount: number;
  acceptedCount: number;
  trialStartedCount: number;
};

export type DashboardReferralData = {
  summary: DashboardReferralSummary;
  recentInvites: MarketingReferralInviteRecord[];
};
