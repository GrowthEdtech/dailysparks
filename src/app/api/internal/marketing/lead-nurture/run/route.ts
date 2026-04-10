import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../../lib/daily-brief-run-auth";
import { assessMarketingLeadNurture } from "../../../../../../lib/marketing-lead-nurture";
import { sendMarketingLeadNurtureEmail } from "../../../../../../lib/marketing-lead-nurture-email";
import {
  listMarketingLeads,
  recordMarketingLeadNurture,
} from "../../../../../../lib/marketing-lead-store";
import { listParentProfiles } from "../../../../../../lib/mvp-store";

function serviceUnavailable(message: string) {
  return Response.json({ message }, { status: 503 });
}

function unauthorized(message: string) {
  return Response.json({ message }, { status: 401 });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Lead nurture delivery failed.";
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
  const leads = await listMarketingLeads();
  const profiles = await listParentProfiles();
  const profileEmails = new Set(
    profiles.map((profile) => profile.parent.email.trim().toLowerCase()),
  );
  const sent: Array<{
    leadEmail: string;
    stageIndex: number;
    messageId: string;
  }> = [];
  const failed: Array<{
    leadEmail: string;
    stageIndex: number;
    error: string;
  }> = [];
  const skipped: Array<{
    leadEmail: string;
    reason: string;
  }> = [];
  let eligibleLeadCount = 0;
  let dueLeadCount = 0;

  for (const lead of leads) {
    const assessment = assessMarketingLeadNurture({
      lead,
      now,
      hasParentProfile: profileEmails.has(lead.email.trim().toLowerCase()),
    });

    if (assessment.eligible) {
      eligibleLeadCount += 1;
    }

    if (!assessment.due || !assessment.stage) {
      skipped.push({
        leadEmail: lead.email,
        reason: assessment.reason,
      });
      continue;
    }

    dueLeadCount += 1;

    try {
      const result = await sendMarketingLeadNurtureEmail({
        lead,
        stageIndex: assessment.stage.index,
      });

      if (!result.sent) {
        throw new Error(result.reason || "Lead nurture delivery skipped.");
      }

      await recordMarketingLeadNurture({
        leadId: lead.id,
        stageIndex: assessment.stage.index,
        status: "sent",
        messageId: result.messageId,
      });

      sent.push({
        leadEmail: lead.email,
        stageIndex: assessment.stage.index,
        messageId: result.messageId ?? "",
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      await recordMarketingLeadNurture({
        leadId: lead.id,
        stageIndex: assessment.stage.index,
        status: "failed",
        errorMessage,
      });

      failed.push({
        leadEmail: lead.email,
        stageIndex: assessment.stage.index,
        error: errorMessage,
      });
    }
  }

  return Response.json({
    mode: "marketing-lead-nurture",
    summary: {
      checkedLeadCount: leads.length,
      eligibleLeadCount,
      dueLeadCount,
      sentCount: sent.length,
      failedCount: failed.length,
      skippedCount: skipped.length,
    },
    sent,
    failed,
    skipped,
  });
}
