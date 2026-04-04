import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { listParentProfiles, updateParentOnboardingReminder } from "../../../../../lib/mvp-store";
import { assessOnboardingActivationReminder } from "../../../../../lib/onboarding-activation-reminder";
import { createOnboardingReminderRunEntry } from "../../../../../lib/onboarding-reminder-history-store";
import { sendOnboardingReminderEmail } from "../../../../../lib/onboarding-reminder-email";

function serviceUnavailable(message: string) {
  return Response.json({ message }, { status: 503 });
}

function unauthorized(message: string) {
  return Response.json({ message }, { status: 401 });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Reminder delivery failed.";
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
  const profiles = await listParentProfiles();
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
  let historyEntryCount = 0;

  for (const profile of profiles) {
    const assessment = assessOnboardingActivationReminder({
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
      const result = await sendOnboardingReminderEmail({
        profile,
        stageIndex: assessment.stage.index,
      });

      await updateParentOnboardingReminder(profile.parent.email, {
        onboardingReminderCount: assessment.stage.index,
        onboardingReminderLastAttemptAt: nowIso,
        onboardingReminderLastSentAt: nowIso,
        onboardingReminderLastStage: assessment.stage.index,
        onboardingReminderLastStatus: "sent",
        onboardingReminderLastMessageId: result.messageId,
        onboardingReminderLastError: null,
      });
      await createOnboardingReminderRunEntry({
        runAt: nowIso,
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        stageIndex: assessment.stage.index,
        stageLabel: assessment.stage.label,
        status: "sent",
        messageId: result.messageId,
        errorMessage: null,
      });
      historyEntryCount += 1;

      sent.push({
        parentEmail: profile.parent.email,
        stageIndex: assessment.stage.index,
        messageId: result.messageId,
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      await updateParentOnboardingReminder(profile.parent.email, {
        onboardingReminderLastAttemptAt: nowIso,
        onboardingReminderLastStage: assessment.stage.index,
        onboardingReminderLastStatus: "failed",
        onboardingReminderLastError: errorMessage,
      });
      await createOnboardingReminderRunEntry({
        runAt: nowIso,
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        stageIndex: assessment.stage.index,
        stageLabel: assessment.stage.label,
        status: "failed",
        messageId: null,
        errorMessage,
      });
      historyEntryCount += 1;

      failed.push({
        parentEmail: profile.parent.email,
        stageIndex: assessment.stage.index,
        error: errorMessage,
      });
    }
  }

  return Response.json({
    mode: "onboarding-reminder",
    summary: {
      checkedProfileCount: profiles.length,
      eligibleProfileCount,
      dueProfileCount,
      historyEntryCount,
      sentCount: sent.length,
      failedCount: failed.length,
      skippedCount: skipped.length,
    },
    sent,
    failed,
    skipped,
  });
}
