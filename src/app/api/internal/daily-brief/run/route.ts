import { getDefaultAiConnection } from "../../../../../lib/ai-connection-store";
import {
  createDailyBriefHistoryEntry,
  listDailyBriefHistory,
} from "../../../../../lib/daily-brief-history-store";
import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { generateDailyBriefDrafts } from "../../../../../lib/daily-brief-orchestrator";
import { listEditorialSources } from "../../../../../lib/editorial-source-store";
import { listEligibleDeliveryProfiles } from "../../../../../lib/mvp-store";
import { getActivePromptPolicy } from "../../../../../lib/prompt-policy-store";
import { sendBriefToGoodnotes } from "../../../../../lib/goodnotes-delivery";
import { createNotionBriefPage } from "../../../../../lib/notion";
import type { ParentProfile } from "../../../../../lib/mvp-types";

type DailyRunRequestBody = {
  dryRun?: boolean;
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

function internalError(message: string) {
  return Response.json({ message }, { status: 500 });
}

function buildRunDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function isValidRunDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
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

    if (
      payload.dryRun !== undefined &&
      typeof payload.dryRun !== "boolean"
    ) {
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

async function deliverBriefToProfiles(
  profiles: ParentProfile[],
  brief: Awaited<ReturnType<typeof generateDailyBriefDrafts>>["generatedBriefs"][number],
) {
  let deliveryAttemptCount = 0;
  let deliverySuccessCount = 0;
  let deliveryFailureCount = 0;
  const notes: string[] = [];

  for (const profile of profiles) {
    if (profile.student.goodnotesConnected) {
      deliveryAttemptCount += 1;

      try {
        await sendBriefToGoodnotes(profile, brief);
        deliverySuccessCount += 1;
      } catch {
        deliveryFailureCount += 1;
        notes.push(`Goodnotes delivery failed for ${profile.parent.email}.`);
      }
    }

    if (profile.student.notionConnected) {
      deliveryAttemptCount += 1;

      try {
        await createNotionBriefPage(profile, brief);
        deliverySuccessCount += 1;
      } catch {
        deliveryFailureCount += 1;
        notes.push(`Notion delivery failed for ${profile.parent.email}.`);
      }
    }
  }

  if (deliveryAttemptCount === 0) {
    notes.push(`No delivery channels were ready for ${brief.programme}.`);
  }

  return {
    deliveryAttemptCount,
    deliverySuccessCount,
    deliveryFailureCount,
    notes,
  };
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
  const [eligibleProfiles, sources, defaultAiConnection, activePromptPolicy, history] =
    await Promise.all([
      listEligibleDeliveryProfiles(),
      listEditorialSources(),
      getDefaultAiConnection(),
      getActivePromptPolicy(),
      listDailyBriefHistory({
        scheduledFor: runDate,
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

  const runtimePromptPolicy = activePromptPolicy;

  if (!runtimePromptPolicy) {
    return internalError("Daily brief run is missing an active prompt policy.");
  }

  try {
    const generation = await generateDailyBriefDrafts({
      scheduledFor: runDate,
      historyEntries: history,
      promptPolicy: runtimePromptPolicy,
      fetchImpl: fetch,
    });
    const createdHistoryEntries = [];
    let publishedCount = 0;
    let failedCount = 0;
    let deliveryAttemptCount = 0;
    let deliverySuccessCount = 0;
    let deliveryFailureCount = 0;

    for (const brief of generation.generatedBriefs) {
      const programmeProfiles = eligibleProfiles.filter(
        (profile) => profile.student.programme === brief.programme,
      );
      const deliverySummary = await deliverBriefToProfiles(programmeProfiles, brief);
      const finalStatus =
        deliverySummary.deliveryFailureCount > 0 &&
        deliverySummary.deliverySuccessCount === 0
          ? "failed"
          : "published";
      const adminNotes = [
        `Delivery attempts: ${deliverySummary.deliveryAttemptCount}.`,
        `Successful deliveries: ${deliverySummary.deliverySuccessCount}.`,
        `Failed deliveries: ${deliverySummary.deliveryFailureCount}.`,
        ...deliverySummary.notes,
      ]
        .filter(Boolean)
        .join(" ");
      const createdEntry = await createDailyBriefHistoryEntry({
        scheduledFor: brief.scheduledFor,
        headline: brief.headline,
        summary: brief.summary,
        programme: brief.programme,
        status: finalStatus,
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
        adminNotes,
        briefMarkdown: brief.briefMarkdown,
      });

      createdHistoryEntries.push(createdEntry);
      deliveryAttemptCount += deliverySummary.deliveryAttemptCount;
      deliverySuccessCount += deliverySummary.deliverySuccessCount;
      deliveryFailureCount += deliverySummary.deliveryFailureCount;

      if (finalStatus === "published") {
        publishedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    return Response.json({
      mode: "run",
      ready: true,
      runDate,
      blockers: [],
      selectedTopic: generation.selectedTopic
        ? {
            clusterKey: generation.selectedTopic.clusterKey,
            headline: generation.selectedTopic.headline,
            sourceReferenceCount: generation.selectedTopic.sourceReferences.length,
            candidateCount: generation.selectedTopic.topicCandidates.length,
          }
        : null,
      summary: {
        eligibleProfileCount: eligibleProfiles.length,
        eligibleProgrammes: Array.from(
          new Set(eligibleProfiles.map((profile) => profile.student.programme)),
        ).sort(),
        activeSourceCount: activeSources.length,
        activeSourceIds: activeSources.map((source) => source.id),
        generatedCount: generation.generatedBriefs.length,
        skippedProgrammes: generation.skippedProgrammes,
        historyCreatedCount: createdHistoryEntries.length,
        publishedCount,
        failedCount,
        deliveryAttemptCount,
        deliverySuccessCount,
        deliveryFailureCount,
      },
    });
  } catch (error) {
    console.error("Daily brief run failed", error);

    return internalError(
      "Daily brief run failed before completion. Check server logs for details.",
    );
  }
}
