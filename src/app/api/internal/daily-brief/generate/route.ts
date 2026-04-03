import {
  getDailyBriefCandidateSnapshot,
  upsertDailyBriefCandidateSnapshot,
} from "../../../../../lib/daily-brief-candidate-store";
import {
  createDailyBriefHistoryEntry,
  listDailyBriefHistory,
} from "../../../../../lib/daily-brief-history-store";
import {
  DAILY_BRIEF_RECORD_KINDS,
  type DailyBriefRecordKind,
} from "../../../../../lib/daily-brief-history-schema";
import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { getDailyBriefBusinessDate } from "../../../../../lib/daily-brief-run-date";
import { generateDailyBriefDrafts } from "../../../../../lib/daily-brief-orchestrator";

type DailyBriefGenerateRequestBody = {
  runDate?: string;
  recordKind?: string;
};

function serviceUnavailable(message: string) {
  return Response.json({ message }, { status: 503 });
}

function unauthorized(message: string) {
  return Response.json({ message }, { status: 401 });
}

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

function internalError(message: string) {
  return Response.json({ message }, { status: 500 });
}

function notFound(message: string) {
  return Response.json({ message }, { status: 404 });
}

function isValidRunDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function buildDeliveryWindowTimestamp(runDate: string) {
  const parsed = Date.parse(`${runDate}T09:00:00+08:00`);

  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function normalizeRecordKind(value: unknown): DailyBriefRecordKind | undefined {
  return typeof value === "string" &&
    DAILY_BRIEF_RECORD_KINDS.includes(value as DailyBriefRecordKind)
    ? (value as DailyBriefRecordKind)
    : undefined;
}

async function parseRequestBody(
  request: Request,
): Promise<DailyBriefGenerateRequestBody | Response> {
  const contentLength = request.headers.get("content-length");

  if (contentLength === "0") {
    return {};
  }

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {};
  }

  try {
    const payload = JSON.parse(bodyText) as DailyBriefGenerateRequestBody;

    if (
      payload.runDate !== undefined &&
      (typeof payload.runDate !== "string" || !isValidRunDate(payload.runDate))
    ) {
      return badRequest("runDate must use YYYY-MM-DD format.");
    }

    if (
      payload.recordKind !== undefined &&
      normalizeRecordKind(payload.recordKind) === undefined
    ) {
      return badRequest("recordKind must be production or test when provided.");
    }

    return payload;
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
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

  const parsedBody = await parseRequestBody(request);

  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  const runDate = parsedBody.runDate ?? getDailyBriefBusinessDate();
  const recordKind = normalizeRecordKind(parsedBody.recordKind) ?? "production";
  const candidateSnapshot = await getDailyBriefCandidateSnapshot(runDate);

  if (!candidateSnapshot) {
    return notFound(
      "No candidate snapshot exists for this run date. Run ingest first.",
    );
  }

  const freezeTimestamp =
    candidateSnapshot.selectionFrozenAt ?? new Date().toISOString();
  const frozenSnapshot = await upsertDailyBriefCandidateSnapshot({
    scheduledFor: candidateSnapshot.scheduledFor,
    candidates: candidateSnapshot.candidates,
    selectionStatus: "frozen",
    selectionFrozenAt: freezeTimestamp,
  });
  const historyEntries = await listDailyBriefHistory({
    scheduledFor: runDate,
    recordKind,
  });

  try {
    const generation = await generateDailyBriefDrafts({
      scheduledFor: runDate,
      candidates: frozenSnapshot.candidates,
      historyEntries,
      recordKind,
      fetchImpl: fetch,
    });
    const generationCompletedAt = new Date().toISOString();
    const deliveryWindowAt = buildDeliveryWindowTimestamp(runDate);
    const createdHistoryEntries = [];

    for (const brief of generation.generatedBriefs) {
      const createdEntry = await createDailyBriefHistoryEntry({
        scheduledFor: brief.scheduledFor,
        recordKind,
        headline: brief.headline,
        summary: brief.summary,
        programme: brief.programme,
        status: "draft",
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
        pipelineStage: "generated",
        candidateSnapshotAt: frozenSnapshot.updatedAt,
        generationCompletedAt,
        pdfBuiltAt: null,
        deliveryWindowAt,
        lastDeliveryAttemptAt: null,
        deliveryAttemptCount: 0,
        deliverySuccessCount: 0,
        deliveryFailureCount: 0,
        failureReason: "",
        retryEligibleUntil: null,
      });

      createdHistoryEntries.push(createdEntry);
    }

    return Response.json({
      mode: "generate",
      runDate,
      recordKind,
      selectedTopic: generation.selectedTopic
        ? {
            clusterKey: generation.selectedTopic.clusterKey,
            headline: generation.selectedTopic.headline,
            sourceReferenceCount: generation.selectedTopic.sourceReferences.length,
            candidateCount: generation.selectedTopic.topicCandidates.length,
          }
        : null,
      summary: {
        generatedCount: generation.generatedBriefs.length,
        skippedProgrammes: generation.skippedProgrammes,
        historyCreatedCount: createdHistoryEntries.length,
        candidateSnapshotId: frozenSnapshot.id,
      },
    });
  } catch (error) {
    console.error("Daily brief generation failed", error);

    return internalError(
      "Daily brief generation failed before completion. Check server logs for details.",
    );
  }
}
