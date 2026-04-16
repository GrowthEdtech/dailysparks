"use server";

import { revalidatePath } from "next/cache";

import { updateDailyBriefHistoryEntry } from "../../../../lib/daily-brief-history-store";
import { requireAdminServerSession } from "../../../../lib/daily-brief-run-auth";

export async function approveDraft(id: string, briefMarkdown: string) {
  await requireAdminServerSession();

  await updateDailyBriefHistoryEntry(id, {
    status: "approved",
    briefMarkdown: briefMarkdown.trim(),
    pipelineStage: "preflight_passed",
  });

  revalidatePath("/admin/editorial/curation");
  revalidatePath("/admin/editorial/daily-briefs");
}

export async function rejectDraft(id: string, reason: string) {
  await requireAdminServerSession();

  await updateDailyBriefHistoryEntry(id, {
    status: "failed",
    pipelineStage: "failed",
    failureReason: reason.trim(),
    adminNotes: `Draft rejected by human curator: ${reason.trim()}`,
  });

  revalidatePath("/admin/editorial/curation");
  revalidatePath("/admin/editorial/daily-briefs");
}
