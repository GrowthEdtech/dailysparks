import { createNotionNotebookEntriesPage } from "./notion";
import { updateParentNotionConnection } from "./mvp-store";
import type { ParentProfile } from "./mvp-types";
import type { DailyBriefKnowledgeBankSection } from "./daily-brief-knowledge-bank";
import type { DailyBriefNotebookWeeklyRecap } from "./daily-brief-notebook-weekly-recap";
import { createNotionNotebookWeeklyRecapPage } from "./notion";

type NotebookSyncBrief = {
  headline: string;
  summary: string;
  scheduledFor: string;
  programme: ParentProfile["student"]["programme"];
  topicTags: string[];
};

export type DailyBriefNotebookNotionSyncResult =
  | {
      status: "skipped";
      message: string;
    }
  | {
      status: "synced";
      message: string;
      pageId: string;
      pageUrl: string | null;
    }
  | {
      status: "failed";
      message: string;
    };

function hasNotionArchive(profile: ParentProfile) {
  return Boolean(profile.parent.notionWorkspaceId && profile.parent.notionDatabaseId);
}

export async function syncNotebookEntriesToNotion(
  profile: ParentProfile,
  brief: NotebookSyncBrief,
  entries: DailyBriefKnowledgeBankSection[],
): Promise<DailyBriefNotebookNotionSyncResult> {
  if (!hasNotionArchive(profile) || entries.length === 0) {
    return {
      status: "skipped",
      message: "Notion archive is not connected for notebook sync.",
    };
  }

  try {
    const result = await createNotionNotebookEntriesPage(profile, brief, entries);

    await updateParentNotionConnection(profile.parent.email, {
      notionLastSyncedAt: new Date().toISOString(),
      notionLastSyncStatus: "success",
      notionLastSyncMessage: `Notebook synced to Notion for ${brief.scheduledFor}.`,
      notionLastSyncPageId: result.pageId,
      notionLastSyncPageUrl: result.pageUrl,
    });

    return {
      status: "synced",
      message: `Notebook synced to Notion for ${brief.scheduledFor}.`,
      pageId: result.pageId,
      pageUrl: result.pageUrl,
    };
  } catch (error) {
    await updateParentNotionConnection(profile.parent.email, {
      notionLastSyncedAt: new Date().toISOString(),
      notionLastSyncStatus: "failed",
      notionLastSyncMessage:
        error instanceof Error && error.message
          ? `Notebook sync failed: ${error.message}`
          : "Notebook sync failed.",
    });

    return {
      status: "failed",
      message:
        error instanceof Error && error.message
          ? `Notebook sync failed: ${error.message}`
          : "Notebook sync failed.",
    };
  }
}

export async function syncNotebookWeeklyRecapToNotion(
  profile: ParentProfile,
  recap: DailyBriefNotebookWeeklyRecap,
): Promise<DailyBriefNotebookNotionSyncResult> {
  if (!hasNotionArchive(profile)) {
    return {
      status: "skipped",
      message: "Notion archive is not connected for weekly recap sync.",
    };
  }

  try {
    const result = await createNotionNotebookWeeklyRecapPage(profile, recap);

    await updateParentNotionConnection(profile.parent.email, {
      notionLastSyncedAt: new Date().toISOString(),
      notionLastSyncStatus: "success",
      notionLastSyncMessage: `Weekly recap synced to Notion for ${recap.weekLabel}.`,
      notionLastSyncPageId: result.pageId,
      notionLastSyncPageUrl: result.pageUrl,
    });

    return {
      status: "synced",
      message: `Weekly recap synced to Notion for ${recap.weekLabel}.`,
      pageId: result.pageId,
      pageUrl: result.pageUrl,
    };
  } catch (error) {
    await updateParentNotionConnection(profile.parent.email, {
      notionLastSyncedAt: new Date().toISOString(),
      notionLastSyncStatus: "failed",
      notionLastSyncMessage:
        error instanceof Error && error.message
          ? `Weekly recap sync failed: ${error.message}`
          : "Weekly recap sync failed.",
    });

    return {
      status: "failed",
      message:
        error instanceof Error && error.message
          ? `Weekly recap sync failed: ${error.message}`
          : "Weekly recap sync failed.",
    };
  }
}
