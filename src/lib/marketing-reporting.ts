import type { ParentProfile } from "./mvp-types";
import type { DailyBriefNotebookEntryRecord } from "./daily-brief-notebook-store";
import type { MarketingLeadRecord } from "./marketing-lead-store-types";
import type { MarketingReferralInviteRecord } from "./marketing-referral-store-types";
import type { DailyBriefNotebookWeeklyRecapRecord } from "./daily-brief-notebook-weekly-recap-store";
import {
  MARKETING_ATTRIBUTION_SOURCES,
  MARKETING_ATTRIBUTION_SOURCE_LABELS,
  normalizeMarketingAttributionSource,
} from "./marketing-attribution";
import type { MarketingAttributionSource } from "./marketing-attribution";

export type { MarketingAttributionSource } from "./marketing-attribution";

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
  exclusions: {
    profiles: number;
    leads: number;
    referralInvites: number;
    notebookEntries: number;
    weeklyRecaps: number;
  };
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
  ...MARKETING_ATTRIBUTION_SOURCES,
];
const INTERNAL_OR_TEST_EMAIL_DOMAINS = new Set(["example.com", "geledtech.com"]);
const MARKETING_QA_EMAIL_LOCAL_PART_MARKER = "+dailysparks-acq-qa-";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isInternalOrTestMarketingEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const atIndex = normalizedEmail.lastIndexOf("@");

  if (atIndex === -1) {
    return false;
  }

  if (
    normalizedEmail
      .slice(0, atIndex)
      .includes(MARKETING_QA_EMAIL_LOCAL_PART_MARKER)
  ) {
    return true;
  }

  return INTERNAL_OR_TEST_EMAIL_DOMAINS.has(normalizedEmail.slice(atIndex + 1));
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
  const snapshotSource = normalizeMarketingAttributionSource(
    input.profile.parent.acquisitionSource,
  );

  if (snapshotSource) {
    return snapshotSource;
  }

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
  const filteredProfiles = input.profiles.filter(
    (profile) => !isInternalOrTestMarketingEmail(profile.parent.email),
  );
  const filteredProfileIds = new Set(
    filteredProfiles.map((profile) => profile.parent.id),
  );
  const filteredLeads = input.leads.filter(
    (lead) => !isInternalOrTestMarketingEmail(lead.email),
  );
  const filteredReferralInvites = input.referralInvites.filter(
    (invite) =>
      !isInternalOrTestMarketingEmail(invite.referrerParentEmail) &&
      !isInternalOrTestMarketingEmail(invite.inviteeEmail),
  );
  const filteredNotebookEntries = input.notebookEntries.filter(
    (entry) =>
      filteredProfileIds.has(entry.parentId) &&
      !isInternalOrTestMarketingEmail(entry.parentEmail),
  );
  const filteredWeeklyRecaps = input.weeklyRecaps.filter(
    (recap) =>
      filteredProfileIds.has(recap.parentId) &&
      !isInternalOrTestMarketingEmail(recap.parentEmail),
  );
  const leadEmails = new Set(
    filteredLeads.map((lead) => normalizeEmail(lead.email)),
  );
  const referralParentIds = new Set(
    filteredReferralInvites
      .map((invite) => invite.inviteeParentId?.trim() || null)
      .filter(Boolean) as string[],
  );
  const referralEmails = new Set(
    filteredReferralInvites.map((invite) => normalizeEmail(invite.inviteeEmail)),
  );
  const notebookEntryCountByParentId = new Map<string, number>();
  const weeklyRecapCountByParentId = new Map<string, number>();

  for (const entry of filteredNotebookEntries) {
    notebookEntryCountByParentId.set(
      entry.parentId,
      (notebookEntryCountByParentId.get(entry.parentId) ?? 0) + 1,
    );
  }

  for (const recap of filteredWeeklyRecaps) {
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
        label: MARKETING_ATTRIBUTION_SOURCE_LABELS[source],
        profileCount: 0,
        trialStarted: 0,
        firstBriefDelivered: 0,
        paidActivated: 0,
      },
    ]),
  );

  const recentTrialProfiles = [...filteredProfiles]
    .filter((profile) => Boolean(profile.parent.trialStartedAt))
    .sort((left, right) =>
      getLatestLifecycleTimestamp(right).localeCompare(
        getLatestLifecycleTimestamp(left),
      ),
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
        sourceLabel: MARKETING_ATTRIBUTION_SOURCE_LABELS[source],
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

  for (const profile of filteredProfiles) {
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
    exclusions: {
      profiles: input.profiles.length - filteredProfiles.length,
      leads: input.leads.length - filteredLeads.length,
      referralInvites: input.referralInvites.length - filteredReferralInvites.length,
      notebookEntries: input.notebookEntries.length - filteredNotebookEntries.length,
      weeklyRecaps: input.weeklyRecaps.length - filteredWeeklyRecaps.length,
    },
    leads: {
      total: filteredLeads.length,
      delivered: filteredLeads.filter((lead) => lead.deliveryStatus === "sent").length,
      failed: filteredLeads.filter((lead) => lead.deliveryStatus === "failed").length,
      nurtureSent: filteredLeads.filter((lead) => lead.nurtureLastStatus === "sent")
        .length,
      nurtureFailed: filteredLeads.filter(
        (lead) => lead.nurtureLastStatus === "failed",
      ).length,
    },
    activation: {
      trialStarted: filteredProfiles.filter((profile) =>
        Boolean(profile.parent.trialStartedAt),
      ).length,
      firstBriefDelivered: filteredProfiles.filter((profile) =>
        Boolean(profile.parent.firstBriefDeliveredAt),
      ).length,
      paidActivated: filteredProfiles.filter((profile) =>
        Boolean(getPaidActivatedAt(profile)),
      ).length,
      notebookEntries: filteredNotebookEntries.length,
      weeklyRecaps: filteredWeeklyRecaps.length,
    },
    referrals: {
      sent: filteredReferralInvites.filter(
        (invite) => invite.deliveryStatus === "sent",
      ).length,
      accepted: filteredReferralInvites.filter((invite) =>
        Boolean(invite.acceptedAt),
      ).length,
      trialStarted: filteredReferralInvites.filter((invite) =>
        Boolean(invite.trialStartedAt),
      ).length,
    },
    attribution: ATTRIBUTION_SOURCE_ORDER.map(
      (source) => attributionCounts.get(source)!,
    ),
    recentLeads: [...filteredLeads]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5),
    recentReferralInvites: [...filteredReferralInvites]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5),
    recentTrialProfiles,
  };
}
