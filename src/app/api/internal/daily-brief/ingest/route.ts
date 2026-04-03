import {
  getDailyBriefCandidateSnapshot,
  upsertDailyBriefCandidateSnapshot,
} from "../../../../../lib/daily-brief-candidate-store";
import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { getDailyBriefBusinessDate } from "../../../../../lib/daily-brief-run-date";
import { resolveEditorialFeedTargets } from "../../../../../lib/editorial-feed-registry";
import { listEditorialSources } from "../../../../../lib/editorial-source-store";
import { ingestEditorialSourceCandidates } from "../../../../../lib/source-ingestion";

type DailyBriefIngestRequestBody = {
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

function isValidRunDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

async function parseRequestBody(
  request: Request,
): Promise<DailyBriefIngestRequestBody | Response> {
  const contentLength = request.headers.get("content-length");

  if (contentLength === "0") {
    return {};
  }

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {};
  }

  try {
    const payload = JSON.parse(bodyText) as DailyBriefIngestRequestBody;

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

  const runDate = parsedBody.runDate ?? getDailyBriefBusinessDate();
  const sources = await listEditorialSources();
  const activeSources = sources.filter((source) => source.active);
  const supportedSourceIds = new Set(
    resolveEditorialFeedTargets(activeSources).map((target) => target.sourceId),
  );
  const supportedSources = activeSources.filter((source) =>
    supportedSourceIds.has(source.id)
  );
  const unsupportedSources = activeSources.filter((source) =>
    !supportedSourceIds.has(source.id)
  );
  const existingSnapshot = await getDailyBriefCandidateSnapshot(runDate);

  if (existingSnapshot?.selectionStatus === "frozen") {
    return Response.json({
      mode: "ingest",
      runDate,
      summary: {
        activeSourceCount: activeSources.length,
        activeSourceIds: activeSources.map((source) => source.id),
        supportedSourceCount: supportedSources.length,
        supportedSourceIds: supportedSources.map((source) => source.id),
        unsupportedSourceIds: unsupportedSources.map((source) => source.id),
        candidateCount: existingSnapshot.candidateCount,
        snapshotId: existingSnapshot.id,
        updatedExisting: true,
        skippedBecauseFrozen: true,
      },
    });
  }

  const candidates = await ingestEditorialSourceCandidates({
    sources: activeSources,
    fetchImpl: fetch,
  });
  const snapshot = await upsertDailyBriefCandidateSnapshot({
    scheduledFor: runDate,
    candidates,
    selectionStatus: existingSnapshot?.selectionStatus ?? "open",
    selectionFrozenAt: existingSnapshot?.selectionFrozenAt ?? null,
  });

  return Response.json({
    mode: "ingest",
    runDate,
    summary: {
      activeSourceCount: activeSources.length,
      activeSourceIds: activeSources.map((source) => source.id),
      supportedSourceCount: supportedSources.length,
      supportedSourceIds: supportedSources.map((source) => source.id),
      unsupportedSourceIds: unsupportedSources.map((source) => source.id),
      candidateCount: candidates.length,
      snapshotId: snapshot.id,
      updatedExisting: Boolean(existingSnapshot),
      skippedBecauseFrozen: false,
    },
  });
}
