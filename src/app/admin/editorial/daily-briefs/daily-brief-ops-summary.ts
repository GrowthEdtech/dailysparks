import { getDerivedAccessState } from "../../../../lib/access-state";
import { buildProfileLocalDeliveryWindowLabel } from "../../../../lib/delivery-window";
import type { DailyBriefHistoryRecord } from "../../../../lib/daily-brief-history-schema";
import type { ParentProfile } from "../../../../lib/mvp-types";
import { getFamilyDeliveryHealthRollup } from "../../../../lib/delivery-health-rollup";

export type DailyBriefSkippedFamily = {
  parentId: string;
  parentEmail: string;
  studentName: string;
  programme: ParentProfile["student"]["programme"];
  reason: string;
  localDeliveryWindow: string;
};

export type DailyBriefChannelWatchItem = {
  parentId: string;
  parentEmail: string;
  studentName: string;
  issues: string[];
  localDeliveryWindow: string;
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
  typstDeliveredBriefCount: number;
  pypAuditedBriefCount: number;
  pypTypstAuditedBriefCount: number;
  pypOnePageCompliantBriefCount: number;
  pypPdfLibFallbackBriefCount: number;
  mypCompareOnlyBriefCount: number;
  mypTypstAuditedBriefCount: number;
  mypPagePolicyAuditedBriefCount: number;
  mypPagePolicyCompliantBriefCount: number;
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
  const auditReason =
    relevantBriefs.flatMap((entry) => entry.skippedProfiles ?? []).find(
      (entry) => entry.parentId === profile.parent.id,
    )?.reason ??
    relevantBriefs.flatMap((entry) => entry.pendingFutureProfiles ?? []).find(
      (entry) => entry.parentId === profile.parent.id,
    )?.reason ??
    relevantBriefs.flatMap((entry) => entry.heldProfiles ?? []).find(
      (entry) => entry.parentId === profile.parent.id,
    )?.reason;

  if (auditReason) {
    return auditReason;
  }

  if (
    relevantBriefs.flatMap((entry) => entry.targetedProfiles ?? []).some(
      (entry) => entry.parentId === profile.parent.id,
    )
  ) {
    return "Dispatch attempted but no delivery receipt persisted";
  }

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
  const typstDeliveredBriefCount = productionHistory.filter(
    (entry) =>
      entry.deliverySuccessCount > 0 && entry.renderAudit?.renderer === "typst",
  ).length;
  const pypProductionBriefs = productionHistory.filter(
    (entry) => entry.programme === "PYP",
  );
  const pypAuditedBriefCount = pypProductionBriefs.filter(
    (entry) => entry.renderAudit !== null && entry.renderAudit !== undefined,
  ).length;
  const pypTypstAuditedBriefCount = pypProductionBriefs.filter(
    (entry) => entry.renderAudit?.renderer === "typst",
  ).length;
  const pypOnePageCompliantBriefCount = pypProductionBriefs.filter(
    (entry) =>
      entry.renderAudit?.renderer === "typst" &&
      entry.renderAudit?.onePageCompliant === true,
  ).length;
  const pypPdfLibFallbackBriefCount = pypProductionBriefs.filter(
    (entry) => entry.renderAudit?.renderer === "pdf-lib",
  ).length;
  const mypProductionBriefs = productionHistory.filter(
    (entry) => entry.programme === "MYP",
  );
  const mypCompareOnlyBriefCount = mypProductionBriefs.length;
  const mypTypstAuditedBriefCount = mypProductionBriefs.filter(
    (entry) => entry.renderAudit?.renderer === "typst",
  ).length;
  const mypPagePolicyAuditedBriefCount = mypProductionBriefs.filter(
    (entry) =>
      entry.renderAudit?.pagePolicyLabel === "MYP compare-only" &&
      entry.renderAudit?.pagePolicyPageCountLimit === 2,
  ).length;
  const mypPagePolicyCompliantBriefCount = mypProductionBriefs.filter(
    (entry) => entry.renderAudit?.pagePolicyCompliant === true,
  ).length;

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
          localDeliveryWindow: buildProfileLocalDeliveryWindowLabel(profile),
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
          localDeliveryWindow: buildProfileLocalDeliveryWindowLabel(profile),
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
    typstDeliveredBriefCount,
    pypAuditedBriefCount,
    pypTypstAuditedBriefCount,
    pypOnePageCompliantBriefCount,
    pypPdfLibFallbackBriefCount,
    mypCompareOnlyBriefCount,
    mypTypstAuditedBriefCount,
    mypPagePolicyAuditedBriefCount,
    mypPagePolicyCompliantBriefCount,
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
