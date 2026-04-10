import type { ParentProfile } from "./mvp-types";
import type { MarketingLeadRecord } from "./marketing-lead-store-types";
import type { MarketingReferralInviteRecord } from "./marketing-referral-store-types";

export type MarketingReportingSummary = {
  leads: {
    total: number;
    delivered: number;
    failed: number;
    nurtureSent: number;
    nurtureFailed: number;
  };
  activation: {
    trialStarted: number;
    firstBriefDelivered: number;
    notebookEntries: number;
    weeklyRecaps: number;
  };
  referrals: {
    sent: number;
    accepted: number;
    trialStarted: number;
  };
  recentLeads: MarketingLeadRecord[];
  recentReferralInvites: MarketingReferralInviteRecord[];
};

export function buildMarketingReportingSummary(input: {
  leads: MarketingLeadRecord[];
  referralInvites: MarketingReferralInviteRecord[];
  profiles: ParentProfile[];
  notebookEntryCount: number;
  weeklyRecapCount: number;
}): MarketingReportingSummary {
  return {
    leads: {
      total: input.leads.length,
      delivered: input.leads.filter((lead) => lead.deliveryStatus === "sent").length,
      failed: input.leads.filter((lead) => lead.deliveryStatus === "failed").length,
      nurtureSent: input.leads.filter((lead) => lead.nurtureLastStatus === "sent")
        .length,
      nurtureFailed: input.leads.filter((lead) => lead.nurtureLastStatus === "failed")
        .length,
    },
    activation: {
      trialStarted: input.profiles.filter((profile) => Boolean(profile.parent.trialStartedAt))
        .length,
      firstBriefDelivered: input.profiles.filter((profile) =>
        Boolean(profile.parent.firstBriefDeliveredAt),
      ).length,
      notebookEntries: input.notebookEntryCount,
      weeklyRecaps: input.weeklyRecapCount,
    },
    referrals: {
      sent: input.referralInvites.filter((invite) => invite.deliveryStatus === "sent")
        .length,
      accepted: input.referralInvites.filter((invite) => Boolean(invite.acceptedAt))
        .length,
      trialStarted: input.referralInvites.filter((invite) =>
        Boolean(invite.trialStartedAt),
      ).length,
    },
    recentLeads: [...input.leads]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5),
    recentReferralInvites: [...input.referralInvites]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5),
  };
}
