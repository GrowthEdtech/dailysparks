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
import { sendTrialConversionNurtureEmail } from "../../../../../../lib/trial-conversion-nurture-email";
import { assessTrialConversionNurture } from "../../../../../../lib/trial-conversion-nurture";

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
  const [profiles, notebookEntries, weeklyRecaps] = await Promise.all([
    listParentProfiles(),
    listDailyBriefNotebookEntries(),
    listDailyBriefNotebookWeeklyRecaps(),
  ]);
  const notebookEntryCountByParentId = new Map<string, number>();
  const weeklyRecapCountByParentId = new Map<string, number>();

  for (const entry of notebookEntries) {
    notebookEntryCountByParentId.set(
      entry.parentId,
      (notebookEntryCountByParentId.get(entry.parentId) ?? 0) + 1,
    );
  }

  for (const recap of weeklyRecaps) {
    weeklyRecapCountByParentId.set(
      recap.parentId,
      (weeklyRecapCountByParentId.get(recap.parentId) ?? 0) + 1,
    );
  }

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
    const stageIndex = assessment.stage.index;
    const notebookEntryCount =
      notebookEntryCountByParentId.get(profile.parent.id) ?? 0;
    const weeklyRecapCount = weeklyRecapCountByParentId.get(profile.parent.id) ?? 0;

    try {
      const result = await sendTrialConversionNurtureEmail({
        profile,
        stageIndex,
        notebookEntryCount,
        weeklyRecapCount,
      });

      if (!result.sent) {
        throw new Error(result.reason || "Trial conversion nurture delivery skipped.");
      }

      await updateParentNotificationEmailState(profile.parent.email, {
        trialConversionNurtureCount: stageIndex,
        trialConversionNurtureLastAttemptAt: now.toISOString(),
        trialConversionNurtureLastSentAt: now.toISOString(),
        trialConversionNurtureLastStage: stageIndex,
        trialConversionNurtureLastStatus: "sent",
        trialConversionNurtureLastMessageId: result.messageId ?? null,
        trialConversionNurtureLastError: null,
      });

      sent.push({
        parentEmail: profile.parent.email,
        stageIndex,
        messageId: result.messageId ?? "",
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      await updateParentNotificationEmailState(profile.parent.email, {
        trialConversionNurtureCount: stageIndex,
        trialConversionNurtureLastAttemptAt: now.toISOString(),
        trialConversionNurtureLastStage: stageIndex,
        trialConversionNurtureLastStatus: "failed",
        trialConversionNurtureLastMessageId: null,
        trialConversionNurtureLastError: errorMessage,
      });

      failed.push({
        parentEmail: profile.parent.email,
        stageIndex,
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
