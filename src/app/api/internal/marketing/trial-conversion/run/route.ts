import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../../lib/daily-brief-run-auth";
import { listDailyBriefNotebookEntries } from "../../../../../../lib/daily-brief-notebook-store";
import { listDailyBriefNotebookWeeklyRecaps } from "../../../../../../lib/daily-brief-notebook-weekly-recap-store";
import {
  listParentProfiles,
  updateParentNotificationEmailState,
} from "../../../../../../lib/mvp-store";
import { assessTrialConversionNurture } from "../../../../../../lib/trial-conversion-nurture";
import { sendTrialConversionNurtureEmail } from "../../../../../../lib/trial-conversion-nurture-email";

function serviceUnavailable(message: string) {
  return Response.json({ message }, { status: 503 });
}

function unauthorized(message: string) {
  return Response.json({ message }, { status: 401 });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Trial conversion nurture delivery failed.";
}

function incrementCountByParentId(
  counts: Map<string, number>,
  record: { parentId: string },
) {
  counts.set(record.parentId, (counts.get(record.parentId) ?? 0) + 1);
}

export async function POST(request: Request) {
  if (!isDailyBriefSchedulerConfigured()) {
    return serviceUnavailable(
      `Daily brief scheduler is not configured yet. Set ${getDailyBriefSchedulerHeaderName()} support first.`,
    );
  }

  if (!hasValidDailyBriefSchedulerSecret(request)) {
    return unauthorized(
      "Please provide the daily brief scheduler secret to run this route.",
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const [profiles, notebookEntries, weeklyRecaps] = await Promise.all([
    listParentProfiles(),
    listDailyBriefNotebookEntries(),
    listDailyBriefNotebookWeeklyRecaps(),
  ]);
  const notebookEntryCountByParentId = new Map<string, number>();
  const weeklyRecapCountByParentId = new Map<string, number>();
  const sent: Array<{
    parentEmail: string;
    stageIndex: number;
    messageId: string;
  }> = [];
  const failed: Array<{
    parentEmail: string;
    stageIndex: number;
    error: string;
  }> = [];
  const skipped: Array<{
    parentEmail: string;
    reason: string;
  }> = [];
  let eligibleProfileCount = 0;
  let dueProfileCount = 0;

  for (const entry of notebookEntries) {
    incrementCountByParentId(notebookEntryCountByParentId, entry);
  }

  for (const recap of weeklyRecaps) {
    incrementCountByParentId(weeklyRecapCountByParentId, recap);
  }

  for (const profile of profiles) {
    const assessment = assessTrialConversionNurture({
      profile,
      now,
    });

    if (assessment.eligible) {
      eligibleProfileCount += 1;
    }

    if (!assessment.due || !assessment.stage) {
      skipped.push({
        parentEmail: profile.parent.email,
        reason: assessment.reason,
      });
      continue;
    }

    dueProfileCount += 1;

    try {
      const result = await sendTrialConversionNurtureEmail({
        profile,
        stageIndex: assessment.stage.index,
        notebookEntryCount: notebookEntryCountByParentId.get(profile.parent.id) ?? 0,
        weeklyRecapCount: weeklyRecapCountByParentId.get(profile.parent.id) ?? 0,
      });

      if (!result.sent) {
        throw new Error(result.reason || "Trial conversion nurture delivery skipped.");
      }

      await updateParentNotificationEmailState(profile.parent.email, {
        trialConversionNurtureCount: assessment.stage.index,
        trialConversionNurtureLastAttemptAt: nowIso,
        trialConversionNurtureLastSentAt: nowIso,
        trialConversionNurtureLastStage: assessment.stage.index,
        trialConversionNurtureLastStatus: "sent",
        trialConversionNurtureLastMessageId: result.messageId ?? null,
        trialConversionNurtureLastError: null,
      });

      sent.push({
        parentEmail: profile.parent.email,
        stageIndex: assessment.stage.index,
        messageId: result.messageId ?? "",
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      await updateParentNotificationEmailState(profile.parent.email, {
        trialConversionNurtureCount: assessment.stage.index,
        trialConversionNurtureLastAttemptAt: nowIso,
        trialConversionNurtureLastStage: assessment.stage.index,
        trialConversionNurtureLastStatus: "failed",
        trialConversionNurtureLastMessageId: null,
        trialConversionNurtureLastError: errorMessage,
      });

      failed.push({
        parentEmail: profile.parent.email,
        stageIndex: assessment.stage.index,
        error: errorMessage,
      });
    }
  }

  return Response.json({
    mode: "trial-conversion-nurture",
    summary: {
      checkedProfileCount: profiles.length,
      eligibleProfileCount,
      dueProfileCount,
      sentCount: sent.length,
      failedCount: failed.length,
      skippedCount: skipped.length,
    },
    sent,
    failed,
    skipped,
  });
}
