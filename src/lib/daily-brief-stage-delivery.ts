import {
  sendBriefToGoodnotes,
  type DailyBriefPdfRenderer,
} from "./goodnotes-delivery";
import {
  updateParentGrowthMilestones,
  updateParentNotionConnection,
  updateStudentGoodnotesDelivery,
} from "./mvp-store";
import {
  canDispatchDeliveryChannel,
  canRetryDeliveryChannel,
} from "./delivery-readiness";
import type {
  DailyBriefDeliveryChannel,
  DailyBriefDeliveryReceipt,
  DailyBriefFailedDeliveryTarget,
  DailyBriefHistoryRecord,
  DailyBriefRenderAudit,
} from "./daily-brief-history-schema";
import { createNotionBriefPage } from "./notion";
import type { GeneratedDailyBriefDraft } from "./daily-brief-orchestrator";
import type { ParentProfile } from "./mvp-types";

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

export type DailyBriefDeliveryAttemptSummary = {
  deliveryAttemptCount: number;
  deliverySuccessCount: number;
  deliveryFailureCount: number;
  renderAudit: DailyBriefRenderAudit | null;
  deliveryReceipts: DailyBriefDeliveryReceipt[];
  failedDeliveryTargets: DailyBriefFailedDeliveryTarget[];
};

function buildGoodnotesDeliveryMessage(
  scheduledFor: string,
  outcome: "success" | "failed",
  errorMessage?: string,
) {
  if (outcome === "success") {
    return `Daily brief delivered successfully for ${scheduledFor}.`;
  }

  return errorMessage
    ? `Daily brief delivery failed for ${scheduledFor}: ${errorMessage}`
    : `Daily brief delivery failed for ${scheduledFor}.`;
}

function buildNotionDeliveryMessage(
  scheduledFor: string,
  outcome: "success" | "failed",
  errorMessage?: string,
) {
  if (outcome === "success") {
    return `Daily brief archived in Notion for ${scheduledFor}.`;
  }

  return errorMessage
    ? `Notion delivery failed for ${scheduledFor}: ${errorMessage}`
    : `Notion delivery failed for ${scheduledFor}.`;
}

function toGeneratedBriefDraft(
  brief: DailyBriefHistoryRecord,
): GeneratedDailyBriefDraft {
  return {
    scheduledFor: brief.scheduledFor,
    editorialCohort: brief.editorialCohort,
    recordKind: brief.recordKind,
    headline: brief.headline,
    normalizedHeadline: brief.normalizedHeadline,
    summary: brief.summary,
    programme: brief.programme,
    status: brief.status,
    topicClusterKey: brief.topicClusterKey,
    topicLatestPublishedAt: brief.topicLatestPublishedAt,
    selectionDecision: brief.selectionDecision,
    selectionOverrideNote: brief.selectionOverrideNote,
    blockedTopics: brief.blockedTopics,
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
    candidateCount: brief.sourceReferences.length,
    retrievalPrompts: brief.retrievalPrompts,
  };
}

function shouldAttemptChannel(
  profile: ParentProfile,
  channel: DailyBriefDeliveryChannel,
  options: {
    retryTargets?: DailyBriefFailedDeliveryTarget[];
    successfulReceipts?: DailyBriefDeliveryReceipt[];
    blockedTargets?: DailyBriefFailedDeliveryTarget[];
  } = {},
) {
  const channelConfigured =
    options.retryTargets
      ? canRetryDeliveryChannel(profile, channel)
      : canDispatchDeliveryChannel(profile, channel);

  if (!channelConfigured) {
    return false;
  }

  if (
    options.successfulReceipts?.some(
      (receipt) =>
        receipt.parentId === profile.parent.id && receipt.channel === channel,
    )
  ) {
    return false;
  }

  if (options.retryTargets) {
    return options.retryTargets.some(
      (target) =>
        target.parentId === profile.parent.id && target.channel === channel,
    );
  }

  if (
    options.blockedTargets?.some(
      (target) =>
        target.parentId === profile.parent.id && target.channel === channel,
    )
  ) {
    return false;
  }

  return true;
}

export async function deliverHistoryBriefToProfiles(
  profiles: ParentProfile[],
  brief: DailyBriefHistoryRecord,
  options: {
    retryTargets?: DailyBriefFailedDeliveryTarget[];
    successfulReceipts?: DailyBriefDeliveryReceipt[];
    blockedTargets?: DailyBriefFailedDeliveryTarget[];
    attachmentMode?: "production" | "canary";
    renderer?: DailyBriefPdfRenderer;
  } = {},
): Promise<DailyBriefDeliveryAttemptSummary> {
  const deliveryBrief = toGeneratedBriefDraft(brief);
  let deliveryAttemptCount = 0;
  let deliverySuccessCount = 0;
  let deliveryFailureCount = 0;
  let renderAudit: DailyBriefRenderAudit | null = null;
  const deliveryReceipts: DailyBriefDeliveryReceipt[] = [];
  const failedDeliveryTargets: DailyBriefFailedDeliveryTarget[] = [];

  for (const profile of profiles) {
    // Only attach an interaction URL when this specific brief successfully syncs to Notion.
    // Reusing an older page URL would misroute families into a stale brief.
    let interactionUrl: string | null = null;

    if (shouldAttemptChannel(profile, "notion", options)) {
      deliveryAttemptCount += 1;

      try {
        const result = await withRetry(() => createNotionBriefPage(profile, deliveryBrief));
        const deliveryTimestamp = new Date().toISOString();
        interactionUrl = result.pageUrl;
        await updateParentNotionConnection(profile.parent.email, {
          notionConnected: true,
          notionLastSyncedAt: new Date().toISOString(),
          notionLastSyncStatus: "success",
          notionLastSyncMessage: buildNotionDeliveryMessage(
            brief.scheduledFor,
            "success",
          ),
          notionLastSyncPageId: result.pageId,
          notionLastSyncPageUrl: result.pageUrl,
        });
        await updateParentGrowthMilestones(profile.parent.email, {
          firstBriefDeliveredAt: deliveryTimestamp,
        });
        deliverySuccessCount += 1;
        deliveryReceipts.push({
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          channel: "notion",
          renderer: null,
          attachmentFileName: null,
          externalId: result.pageId,
          externalUrl: result.pageUrl,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Notion delivery failed.";
        await updateParentNotionConnection(profile.parent.email, {
          notionLastSyncedAt: new Date().toISOString(),
          notionLastSyncStatus: "failed",
          notionLastSyncMessage: buildNotionDeliveryMessage(
            brief.scheduledFor,
            "failed",
            errorMessage,
          ),
        });
        deliveryFailureCount += 1;
        failedDeliveryTargets.push({
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          channel: "notion",
          errorMessage,
        });
      }
    }

    if (shouldAttemptChannel(profile, "goodnotes", options)) {
      deliveryAttemptCount += 1;

      try {
        const result = await withRetry(() => sendBriefToGoodnotes(profile, {
          ...deliveryBrief,
          interactionUrl,
        }, {
          attachmentMode: options.attachmentMode ?? "production",
          renderer: options.renderer ?? "typst",
        }));
        const deliveryTimestamp = new Date().toISOString();
        await updateStudentGoodnotesDelivery(profile.parent.email, {
          goodnotesConnected: true,
          goodnotesLastDeliveryStatus: "success",
          goodnotesLastDeliveryMessage: buildGoodnotesDeliveryMessage(
            brief.scheduledFor,
            "success",
          ),
        });
        await updateParentGrowthMilestones(profile.parent.email, {
          firstBriefDeliveredAt: deliveryTimestamp,
        });
        deliverySuccessCount += 1;
        renderAudit = renderAudit ?? result.renderAudit ?? null;
        deliveryReceipts.push({
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          channel: "goodnotes",
          renderer: options.renderer ?? "typst",
          attachmentFileName: result.attachmentFileName,
          externalId: result.messageId,
          externalUrl: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Goodnotes delivery failed.";
        await updateStudentGoodnotesDelivery(profile.parent.email, {
          goodnotesLastDeliveryStatus: "failed",
          goodnotesLastDeliveryMessage: buildGoodnotesDeliveryMessage(
            brief.scheduledFor,
            "failed",
            errorMessage,
          ),
        });
        deliveryFailureCount += 1;
        failedDeliveryTargets.push({
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          channel: "goodnotes",
          errorMessage,
        });
      }
    }
  }

  return {
    deliveryAttemptCount,
    deliverySuccessCount,
    deliveryFailureCount,
    renderAudit,
    deliveryReceipts,
    failedDeliveryTargets,
  };
}
