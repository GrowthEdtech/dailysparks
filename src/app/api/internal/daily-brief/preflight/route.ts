import {
  listDailyBriefHistory,
  updateDailyBriefHistoryEntry,
} from "../../../../../lib/daily-brief-history-store";
import {
  DAILY_BRIEF_RECORD_KINDS,
  type DailyBriefHistoryRecord,
  type DailyBriefRecordKind,
} from "../../../../../lib/daily-brief-history-schema";
import { emitDailyBriefOpsAlert } from "../../../../../lib/daily-brief-ops-alerts";
import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { getDailyBriefBusinessDate } from "../../../../../lib/daily-brief-run-date";

type DailyBriefPreflightRequestBody = {
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

function isValidRunDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function isPreflightCandidate(entry: DailyBriefHistoryRecord) {
  return (
    entry.status === "draft" &&
    (entry.pipelineStage === "generated" || entry.pipelineStage === "pdf_built")
  );
}

function isAlreadyApproved(entry: DailyBriefHistoryRecord) {
  return (
    (entry.status === "approved" && entry.pipelineStage === "preflight_passed") ||
    entry.status === "published"
  );
}

function hasStructuredBriefContent(entry: DailyBriefHistoryRecord) {
  return Boolean(
    entry.headline.trim() &&
      entry.summary.trim() &&
      entry.briefMarkdown.trim() &&
      entry.topicTags.length > 0,
  );
}

function hasDeliveryReadyArtifacts(entry: DailyBriefHistoryRecord) {
  return Boolean(
    entry.sourceReferences.length > 0 &&
      entry.deliveryWindowAt,
  );
}

function normalizeRecordKind(value: unknown): DailyBriefRecordKind | undefined {
  return typeof value === "string" &&
    DAILY_BRIEF_RECORD_KINDS.includes(value as DailyBriefRecordKind)
    ? (value as DailyBriefRecordKind)
    : undefined;
}

async function parseRequestBody(
  request: Request,
): Promise<DailyBriefPreflightRequestBody | Response> {
  const contentLength = request.headers.get("content-length");

  if (contentLength === "0") {
    return {};
  }

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {};
  }

  try {
    const payload = JSON.parse(bodyText) as DailyBriefPreflightRequestBody;

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
  const history = await listDailyBriefHistory({
    scheduledFor: runDate,
    recordKind,
  });
  const preflightCandidates = history.filter(isPreflightCandidate);
  const alreadyApprovedEntries = history.filter(isAlreadyApproved);
  const blockers: string[] = [];

  if (
    preflightCandidates.length === 0 &&
    alreadyApprovedEntries.length === 0
  ) {
    blockers.push("No generated briefs exist for this run date.");
  }

  if (preflightCandidates.length === 0 && alreadyApprovedEntries.length > 0) {
    return Response.json({
      mode: "preflight",
      ready: true,
      runDate,
      recordKind,
      blockers: [],
      summary: {
        historyEntryCount: history.length,
        candidateCount: 0,
        structuredContentCount: 0,
        deliveryReadyArtifactCount: 0,
        readyBriefCount: alreadyApprovedEntries.length,
        blockerCount: 0,
        approvedCount: 0,
        alreadyApprovedCount: alreadyApprovedEntries.length,
      },
    });
  }

  const structuredContentCandidates = preflightCandidates.filter(
    hasStructuredBriefContent,
  );
  const deliveryReadyCandidates = preflightCandidates.filter(
    hasDeliveryReadyArtifacts,
  );
  const missingStructuredContentCandidates = preflightCandidates.filter(
    (entry) => !hasStructuredBriefContent(entry),
  );
  const missingDeliveryArtifactCandidates = preflightCandidates.filter(
    (entry) => !hasDeliveryReadyArtifacts(entry),
  );
  const readyCandidates = preflightCandidates.filter(
    (entry) => hasStructuredBriefContent(entry) && hasDeliveryReadyArtifacts(entry),
  );

  if (missingStructuredContentCandidates.length > 0) {
    blockers.push(
      `${missingStructuredContentCandidates.length} brief(s) are missing required structured content.`,
    );
  }

  if (missingDeliveryArtifactCandidates.length > 0) {
    blockers.push(
      `${missingDeliveryArtifactCandidates.length} brief(s) are missing delivery-ready artifacts.`,
    );
  }

  if (blockers.length > 0) {
    const opsAlert = await emitDailyBriefOpsAlert({
      stage: "preflight",
      severity: "critical",
      runDate,
      title: "Daily brief preflight blocked",
      message: `${blockers.length} blocker(s) prevented the preflight stage from approving today’s briefs.`,
      details: {
        blockers,
        historyEntryCount: history.length,
        candidateCount: preflightCandidates.length,
        structuredContentCount: structuredContentCandidates.length,
        deliveryReadyArtifactCount: deliveryReadyCandidates.length,
        readyBriefCount: readyCandidates.length,
      },
    });

    return Response.json({
      mode: "preflight",
      ready: false,
      runDate,
      recordKind,
      blockers,
      opsAlert,
      summary: {
        historyEntryCount: history.length,
        candidateCount: preflightCandidates.length,
        structuredContentCount: structuredContentCandidates.length,
        deliveryReadyArtifactCount: deliveryReadyCandidates.length,
        readyBriefCount: readyCandidates.length,
        blockerCount: blockers.length,
        approvedCount: 0,
        alreadyApprovedCount: alreadyApprovedEntries.length,
      },
    });
  }

  const approvedEntries = [];

  for (const entry of readyCandidates) {
    const approvedEntry = await updateDailyBriefHistoryEntry(entry.id, {
      status: "approved",
      pipelineStage: "preflight_passed",
    });

    approvedEntries.push(approvedEntry);
  }

  return Response.json({
    mode: "preflight",
    ready: true,
    runDate,
    recordKind,
    blockers: [],
    summary: {
      historyEntryCount: history.length,
      candidateCount: preflightCandidates.length,
      structuredContentCount: structuredContentCandidates.length,
      deliveryReadyArtifactCount: deliveryReadyCandidates.length,
      readyBriefCount: readyCandidates.length,
      blockerCount: 0,
      approvedCount: approvedEntries.filter(Boolean).length,
      alreadyApprovedCount: alreadyApprovedEntries.length,
    },
  });
}
