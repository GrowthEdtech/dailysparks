import { getDerivedAccessState } from "../../../../lib/access-state";
import type { DailyBriefHistoryRecord } from "../../../../lib/daily-brief-history-schema";
import type { ParentProfile } from "../../../../lib/mvp-types";
import { getFamilyDeliveryHealthRollup } from "../../../../lib/delivery-health-rollup";

export type DailyBriefSkippedFamily = {
  parentId: string;
  parentEmail: string;
  studentName: string;
  programme: ParentProfile["student"]["programme"];
  reason: string;
};

export type DailyBriefChannelWatchItem = {
  parentId: string;
  parentEmail: string;
  studentName: string;
  issues: string[];
};

export type DailyBriefFollowUpBrief = {
  id: string;
  headline: string;
  programme: DailyBriefHistoryRecord["programme"];
  status: DailyBriefHistoryRecord["status"];
  pipelineStage: DailyBriefHistoryRecord["pipelineStage"];
  reason: string;
};

export type DailyBriefOpsSummary = {
  runDate: string;
  publishedBriefCount: number;
  briefsNeedingFollowUpCount: number;
  deliveredFamilyCount: number;
  skippedFamilyCount: number;
  channelIssueCount: number;
  healthyFamilyCount: number;
  verificationNeededCount: number;
  attentionFamilyCount: number;
  skippedFamilies: DailyBriefSkippedFamily[];
  channelWatchlist: DailyBriefChannelWatchItem[];
  briefsNeedingFollowUp: DailyBriefFollowUpBrief[];
};

function isActiveForDelivery(profile: ParentProfile) {
  const accessState = getDerivedAccessState(profile.parent);

  return accessState === "active" || accessState === "trial_active";
}

function buildSkippedReason(
  profile: ParentProfile,
  relevantBriefs: DailyBriefHistoryRecord[],
  overallLevel: ReturnType<typeof getFamilyDeliveryHealthRollup>["overall"],
) {
  if (relevantBriefs.length === 0) {
    return `No ${profile.student.programme} brief generated today`;
  }

  if (
    relevantBriefs.some(
      (entry) => entry.status === "failed" || entry.pipelineStage === "failed",
    )
  ) {
    return "Brief blocked before dispatch";
  }

  if (
    relevantBriefs.some(
      (entry) =>
        entry.status === "approved" || entry.pipelineStage === "preflight_passed",
    )
  ) {
    return "Awaiting dispatch window";
  }

  if (
    relevantBriefs.some(
      (entry) =>
        entry.status === "draft" ||
        entry.pipelineStage === "generated" ||
        entry.pipelineStage === "pdf_built",
    )
  ) {
    return "Awaiting preflight";
  }

  if (relevantBriefs.some((entry) => entry.pipelineStage === "delivering")) {
    return "Dispatch in progress";
  }

  if (overallLevel === "attention") {
    return "Delivery channel needs attention";
  }

  if (overallLevel === "pending") {
    return "Delivery channel verification needed";
  }

  if (overallLevel === "not_ready") {
    return "No verified delivery channel";
  }

  return "No delivery receipt recorded";
}

function buildFollowUpReason(entry: DailyBriefHistoryRecord) {
  if (entry.failureReason) {
    return entry.failureReason;
  }

  if (entry.deliveryFailureCount > 0) {
    return `${entry.deliveryFailureCount} delivery target${
      entry.deliveryFailureCount === 1 ? "" : "s"
    } failed`;
  }

  if (entry.status === "approved" || entry.pipelineStage === "preflight_passed") {
    return "Ready to dispatch";
  }

  if (entry.status === "draft" || entry.pipelineStage === "generated") {
    return "Waiting for preflight";
  }

  if (entry.pipelineStage === "pdf_built") {
    return "PDF built, waiting for preflight";
  }

  return "Needs operator review";
}

export function buildDailyBriefOpsSummary({
  profiles,
  history,
  runDate,
}: {
  profiles: ParentProfile[];
  history: DailyBriefHistoryRecord[];
  runDate: string;
}): DailyBriefOpsSummary {
  const activeProfiles = profiles.filter(isActiveForDelivery);
  const productionHistory = history.filter(
    (entry) => entry.recordKind === "production" && entry.scheduledFor === runDate,
  );
  const deliveredParentIds = new Set(
    productionHistory.flatMap((entry) =>
      entry.deliveryReceipts.map((receipt) => receipt.parentId),
    ),
  );
  const failedParentIds = new Set(
    productionHistory.flatMap((entry) =>
      entry.failedDeliveryTargets.map((target) => target.parentId),
    ),
  );
  const briefsByProgramme = new Map<
    DailyBriefHistoryRecord["programme"],
    DailyBriefHistoryRecord[]
  >();

  productionHistory.forEach((entry) => {
    briefsByProgramme.set(entry.programme, [
      ...(briefsByProgramme.get(entry.programme) ?? []),
      entry,
    ]);
  });

  let healthyFamilyCount = 0;
  let verificationNeededCount = 0;
  let attentionFamilyCount = 0;

  const channelWatchlist = activeProfiles.reduce<DailyBriefChannelWatchItem[]>(
    (items, profile) => {
      const rollup = getFamilyDeliveryHealthRollup(profile);

      if (rollup.overall === "healthy") {
        healthyFamilyCount += 1;
        return items;
      }

      if (rollup.overall === "attention") {
        attentionFamilyCount += 1;
      } else {
        verificationNeededCount += 1;
      }

      return [
        ...items,
        {
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          studentName: profile.student.studentName,
          issues: rollup.labels,
        },
      ];
    },
    [],
  );

  const skippedFamilies = activeProfiles.reduce<DailyBriefSkippedFamily[]>(
    (items, profile) => {
      if (
        deliveredParentIds.has(profile.parent.id) ||
        failedParentIds.has(profile.parent.id)
      ) {
        return items;
      }

      const rollup = getFamilyDeliveryHealthRollup(profile);
      const relevantBriefs = briefsByProgramme.get(profile.student.programme) ?? [];

      return [
        ...items,
        {
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          studentName: profile.student.studentName,
          programme: profile.student.programme,
          reason: buildSkippedReason(profile, relevantBriefs, rollup.overall),
        },
      ];
    },
    [],
  );

  const briefsNeedingFollowUp = productionHistory
    .filter(
      (entry) =>
        entry.status !== "published" ||
        entry.pipelineStage !== "published" ||
        entry.deliveryFailureCount > 0,
    )
    .map((entry) => ({
      id: entry.id,
      headline: entry.headline,
      programme: entry.programme,
      status: entry.status,
      pipelineStage: entry.pipelineStage,
      reason: buildFollowUpReason(entry),
    }));

  return {
    runDate,
    publishedBriefCount: productionHistory.filter(
      (entry) => entry.status === "published",
    ).length,
    briefsNeedingFollowUpCount: briefsNeedingFollowUp.length,
    deliveredFamilyCount: deliveredParentIds.size,
    skippedFamilyCount: skippedFamilies.length,
    channelIssueCount: channelWatchlist.length,
    healthyFamilyCount,
    verificationNeededCount,
    attentionFamilyCount,
    skippedFamilies,
    channelWatchlist,
    briefsNeedingFollowUp,
  };
}
