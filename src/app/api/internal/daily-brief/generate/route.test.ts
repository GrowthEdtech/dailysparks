import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as generateDailyBriefRoute } from "./route";
import {
  getDailyBriefCandidateSnapshot,
  upsertDailyBriefCandidateSnapshot,
} from "../../../../../lib/daily-brief-candidate-store";
import {
  createDailyBriefHistoryEntry,
  listDailyBriefHistory,
} from "../../../../../lib/daily-brief-history-store";
import { createAiConnection } from "../../../../../lib/ai-connection-store";
import { createPromptPolicy } from "../../../../../lib/prompt-policy-store";
import {
  getOrCreateParentProfile,
  updateParentNotionConnection,
  updateParentSubscription,
  updateStudentGoodnotesDelivery,
  updateStudentPreferences,
} from "../../../../../lib/mvp-store";
import type { EditorialSourceCandidate } from "../../../../../lib/source-ingestion";

const ORIGINAL_ENV = { ...process.env };
const fetchMock = vi.fn<typeof fetch>();
let tempDirectory = "";
const TEST_AI_CONNECTION_TOKEN = ["fixture", "generate", "credential"].join("-");
const SCHEDULER_HEADER_FIXTURE = ["scheduler", "header", "fixture"].join("-");

function buildRequest(
  schedulerHeaderValue = SCHEDULER_HEADER_FIXTURE,
  body?: Record<string, unknown>,
) {
  return new Request("http://localhost:3000/api/internal/daily-brief/generate", {
    method: "POST",
    headers: {
      "x-daily-sparks-scheduler-secret": schedulerHeaderValue,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function buildCandidate(
  overrides: Partial<EditorialSourceCandidate> = {},
): EditorialSourceCandidate {
  return {
    id: "bbc:oceans",
    sourceId: "bbc",
    sourceName: "BBC",
    sourceDomain: "bbc.com",
    feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
    section: "world",
    title: "Students map sea turtles",
    summary: "Young researchers are helping scientists track migration paths.",
    url: "https://www.bbc.com/news/world-123",
    normalizedUrl: "https://www.bbc.com/news/world-123",
    normalizedTitle: "students map sea turtles",
    publishedAt: "2026-04-03T06:00:00.000Z",
    ingestionMode: "metadata-only",
    fetchedAt: "2026-04-03T05:00:00.000Z",
    ...overrides,
  };
}

function createAiResponse(programme: string) {
  return new Response(
    JSON.stringify({
      id: "chatcmpl-test",
      object: "chat.completion",
      created: 1,
      model: "gpt-5.4",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              headline: `${programme} ocean mapping brief`,
              summary: `${programme} learners explore why ocean mapping matters.`,
              briefMarkdown: `## ${programme}\nStudents discuss why mapping turtle routes matters.`,
              topicTags: ["oceans", "science"],
            }),
          },
          finish_reason: "stop",
        },
      ],
    }),
    { status: 200 },
  );
}

async function createEligibleProgrammeProfile(
  email: string,
  programme: "PYP" | "MYP" | "DP",
  channel: "goodnotes" | "notion",
) {
  await getOrCreateParentProfile({
    email,
    fullName: `${programme} Family`,
    studentName: `${programme} Learner`,
  });
  await updateParentSubscription(email, {
    subscriptionStatus: "active",
  });
  await updateStudentPreferences(email, {
    studentName: `${programme} Learner`,
    goodnotesEmail: `${programme.toLowerCase()}@goodnotes.email`,
    programme,
    programmeYear: programme === "DP" ? 1 : programme === "MYP" ? 3 : 5,
  });

  if (channel === "goodnotes") {
    await updateStudentGoodnotesDelivery(email, {
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-02T00:00:00.000Z",
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage: "Ready.",
    });
  } else {
    await updateParentNotionConnection(email, {
      notionConnected: true,
      notionWorkspaceId: `${programme.toLowerCase()}-workspace`,
      notionWorkspaceName: `${programme} Workspace`,
      notionDatabaseId: `${programme.toLowerCase()}-database`,
      notionDataSourceId: `${programme.toLowerCase()}-data-source`,
    });
  }
}

async function configureRuntime() {
  await createAiConnection({
    name: "NF Relay",
    providerType: "openai-compatible",
    baseUrl: "https://relay.nf.video/v1",
    defaultModel: "gpt-5.4",
    apiKey: TEST_AI_CONNECTION_TOKEN,
    active: true,
    isDefault: true,
    notes: "Primary relay connection.",
  });
  await createPromptPolicy({
    name: "Family Daily Sparks Core",
    versionLabel: "v1.0.0",
    sharedInstructions:
      "Use clear, family-facing language, keep the facts grounded in cited sources.",
    antiRepetitionInstructions:
      "Avoid repeating the same angle used in the recent memory window.",
    outputContractInstructions:
      "Return headline, summary, source references, and discussion prompts.",
    pypInstructions: "Use simple, concrete examples.",
    mypInstructions: "Use mid-depth comparison and context.",
    dpInstructions: "Use analysis, nuance, and evidence limits.",
    notes: "Initial prompt policy.",
  });
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-generate-route-"),
  );
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_AI_CONNECTION_STORE_PATH: path.join(
      tempDirectory,
      "ai-connections.json",
    ),
    DAILY_SPARKS_AI_CONFIG_ENCRYPTION_SECRET:
      "test-ai-connection-encryption-secret",
    DAILY_SPARKS_PROMPT_POLICY_STORE_PATH: path.join(
      tempDirectory,
      "prompt-policies.json",
    ),
    DAILY_SPARKS_DAILY_BRIEF_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-history.json",
    ),
    DAILY_SPARKS_DAILY_BRIEF_CANDIDATE_STORE_PATH: path.join(
      tempDirectory,
      "candidate-snapshots.json",
    ),
    DAILY_SPARKS_SCHEDULER_SECRET: SCHEDULER_HEADER_FIXTURE,
  };

  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);

    if (!url.includes("/chat/completions")) {
      throw new Error("generate route should not re-ingest editorial feeds");
    }

    const payload = JSON.parse(String(init?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    const programmeLine =
      payload.messages
        .find((message) => message.role === "user")
        ?.content.split("\n")
        .find((line) => line.startsWith("Programme: ")) ?? "Programme: PYP";
    const programme = programmeLine.replace("Programme: ", "").trim();

    return createAiResponse(programme);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("daily brief generate route", () => {
  test("reads the stored candidate snapshot, freezes it, and writes generated draft history entries", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      "goodnotes",
    );
    await configureRuntime();

    await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate()],
    });

    const response = await generateDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });
    const frozenSnapshot = await getDailyBriefCandidateSnapshot("2026-04-03");

    expect(response.status).toBe(200);
    expect(body.mode).toBe("generate");
    expect(body.summary.generatedCount).toBe(1);
    expect(body.selectedTopic.clusterKey).toBe("students map sea turtles");
    expect(history).toHaveLength(1);
    expect(frozenSnapshot?.updatedAt).toBeTruthy();
    expect(history[0]).toMatchObject({
      status: "draft",
      pipelineStage: "generated",
      candidateSnapshotAt: frozenSnapshot?.updatedAt,
      promptVersionLabel: "v1.0.0",
    });
    expect(Date.parse(String(history[0]?.generationCompletedAt))).not.toBeNaN();
    expect(history[0]?.deliveryWindowAt).toBeTruthy();
    expect(frozenSnapshot?.selectionStatus).toBe("frozen");
    expect(Date.parse(String(frozenSnapshot?.selectionFrozenAt))).not.toBeNaN();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("skips programmes that already have a published brief for the same run date", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      "goodnotes",
    );
    await createEligibleProgrammeProfile(
      "myp-family@example.com",
      "MYP",
      "notion",
    );
    await configureRuntime();

    await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate()],
    });

    await createDailyBriefHistoryEntry({
      scheduledFor: "2026-04-03",
      headline: "Existing PYP brief",
      summary: "Already shipped for PYP.",
      programme: "PYP",
      status: "published",
      topicTags: ["oceans"],
      sourceReferences: [
        {
          sourceId: "bbc",
          sourceName: "BBC",
          sourceDomain: "bbc.com",
          articleTitle: "Students map sea turtles",
          articleUrl: "https://www.bbc.com/news/world-123",
        },
      ],
      aiConnectionId: "nf-relay",
      aiConnectionName: "NF Relay",
      aiModel: "gpt-5.4",
      promptPolicyId: "policy-1",
      promptVersionLabel: "v1.0.0",
      promptVersion: "v1.0.0",
      repetitionRisk: "low",
      repetitionNotes: "Already shipped.",
      adminNotes: "",
      briefMarkdown: "## PYP\nExisting brief",
      pipelineStage: "published",
      candidateSnapshotAt: "2026-04-03T05:00:00.000Z",
      generationCompletedAt: "2026-04-03T06:00:00.000Z",
      pdfBuiltAt: null,
      deliveryWindowAt: "2026-04-03T01:00:00.000Z",
      lastDeliveryAttemptAt: "2026-04-03T01:00:00.000Z",
      deliveryAttemptCount: 1,
      deliverySuccessCount: 1,
      deliveryFailureCount: 0,
      failureReason: "",
      retryEligibleUntil: null,
    });

    const response = await generateDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });

    expect(response.status).toBe(200);
    expect(body.summary.generatedCount).toBe(1);
    expect(body.summary.skippedProgrammes).toEqual(["PYP"]);
    expect(history.map((entry) => entry.programme).sort()).toEqual([
      "MYP",
      "PYP",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("does not create duplicate drafts when the same run date is generated twice", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      "goodnotes",
    );
    await configureRuntime();

    await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate()],
    });

    const firstResponse = await generateDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    expect(firstResponse.status).toBe(200);

    fetchMock.mockClear();

    const secondResponse = await generateDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await secondResponse.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });

    expect(secondResponse.status).toBe(200);
    expect(body.summary.generatedCount).toBe(0);
    expect(body.summary.historyCreatedCount).toBe(0);
    expect(body.summary.skippedProgrammes).toEqual(["PYP"]);
    expect(history).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("does not let same-day test history block production generation", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      "goodnotes",
    );
    await configureRuntime();

    await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate()],
    });
    await createDailyBriefHistoryEntry({
      scheduledFor: "2026-04-03",
      recordKind: "test",
      headline: "Test-only rehearsal brief",
      summary: "This test brief should not block production generation.",
      programme: "PYP",
      status: "published",
      topicTags: ["science"],
      sourceReferences: [
        {
          sourceId: "bbc",
          sourceName: "BBC",
          sourceDomain: "bbc.com",
          articleTitle: "Students map sea turtles",
          articleUrl: "https://www.bbc.com/news/world-123",
        },
      ],
      aiConnectionId: "nf-relay",
      aiConnectionName: "NF Relay",
      aiModel: "gpt-5.4",
      promptPolicyId: "policy-1",
      promptVersionLabel: "v1.0.0",
      promptVersion: "v1.0.0",
      repetitionRisk: "low",
      repetitionNotes: "Test history only.",
      adminNotes: "Created by admin test run.",
      briefMarkdown: "## Test\nRehearsal output",
      pipelineStage: "published",
      candidateSnapshotAt: "2026-04-03T05:00:00.000Z",
      generationCompletedAt: "2026-04-03T06:00:00.000Z",
      pdfBuiltAt: "2026-04-03T06:05:00.000Z",
      deliveryWindowAt: "2026-04-03T01:00:00.000Z",
      lastDeliveryAttemptAt: "2026-04-03T01:00:00.000Z",
      deliveryAttemptCount: 1,
      deliverySuccessCount: 1,
      deliveryFailureCount: 0,
      failureReason: "",
      retryEligibleUntil: null,
    });

    const response = await generateDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const productionHistory = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
      recordKind: "production",
    });

    expect(response.status).toBe(200);
    expect(body.summary.generatedCount).toBe(1);
    expect(body.summary.skippedProgrammes).toEqual([]);
    expect(productionHistory).toHaveLength(1);
    expect(productionHistory[0]?.recordKind).toBe("production");
  });

  test("keeps the candidate snapshot open when an early generation wave fails", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      "goodnotes",
    );
    await configureRuntime();

    await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate()],
    });

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: 1,
          model: "gpt-5.4",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "{}",
              },
              finish_reason: "stop",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const response = await generateDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const snapshot = await getDailyBriefCandidateSnapshot("2026-04-03");
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });

    expect(response.status).toBe(500);
    expect(snapshot?.selectionStatus).toBe("open");
    expect(snapshot?.selectionFrozenAt).toBeNull();
    expect(history).toHaveLength(0);
  });
});
