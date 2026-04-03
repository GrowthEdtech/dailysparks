import {
  listDailyBriefHistory,
  updateDailyBriefHistoryEntry,
} from "../../../../../lib/daily-brief-history-store";
import type { DailyBriefHistoryRecord } from "../../../../../lib/daily-brief-history-schema";
import { emitDailyBriefOpsAlert } from "../../../../../lib/daily-brief-ops-alerts";
import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";

type DailyBriefPreflightRequestBody = {
  runDate?: string;
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

function buildRunDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
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

function hasDeliveryReadyArtifacts(entry: DailyBriefHistoryRecord) {
  return Boolean(
    entry.briefMarkdown.trim() &&
      entry.sourceReferences.length > 0 &&
      entry.deliveryWindowAt,
  );
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

  const runDate = parsedBody.runDate ?? buildRunDate();
  const history = await listDailyBriefHistory({
    scheduledFor: runDate,
  });
  const preflightCandidates = history.filter(isPreflightCandidate);
  const blockers: string[] = [];

  if (preflightCandidates.length === 0) {
    blockers.push("No generated briefs exist for this run date.");
  }

  const readyCandidates = preflightCandidates.filter(hasDeliveryReadyArtifacts);
  const notReadyCandidates = preflightCandidates.filter(
    (entry) => !hasDeliveryReadyArtifacts(entry),
  );

  if (notReadyCandidates.length > 0) {
    blockers.push(
      `${notReadyCandidates.length} brief(s) are missing delivery-ready artifacts.`,
    );
  }

  if (blockers.length > 0) {
    const opsAlert = await emitDailyBriefOpsAlert({
      stage: "preflight",
      severity: "critical",
      runDate,
      title: "Daily brief preflight blocked",
      message: `${blockers.length} blocker(s) prevented the 08:50 preflight from approving today’s briefs.`,
      details: {
        blockers,
        historyEntryCount: history.length,
        candidateCount: preflightCandidates.length,
        readyBriefCount: readyCandidates.length,
      },
    });

    return Response.json({
      mode: "preflight",
      ready: false,
      runDate,
      blockers,
      opsAlert,
      summary: {
        historyEntryCount: history.length,
        candidateCount: preflightCandidates.length,
        readyBriefCount: readyCandidates.length,
        blockerCount: blockers.length,
        approvedCount: 0,
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
    blockers: [],
    summary: {
      historyEntryCount: history.length,
      candidateCount: preflightCandidates.length,
      readyBriefCount: readyCandidates.length,
      blockerCount: 0,
      approvedCount: approvedEntries.filter(Boolean).length,
    },
  });
}
