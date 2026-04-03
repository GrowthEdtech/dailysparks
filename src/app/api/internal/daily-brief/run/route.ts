import { getDefaultAiConnection } from "../../../../../lib/ai-connection-store";
import {
  DAILY_BRIEF_EDITORIAL_COHORTS,
  type DailyBriefEditorialCohort,
} from "../../../../../lib/daily-brief-cohorts";
import { listDailyBriefHistory } from "../../../../../lib/daily-brief-history-store";
import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { getDailyBriefBusinessDate } from "../../../../../lib/daily-brief-run-date";
import { POST as deliverDailyBriefRoute } from "../deliver/route";
import { POST as generateDailyBriefRoute } from "../generate/route";
import { POST as ingestDailyBriefRoute } from "../ingest/route";
import { POST as preflightDailyBriefRoute } from "../preflight/route";
import { listEditorialSources } from "../../../../../lib/editorial-source-store";
import { listEligibleDeliveryProfiles } from "../../../../../lib/mvp-store";
import { getActivePromptPolicy } from "../../../../../lib/prompt-policy-store";

type DailyRunRequestBody = {
  dryRun?: boolean;
  runDate?: string;
};

type StageResponseBody = {
  mode?: string;
  ready?: boolean;
  blockers?: string[];
  summary?: Record<string, unknown>;
  selectedTopic?: unknown;
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
): Promise<DailyRunRequestBody | Response> {
  const contentLength = request.headers.get("content-length");

  if (contentLength === "0") {
    return {};
  }

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {};
  }

  try {
    const payload = JSON.parse(bodyText) as DailyRunRequestBody;

    if (payload.dryRun !== undefined && typeof payload.dryRun !== "boolean") {
      return badRequest("dryRun must be a boolean when provided.");
    }

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

function buildPreflightSummary(args: {
  runDate: string;
  blockers: string[];
  eligibleProfiles: Awaited<ReturnType<typeof listEligibleDeliveryProfiles>>;
  activeSources: Awaited<ReturnType<typeof listEditorialSources>>;
  defaultAiConnection: Awaited<ReturnType<typeof getDefaultAiConnection>>;
  activePromptPolicy: Awaited<ReturnType<typeof getActivePromptPolicy>>;
  history: Awaited<ReturnType<typeof listDailyBriefHistory>>;
}) {
  const eligibleProgrammes = Array.from(
    new Set(args.eligibleProfiles.map((profile) => profile.student.programme)),
  ).sort();

  return {
    mode: "preflight",
    ready: args.blockers.length === 0,
    runDate: args.runDate,
    blockers: args.blockers,
    summary: {
      eligibleProfileCount: args.eligibleProfiles.length,
      eligibleProgrammes,
      activeSourceCount: args.activeSources.length,
      activeSourceIds: args.activeSources.map((source) => source.id),
      defaultAiConnection: args.defaultAiConnection
        ? {
            id: args.defaultAiConnection.id,
            name: args.defaultAiConnection.name,
            baseUrl: args.defaultAiConnection.baseUrl,
            defaultModel: args.defaultAiConnection.defaultModel,
          }
        : null,
      activePromptPolicy: args.activePromptPolicy
        ? {
            id: args.activePromptPolicy.id,
            name: args.activePromptPolicy.name,
            versionLabel: args.activePromptPolicy.versionLabel,
          }
        : null,
      historyEntryCount: args.history.length,
    },
  };
}

function buildStageRequest(
  pathname: string,
  schedulerSecret: string,
  runDate: string,
  editorialCohort?: DailyBriefEditorialCohort,
) {
  return new Request(`http://localhost:3000${pathname}`, {
    method: "POST",
    headers: {
      [getDailyBriefSchedulerHeaderName()]: schedulerSecret,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      runDate,
      recordKind: "production",
      ...(editorialCohort ? { editorialCohort } : {}),
    }),
  });
}

async function parseStageResponse(
  response: Response,
): Promise<StageResponseBody | Response> {
  if (!response.ok) {
    return response;
  }

  return (await response.json()) as StageResponseBody;
}

function getSummaryNumber(
  body: StageResponseBody | null,
  key: string,
) {
  const value = body?.summary?.[key];

  return typeof value === "number" ? value : 0;
}

function getSummaryStringArray(
  body: StageResponseBody | null,
  key: string,
) {
  const value = body?.summary?.[key];

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

type CohortStageResult = {
  editorialCohort: DailyBriefEditorialCohort;
  generate: StageResponseBody | null;
  preflight: StageResponseBody | null;
};

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
  const [eligibleProfiles, sources, defaultAiConnection, activePromptPolicy, history] =
    await Promise.all([
      listEligibleDeliveryProfiles(),
      listEditorialSources(),
      getDefaultAiConnection(),
      getActivePromptPolicy(),
      listDailyBriefHistory({
        scheduledFor: runDate,
        recordKind: "production",
      }),
    ]);
  const activeSources = sources.filter((source) => source.active);
  const blockers: string[] = [];

  if (eligibleProfiles.length === 0) {
    blockers.push("No eligible delivery profiles are configured.");
  }

  if (activeSources.length === 0) {
    blockers.push("No active editorial sources are configured.");
  }

  if (!defaultAiConnection) {
    blockers.push("No active default AI connection is configured.");
  }

  if (!activePromptPolicy) {
    blockers.push("No active prompt policy is configured.");
  }

  if (parsedBody.dryRun || blockers.length > 0) {
    return Response.json(
      buildPreflightSummary({
        runDate,
        blockers,
        eligibleProfiles,
        activeSources,
        defaultAiConnection,
        activePromptPolicy,
        history,
      }),
    );
  }

  const schedulerSecret =
    request.headers.get(getDailyBriefSchedulerHeaderName()) ?? "";
  const ingestBody = await parseStageResponse(
    await ingestDailyBriefRoute(
      buildStageRequest(
        "/api/internal/daily-brief/ingest",
        schedulerSecret,
        runDate,
      ),
    ),
  );

  if (ingestBody instanceof Response) {
    return ingestBody;
  }

  const cohortStages: CohortStageResult[] = [];
  const stageBlockers: string[] = [];
  let generatedCount = 0;
  let historyCreatedCount = 0;
  const skippedProgrammes = new Set<string>();
  const selectedTopics: Partial<Record<DailyBriefEditorialCohort, unknown>> = {};

  for (const editorialCohort of DAILY_BRIEF_EDITORIAL_COHORTS) {
    const generateBody = await parseStageResponse(
      await generateDailyBriefRoute(
        buildStageRequest(
          "/api/internal/daily-brief/generate",
          schedulerSecret,
          runDate,
          editorialCohort,
        ),
      ),
    );

    if (generateBody instanceof Response) {
      return generateBody;
    }

    cohortStages.push({
      editorialCohort,
      generate: generateBody,
      preflight: null,
    });
    generatedCount += getSummaryNumber(generateBody, "generatedCount");
    historyCreatedCount += getSummaryNumber(generateBody, "historyCreatedCount");
    getSummaryStringArray(generateBody, "skippedProgrammes").forEach((programme) =>
      skippedProgrammes.add(programme),
    );
    selectedTopics[editorialCohort] = generateBody.selectedTopic ?? null;

    if (getSummaryNumber(generateBody, "generatedCount") === 0) {
      continue;
    }

    const preflightBody = await parseStageResponse(
      await preflightDailyBriefRoute(
        buildStageRequest(
          "/api/internal/daily-brief/preflight",
          schedulerSecret,
          runDate,
          editorialCohort,
        ),
      ),
    );

    if (preflightBody instanceof Response) {
      return preflightBody;
    }

    cohortStages[cohortStages.length - 1] = {
      editorialCohort,
      generate: generateBody,
      preflight: preflightBody,
    };

    if (preflightBody.ready === false) {
      stageBlockers.push(...(preflightBody.blockers ?? []));
    }
  }

  if (generatedCount === 0) {
    return Response.json({
      mode: "run",
      ready: true,
      runDate,
      blockers: [],
      stages: {
        ingest: ingestBody,
        cohorts: cohortStages,
        deliver: null,
      },
      selectedTopicByCohort: selectedTopics,
      summary: {
        generatedCount,
        historyCreatedCount,
        skippedProgrammes: Array.from(skippedProgrammes),
        publishedCount: 0,
        failedCount: 0,
        deliveryAttemptCount: 0,
        deliverySuccessCount: 0,
        deliveryFailureCount: 0,
      },
    });
  }

  if (stageBlockers.length > 0) {
    return Response.json({
      mode: "run",
      ready: false,
      runDate,
      blockers: stageBlockers,
      stages: {
        ingest: ingestBody,
        cohorts: cohortStages,
        deliver: null,
      },
      selectedTopicByCohort: selectedTopics,
      summary: {
        generatedCount,
        historyCreatedCount,
        skippedProgrammes: Array.from(skippedProgrammes),
        publishedCount: 0,
        failedCount: 0,
        deliveryAttemptCount: 0,
        deliverySuccessCount: 0,
        deliveryFailureCount: 0,
      },
    });
  }

  const deliverBody = await parseStageResponse(
    await deliverDailyBriefRoute(
      buildStageRequest(
        "/api/internal/daily-brief/deliver",
        schedulerSecret,
        runDate,
      ),
    ),
  );

  if (deliverBody instanceof Response) {
    return deliverBody;
  }

  return Response.json({
      mode: "run",
      ready: true,
      runDate,
      blockers: [],
      stages: {
        ingest: ingestBody,
        cohorts: cohortStages,
        deliver: deliverBody,
      },
    selectedTopicByCohort: selectedTopics,
    summary: {
      generatedCount,
      historyCreatedCount,
      skippedProgrammes: Array.from(skippedProgrammes),
      publishedCount: getSummaryNumber(deliverBody, "deliveredCount"),
      failedCount: getSummaryNumber(deliverBody, "failedCount"),
      deliveryAttemptCount: getSummaryNumber(deliverBody, "deliveryAttemptCount"),
      deliverySuccessCount: getSummaryNumber(deliverBody, "deliverySuccessCount"),
      deliveryFailureCount: getSummaryNumber(deliverBody, "deliveryFailureCount"),
    },
  });
}
