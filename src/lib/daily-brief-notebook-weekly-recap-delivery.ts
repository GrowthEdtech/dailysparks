import { listDailyBriefNotebookEntries } from "./daily-brief-notebook-store";
import {
  buildDailyBriefNotebookWeeklyRecap,
} from "./daily-brief-notebook-weekly-recap";
import {
  getDailyBriefNotebookWeeklyRecap,
  saveDailyBriefNotebookWeeklyRecap,
  updateDailyBriefNotebookWeeklyRecapEmailDelivery,
  updateDailyBriefNotebookWeeklyRecapNotionSync,
  type DailyBriefNotebookWeeklyRecapRecord,
} from "./daily-brief-notebook-weekly-recap-store";
import {
  sendDailyBriefNotebookWeeklyRecapEmail,
  isDailyBriefNotebookWeeklyRecapEmailConfigured,
} from "./daily-brief-notebook-weekly-recap-email";
import {
  syncNotebookWeeklyRecapToNotion,
  type DailyBriefNotebookNotionSyncResult,
} from "./daily-brief-notebook-notion-sync";
import { listParentProfiles } from "./mvp-store";
import type { ParentProfile } from "./mvp-types";
import { isProgrammeEditoriallyActive } from "./programme-availability-policy";

type WeeklyRecapDeliverySource = "manual" | "scheduled";

export type DeliverNotebookWeeklyRecapResult =
  | {
      status: "skipped";
      reason: "no-entries";
      record: null;
      notionSync: DailyBriefNotebookNotionSyncResult | null;
      emailDelivery: {
        status: "skipped";
        reason: string;
        messageId?: undefined;
      };
    }
  | {
      status: "generated";
      reason: null;
      record: DailyBriefNotebookWeeklyRecapRecord;
      wasUpdate: boolean;
      notionSync: DailyBriefNotebookNotionSyncResult | null;
      emailDelivery: {
        status: "sent" | "skipped" | "failed";
        reason: string | null;
        messageId?: string;
      };
    };

export type ScheduledNotebookWeeklyRecapDeliverySummary = {
  asOf: string;
  checkedCount: number;
  generatedCount: number;
  skippedNoEntriesCount: number;
  notionSyncedCount: number;
  emailSentCount: number;
  emailSkippedCount: number;
  failedCount: number;
  results: Array<{
    parentId: string;
    parentEmail: string;
    programme: ParentProfile["student"]["programme"];
    status: "generated" | "skipped" | "failed";
    weekKey: string | null;
    note: string;
  }>;
};

function buildSkippedEmailDelivery(reason: string) {
  return {
    status: "skipped" as const,
    reason,
  };
}

async function refreshRecapAfterNotionSync(input: {
  parentId: string;
  programme: ParentProfile["student"]["programme"];
  weekKey: string;
  fallback: DailyBriefNotebookWeeklyRecapRecord;
}) {
  return (
    (await getDailyBriefNotebookWeeklyRecap({
      parentId: input.parentId,
      programme: input.programme,
      weekKey: input.weekKey,
    })) ?? input.fallback
  );
}

export async function deliverNotebookWeeklyRecapForProfile(input: {
  profile: ParentProfile;
  asOf?: string | Date;
  source: WeeklyRecapDeliverySource;
  syncNotion: boolean;
  sendEmail: boolean;
}): Promise<DeliverNotebookWeeklyRecapResult> {
  const entries = await listDailyBriefNotebookEntries({
    parentId: input.profile.parent.id,
    programme: input.profile.student.programme,
    limit: 500,
  });
  const recap = buildDailyBriefNotebookWeeklyRecap({
    entries,
    programme: input.profile.student.programme,
    asOf: input.asOf,
  });

  if (!recap) {
    return {
      status: "skipped",
      reason: "no-entries",
      record: null,
      notionSync: null,
      emailDelivery: buildSkippedEmailDelivery(
        "No notebook entries were saved for this week.",
      ),
    };
  }

  const persisted = await saveDailyBriefNotebookWeeklyRecap({
    parentId: input.profile.parent.id,
    parentEmail: input.profile.parent.email,
    studentId: input.profile.student.id,
    programme: input.profile.student.programme,
    recap,
    generationSource: input.source,
  });
  let record = persisted.record;
  const wasUpdate = persisted.wasUpdate;
  let notionSync: DailyBriefNotebookNotionSyncResult | null = null;

  if (input.syncNotion) {
    notionSync = await syncNotebookWeeklyRecapToNotion(input.profile, record);

    if (notionSync.status === "synced") {
      await updateDailyBriefNotebookWeeklyRecapNotionSync({
        parentId: input.profile.parent.id,
        programme: input.profile.student.programme,
        weekKey: record.weekKey,
        notionLastSyncedAt: new Date().toISOString(),
        notionLastSyncPageId: notionSync.pageId,
        notionLastSyncPageUrl: notionSync.pageUrl,
      });
      record = await refreshRecapAfterNotionSync({
        parentId: input.profile.parent.id,
        programme: input.profile.student.programme,
        weekKey: record.weekKey,
        fallback: record,
      });
    }
  }

  let emailDelivery: DeliverNotebookWeeklyRecapResult["emailDelivery"] =
    buildSkippedEmailDelivery("Weekly recap email was not requested.");

  if (input.sendEmail) {
    if (record.emailLastStatus === "sent" && record.emailLastSentAt) {
      emailDelivery = buildSkippedEmailDelivery(
        "Weekly recap email was already sent for this week.",
      );
    } else if (!isDailyBriefNotebookWeeklyRecapEmailConfigured()) {
      await updateDailyBriefNotebookWeeklyRecapEmailDelivery({
        parentId: input.profile.parent.id,
        programme: input.profile.student.programme,
        weekKey: record.weekKey,
        emailLastSentAt: null,
        emailLastStatus: "skipped",
        emailLastErrorMessage: "Weekly recap email is not configured.",
      });
      record = (
        await getDailyBriefNotebookWeeklyRecap({
          parentId: input.profile.parent.id,
          programme: input.profile.student.programme,
          weekKey: record.weekKey,
        })
      ) ?? record;
      emailDelivery = buildSkippedEmailDelivery(
        "Weekly recap email is not configured.",
      );
    } else {
      try {
        const result = await sendDailyBriefNotebookWeeklyRecapEmail({
          profile: input.profile,
          recap: record,
        });
        await updateDailyBriefNotebookWeeklyRecapEmailDelivery({
          parentId: input.profile.parent.id,
          programme: input.profile.student.programme,
          weekKey: record.weekKey,
          emailLastSentAt: new Date().toISOString(),
          emailLastStatus: "sent",
          emailLastMessageId: result.messageId,
          emailLastErrorMessage: null,
        });
        record = (
          await getDailyBriefNotebookWeeklyRecap({
            parentId: input.profile.parent.id,
            programme: input.profile.student.programme,
            weekKey: record.weekKey,
          })
        ) ?? record;
        emailDelivery = {
          status: "sent",
          reason: null,
          messageId: result.messageId,
        };
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Weekly recap email failed.";
        await updateDailyBriefNotebookWeeklyRecapEmailDelivery({
          parentId: input.profile.parent.id,
          programme: input.profile.student.programme,
          weekKey: record.weekKey,
          emailLastSentAt: null,
          emailLastStatus: "failed",
          emailLastErrorMessage: message,
        });
        record = (
          await getDailyBriefNotebookWeeklyRecap({
            parentId: input.profile.parent.id,
            programme: input.profile.student.programme,
            weekKey: record.weekKey,
          })
        ) ?? record;
        emailDelivery = {
          status: "failed",
          reason: message,
        };
      }
    }
  }

  return {
    status: "generated",
    reason: null,
    record,
    wasUpdate,
    notionSync,
    emailDelivery,
  };
}

export async function runScheduledNotebookWeeklyRecapDelivery(input: {
  asOf?: string | Date;
  profiles?: ParentProfile[];
} = {}): Promise<ScheduledNotebookWeeklyRecapDeliverySummary> {
  const profiles = input.profiles ?? (await listParentProfiles());
  const activeProfiles = profiles.filter((profile) =>
    isProgrammeEditoriallyActive(profile.student.programme),
  );
  const asOf = new Date(input.asOf ?? new Date()).toISOString();
  const results: ScheduledNotebookWeeklyRecapDeliverySummary["results"] = [];
  let generatedCount = 0;
  let skippedNoEntriesCount = 0;
  let notionSyncedCount = 0;
  let emailSentCount = 0;
  let emailSkippedCount = 0;
  let failedCount = 0;

  for (const profile of activeProfiles) {
    try {
      const result = await deliverNotebookWeeklyRecapForProfile({
        profile,
        asOf,
        source: "scheduled",
        syncNotion: true,
        sendEmail: true,
      });

      if (result.status === "skipped") {
        skippedNoEntriesCount += 1;
        results.push({
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          programme: profile.student.programme,
          status: "skipped",
          weekKey: null,
          note: result.emailDelivery.reason,
        });
        continue;
      }

      generatedCount += 1;

      if (result.notionSync?.status === "synced") {
        notionSyncedCount += 1;
      }

      if (result.emailDelivery.status === "sent") {
        emailSentCount += 1;
      } else {
        emailSkippedCount += 1;
      }

      results.push({
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        programme: profile.student.programme,
        status: "generated",
        weekKey: result.record.weekKey,
        note:
          result.emailDelivery.status === "sent"
            ? "Weekly recap generated and emailed."
            : result.emailDelivery.reason ?? "Weekly recap generated.",
      });
    } catch (error) {
      failedCount += 1;
      results.push({
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        programme: profile.student.programme,
        status: "failed",
        weekKey: null,
        note:
          error instanceof Error && error.message
            ? error.message
            : "Weekly recap delivery failed.",
      });
    }
  }

  return {
    asOf,
    checkedCount: activeProfiles.length,
    generatedCount,
    skippedNoEntriesCount,
    notionSyncedCount,
    emailSentCount,
    emailSkippedCount,
    failedCount,
    results,
  };
}
