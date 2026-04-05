import {
  updateDailyBriefHistoryEntry,
} from "./daily-brief-history-store";
import type {
  DailyBriefFailedDeliveryTarget,
  DailyBriefHistoryRecord,
} from "./daily-brief-history-schema";
import { deliverHistoryBriefToProfiles } from "./daily-brief-stage-delivery";
import { canRetryDeliveryChannel } from "./delivery-readiness";
import type { DailyBriefPdfRenderer } from "./goodnotes-delivery";
import type { ParentProfile } from "./mvp-types";

function buildManualRetryTargets(
  parentId: string,
  parentEmail: string,
  channels: DailyBriefFailedDeliveryTarget["channel"][],
) {
  return channels.map((channel) => ({
    parentId,
    parentEmail,
    channel,
    errorMessage: "Manual resend/backfill requested by editorial admin.",
  }));
}

type DeliverBriefToSingleProfileOptions = {
  brief: DailyBriefHistoryRecord;
  profile: ParentProfile;
  renderer?: DailyBriefPdfRenderer;
  notePrefix?: string;
};

export async function deliverBriefToSingleProfile({
  brief,
  profile,
  renderer = "pdf-lib",
  notePrefix = "Manual resend/backfill requested by editorial admin.",
}: DeliverBriefToSingleProfileOptions) {
  const retryableChannels: DailyBriefFailedDeliveryTarget["channel"][] = [];

  if (canRetryDeliveryChannel(profile, "goodnotes")) {
    retryableChannels.push("goodnotes");
  }

  if (canRetryDeliveryChannel(profile, "notion")) {
    retryableChannels.push("notion");
  }

  if (retryableChannels.length === 0) {
    throw new Error(
      "This family does not currently have a verified delivery channel available for resend.",
    );
  }

  const retryTargets = buildManualRetryTargets(
    profile.parent.id,
    profile.parent.email,
    retryableChannels,
  );
  const deliverySummary = await deliverHistoryBriefToProfiles([profile], brief, {
    retryTargets,
    attachmentMode: brief.recordKind === "test" ? "canary" : "production",
    renderer,
  });

  if (deliverySummary.deliveryAttemptCount === 0) {
    throw new Error("No delivery attempts were made for this resend request.");
  }

  const retriedChannels = new Set(retryTargets.map((target) => target.channel));
  const untouchedFailedTargets = brief.failedDeliveryTargets.filter(
    (target) =>
      !(
        target.parentId === profile.parent.id &&
        retriedChannels.has(target.channel)
      ),
  );
  const nextFailedDeliveryTargets = [
    ...untouchedFailedTargets,
    ...deliverySummary.failedDeliveryTargets,
  ];
  const nextDeliveryReceipts = [
    ...brief.deliveryReceipts,
    ...deliverySummary.deliveryReceipts,
  ];
  const nextDeliveryAttemptCount =
    brief.deliveryAttemptCount + deliverySummary.deliveryAttemptCount;
  const nextDeliverySuccessCount =
    brief.deliverySuccessCount + deliverySummary.deliverySuccessCount;
  const nextDeliveryFailureCount =
    brief.deliveryFailureCount + deliverySummary.deliveryFailureCount;
  const appendedNote = `${notePrefix.trim()} Attempts: ${deliverySummary.deliveryAttemptCount}. Successes: ${deliverySummary.deliverySuccessCount}. Failures: ${deliverySummary.deliveryFailureCount}.`;

  const updatedBrief = await updateDailyBriefHistoryEntry(brief.id, {
    status:
      deliverySummary.deliverySuccessCount > 0
        ? "published"
        : brief.status,
    pipelineStage:
      deliverySummary.deliverySuccessCount > 0
        ? "published"
        : brief.pipelineStage,
    deliveryAttemptCount: nextDeliveryAttemptCount,
    deliverySuccessCount: nextDeliverySuccessCount,
    deliveryFailureCount: nextDeliveryFailureCount,
    deliveryReceipts: nextDeliveryReceipts,
    failedDeliveryTargets: nextFailedDeliveryTargets,
    failureReason:
      nextFailedDeliveryTargets.length > 0
        ? `${nextFailedDeliveryTargets.length} delivery target(s) still need operator follow-up.`
        : "",
    adminNotes: brief.adminNotes.trim()
      ? `${brief.adminNotes.trim()}\n${appendedNote}`
      : appendedNote,
  });

  return {
    deliverySummary,
    updatedBrief,
  };
}
