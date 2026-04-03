import { sendBriefToGoodnotes } from "./goodnotes-delivery";
import type {
  DailyBriefDeliveryChannel,
  DailyBriefDeliveryReceipt,
  DailyBriefFailedDeliveryTarget,
  DailyBriefHistoryRecord,
} from "./daily-brief-history-schema";
import { createNotionBriefPage } from "./notion";
import type { GeneratedDailyBriefDraft } from "./daily-brief-orchestrator";
import type { ParentProfile } from "./mvp-types";

export type DailyBriefDeliveryAttemptSummary = {
  deliveryAttemptCount: number;
  deliverySuccessCount: number;
  deliveryFailureCount: number;
  deliveryReceipts: DailyBriefDeliveryReceipt[];
  failedDeliveryTargets: DailyBriefFailedDeliveryTarget[];
};

function toGeneratedBriefDraft(
  brief: DailyBriefHistoryRecord,
): GeneratedDailyBriefDraft {
  return {
    scheduledFor: brief.scheduledFor,
    headline: brief.headline,
    summary: brief.summary,
    programme: brief.programme,
    status: brief.status,
    topicTags: brief.topicTags,
    sourceReferences: brief.sourceReferences,
    aiConnectionId: brief.aiConnectionId,
    aiConnectionName: brief.aiConnectionName,
    aiModel: brief.aiModel,
    promptPolicyId: brief.promptPolicyId,
    promptVersionLabel: brief.promptVersionLabel,
    promptVersion: brief.promptVersion,
    repetitionRisk: brief.repetitionRisk,
    repetitionNotes: brief.repetitionNotes,
    adminNotes: brief.adminNotes,
    briefMarkdown: brief.briefMarkdown,
    resolvedPrompt: "",
    sourceClusterKey: "",
    candidateCount: brief.sourceReferences.length,
  };
}

function shouldAttemptChannel(
  profile: ParentProfile,
  channel: DailyBriefDeliveryChannel,
  targets?: DailyBriefFailedDeliveryTarget[],
) {
  const channelConfigured =
    channel === "goodnotes"
      ? profile.student.goodnotesConnected
      : profile.student.notionConnected;

  if (!channelConfigured) {
    return false;
  }

  if (!targets) {
    return true;
  }

  return targets.some(
    (target) =>
      target.parentId === profile.parent.id && target.channel === channel,
  );
}

export async function deliverHistoryBriefToProfiles(
  profiles: ParentProfile[],
  brief: DailyBriefHistoryRecord,
  options: {
    retryTargets?: DailyBriefFailedDeliveryTarget[];
    attachmentMode?: "production" | "canary";
  } = {},
): Promise<DailyBriefDeliveryAttemptSummary> {
  const deliveryBrief = toGeneratedBriefDraft(brief);
  let deliveryAttemptCount = 0;
  let deliverySuccessCount = 0;
  let deliveryFailureCount = 0;
  const deliveryReceipts: DailyBriefDeliveryReceipt[] = [];
  const failedDeliveryTargets: DailyBriefFailedDeliveryTarget[] = [];

  for (const profile of profiles) {
    if (shouldAttemptChannel(profile, "goodnotes", options.retryTargets)) {
      deliveryAttemptCount += 1;

      try {
        const result = await sendBriefToGoodnotes(profile, deliveryBrief, {
          attachmentMode: options.attachmentMode ?? "production",
        });
        deliverySuccessCount += 1;
        deliveryReceipts.push({
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          channel: "goodnotes",
          attachmentFileName: result.attachmentFileName,
          externalId: result.messageId,
          externalUrl: null,
        });
      } catch (error) {
        deliveryFailureCount += 1;
        failedDeliveryTargets.push({
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          channel: "goodnotes",
          errorMessage:
            error instanceof Error ? error.message : "Goodnotes delivery failed.",
        });
      }
    }

    if (shouldAttemptChannel(profile, "notion", options.retryTargets)) {
      deliveryAttemptCount += 1;

      try {
        const result = await createNotionBriefPage(profile, deliveryBrief);
        deliverySuccessCount += 1;
        deliveryReceipts.push({
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          channel: "notion",
          attachmentFileName: null,
          externalId: result.pageId,
          externalUrl: result.pageUrl,
        });
      } catch (error) {
        deliveryFailureCount += 1;
        failedDeliveryTargets.push({
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          channel: "notion",
          errorMessage:
            error instanceof Error ? error.message : "Notion delivery failed.",
        });
      }
    }
  }

  return {
    deliveryAttemptCount,
    deliverySuccessCount,
    deliveryFailureCount,
    deliveryReceipts,
    failedDeliveryTargets,
  };
}
