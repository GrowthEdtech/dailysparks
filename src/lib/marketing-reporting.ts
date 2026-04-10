import type { ParentProfile } from "./mvp-types";
import type { DailyBriefNotebookEntryRecord } from "./daily-brief-notebook-store";
import type { MarketingLeadRecord } from "./marketing-lead-store-types";
import type { MarketingReferralInviteRecord } from "./marketing-referral-store-types";
import type { DailyBriefNotebookWeeklyRecapRecord } from "./daily-brief-notebook-weekly-recap-store";

export type MarketingAttributionSource = "starter-kit" | "referral" | "direct";

export type MarketingAttributionSummary = {
  source: MarketingAttributionSource;
  label: string;
  profileCount: number;
  trialStarted: number;
  firstBriefDelivered: number;
  paidActivated: number;
};

export type MarketingRecentTrialProfile = {
  parentId: string;
  parentEmail: string;
  parentFullName: string;
  studentName: string;
  programme: ParentProfile["student"]["programme"];
  source: MarketingAttributionSource;
  sourceLabel: string;
  trialStartedAt: string | null;
  firstBriefDeliveredAt: string | null;
  paidActivatedAt: string | null;
  notebookEntryCount: number;
  weeklyRecapCount: number;
  trialConversionNurtureLastStage: number | null;
  trialConversionNurtureLastStatus: string | null;
};

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
    paidActivated: number;
    notebookEntries: number;
    weeklyRecaps: number;
  };
  referrals: {
    sent: number;
    accepted: number;
    trialStarted: number;
  };
  attribution: MarketingAttributionSummary[];
  recentLeads: MarketingLeadRecord[];
  recentReferralInvites: MarketingReferralInviteRecord[];
  recentTrialProfiles: MarketingRecentTrialProfile[];
};

const ATTRIBUTION_SOURCE_ORDER: MarketingAttributionSource[] = [
  "starter-kit",
  "referral",
  "direct",
];

const ATTRIBUTION_SOURCE_LABELS: Record<MarketingAttributionSource, string> = {
  "starter-kit": "Starter kit",
  referral: "Referral",
  direct: "Direct",
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getPaidActivatedAt(profile: ParentProfile) {
  return profile.parent.firstPaidAt ?? profile.parent.subscriptionActivatedAt ?? null;
}

function resolveAttributionSource(input: {
  profile: ParentProfile;
  leadEmails: Set<string>;
  referralParentIds: Set<string>;
  referralEmails: Set<string>;
}): MarketingAttributionSource {
  if (
    input.referralParentIds.has(input.profile.parent.id) ||
    input.referralEmails.has(normalizeEmail(input.profile.parent.email))
  ) {
    return "referral";
  }

  if (input.leadEmails.has(normalizeEmail(input.profile.parent.email))) {
    return "starter-kit";
  }

  return "direct";
}

function getLatestLifecycleTimestamp(profile: ParentProfile) {
  return (
    getPaidActivatedAt(profile) ??
    profile.parent.firstBriefDeliveredAt ??
    profile.parent.trialStartedAt ??
    profile.parent.updatedAt
  );
}

export function buildMarketingReportingSummary(input: {
  leads: MarketingLeadRecord[];
  referralInvites: MarketingReferralInviteRecord[];
  profiles: ParentProfile[];
  notebookEntries: DailyBriefNotebookEntryRecord[];
  weeklyRecaps: DailyBriefNotebookWeeklyRecapRecord[];
}): MarketingReportingSummary {
  const leadEmails = new Set(input.leads.map((lead) => normalizeEmail(lead.email)));
  const referralParentIds = new Set(
    input.referralInvites
      .map((invite) => invite.inviteeParentId?.trim() || null)
      .filter(Boolean) as string[],
  );
  const referralEmails = new Set(
    input.referralInvites.map((invite) => normalizeEmail(invite.inviteeEmail)),
  );
  const notebookEntryCountByParentId = new Map<string, number>();
  const weeklyRecapCountByParentId = new Map<string, number>();

  for (const entry of input.notebookEntries) {
    notebookEntryCountByParentId.set(
      entry.parentId,
      (notebookEntryCountByParentId.get(entry.parentId) ?? 0) + 1,
    );
  }

  for (const recap of input.weeklyRecaps) {
    weeklyRecapCountByParentId.set(
      recap.parentId,
      (weeklyRecapCountByParentId.get(recap.parentId) ?? 0) + 1,
    );
  }

  const attributionCounts = new Map<
    MarketingAttributionSource,
    MarketingAttributionSummary
  >(
    ATTRIBUTION_SOURCE_ORDER.map((source) => [
      source,
      {
        source,
        label: ATTRIBUTION_SOURCE_LABELS[source],
        profileCount: 0,
        trialStarted: 0,
        firstBriefDelivered: 0,
        paidActivated: 0,
      },
    ]),
  );

  const recentTrialProfiles = [...input.profiles]
    .filter((profile) => Boolean(profile.parent.trialStartedAt))
    .sort((left, right) =>
      getLatestLifecycleTimestamp(right).localeCompare(getLatestLifecycleTimestamp(left)),
    )
    .slice(0, 5)
    .map((profile) => {
      const source = resolveAttributionSource({
        profile,
        leadEmails,
        referralParentIds,
        referralEmails,
      });

      return {
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        parentFullName: profile.parent.fullName,
        studentName: profile.student.studentName,
        programme: profile.student.programme,
        source,
        sourceLabel: ATTRIBUTION_SOURCE_LABELS[source],
        trialStartedAt: profile.parent.trialStartedAt ?? null,
        firstBriefDeliveredAt: profile.parent.firstBriefDeliveredAt ?? null,
        paidActivatedAt: getPaidActivatedAt(profile),
        notebookEntryCount: notebookEntryCountByParentId.get(profile.parent.id) ?? 0,
        weeklyRecapCount: weeklyRecapCountByParentId.get(profile.parent.id) ?? 0,
        trialConversionNurtureLastStage:
          profile.parent.trialConversionNurtureLastStage ?? null,
        trialConversionNurtureLastStatus:
          profile.parent.trialConversionNurtureLastStatus ?? null,
      };
    });

  for (const profile of input.profiles) {
    const source = resolveAttributionSource({
      profile,
      leadEmails,
      referralParentIds,
      referralEmails,
    });
    const bucket = attributionCounts.get(source);

    if (!bucket) {
      continue;
    }

    bucket.profileCount += 1;

    if (profile.parent.trialStartedAt) {
      bucket.trialStarted += 1;
    }

    if (profile.parent.firstBriefDeliveredAt) {
      bucket.firstBriefDelivered += 1;
    }

    if (getPaidActivatedAt(profile)) {
      bucket.paidActivated += 1;
    }
  }

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
      paidActivated: input.profiles.filter((profile) => Boolean(getPaidActivatedAt(profile)))
        .length,
      notebookEntries: input.notebookEntries.length,
      weeklyRecaps: input.weeklyRecaps.length,
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
    attribution: ATTRIBUTION_SOURCE_ORDER.map(
      (source) => attributionCounts.get(source)!,
    ),
    recentLeads: [...input.leads]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5),
    recentReferralInvites: [...input.referralInvites]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5),
    recentTrialProfiles,
  };
}
