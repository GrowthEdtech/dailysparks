import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { sendBriefToGoodnotesMock, createNotionBriefPageMock } = vi.hoisted(() => ({
  sendBriefToGoodnotesMock: vi.fn(),
  createNotionBriefPageMock: vi.fn(),
}));

vi.mock("../../../../../lib/goodnotes-delivery", () => ({
  DAILY_BRIEF_PDF_RENDERERS: ["typst"],
  sendBriefToGoodnotes: (...args: unknown[]) => sendBriefToGoodnotesMock(...args),
}));

vi.mock("../../../../../lib/notion", () => ({
  createNotionBriefPage: (...args: unknown[]) => createNotionBriefPageMock(...args),
}));

import { POST as runDailyBriefRoute } from "./route";
import { createAiConnection } from "../../../../../lib/ai-connection-store";
import { getDailyBriefCandidateSnapshot } from "../../../../../lib/daily-brief-candidate-store";
import { listDailyBriefHistory } from "../../../../../lib/daily-brief-history-store";
import { createPromptPolicy } from "../../../../../lib/prompt-policy-store";
import {
  getOrCreateParentProfile,
  updateParentNotionConnection,
  updateParentSubscription,
  updateStudentGoodnotesDelivery,
  updateStudentPreferences,
} from "../../../../../lib/mvp-store";

const ORIGINAL_ENV = { ...process.env };
const fetchMock = vi.fn<typeof fetch>();
let tempDirectory = "";
const TEST_AI_CONNECTION_TOKEN = ["fixture", "relay", "credential"].join("-");
const SCHEDULER_HEADER_FIXTURE = ["scheduler", "header", "fixture"].join("-");
const PERSONA_VARIANT_COUNT = 3;
const TIER_VARIANT_COUNT = 3;
const VARIANT_COUNT_PER_PROGRAMME = PERSONA_VARIANT_COUNT * TIER_VARIANT_COUNT;
const GENERATED_PROGRAMME_COUNT = 2;
const GENERATED_COUNT_PER_COHORT =
  VARIANT_COUNT_PER_PROGRAMME * GENERATED_PROGRAMME_COUNT;
const GENERATED_COUNT_PER_RUN = GENERATED_COUNT_PER_COHORT * 3;

function buildRequest(
  schedulerHeaderValue = SCHEDULER_HEADER_FIXTURE,
  body?: Record<string, unknown>,
) {
  return new Request("http://localhost:3000/api/internal/daily-brief/run", {
    method: "POST",
    headers: {
      "x-daily-sparks-scheduler-secret": schedulerHeaderValue,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function createFeedResponse(url: string) {
  const slug = new URL(url).hostname.replace(/^feeds?\./, "").replace(/\./g, "-");

  return new Response(
    `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>Students map sea turtles</title>
            <link>https://${slug}/story-123?utm_source=rss</link>
            <pubDate>Thu, 03 Apr 2026 06:00:00 GMT</pubDate>
            <description>Students help scientists track turtle migration.</description>
          </item>
        </channel>
      </rss>`,
    { status: 200 },
  );
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
              summary: `${programme} learners explore how scientists map turtle migration.`,
              briefMarkdown: `## ${programme}\nStudents discuss why ocean mapping matters.`,
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
      notionLastSyncStatus: "success",
      notionLastSyncMessage: "Notion ready.",
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

async function seedEditorialSources(storePath: string) {
  const timestamp = "2026-04-03T00:00:00.000Z";

  await writeFile(
    storePath,
    JSON.stringify(
      {
        sources: [
          {
            id: "bbc",
            name: "BBC",
            domain: "bbc.com",
            homepage: "https://www.bbc.com/news",
            roles: ["daily-news"],
            usageTiers: ["primary-selection"],
            recommendedProgrammes: ["PYP", "MYP", "DP"],
            sections: ["world"],
            ingestionMode: "metadata-only",
            active: true,
            notes: "Primary source",
            seededFromPolicy: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      },
      null,
      2,
    ),
  );
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-daily-run-route-"),
  );
  const editorialStorePath = path.join(tempDirectory, "editorial-sources.json");
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_EDITORIAL_STORE_PATH: editorialStorePath,
    DAILY_SPARKS_AI_CONNECTION_STORE_PATH: path.join(
      tempDirectory,
      "ai-connections.json",
    ),
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
    DAILY_SPARKS_AI_CONFIG_ENCRYPTION_SECRET:
      "test-ai-connection-encryption-secret",
    DAILY_SPARKS_SCHEDULER_SECRET: SCHEDULER_HEADER_FIXTURE,
    DAILY_BRIEF_SYNTHETIC_CANARY_ENABLED: "false",
  };
  await seedEditorialSources(editorialStorePath);
  sendBriefToGoodnotesMock.mockReset();
  createNotionBriefPageMock.mockReset();
  sendBriefToGoodnotesMock.mockResolvedValue({
    messageId: "smtp-message-id",
    attachmentFileName: "daily-sparks-pyp.pdf",
  });
  createNotionBriefPageMock.mockResolvedValue({
    pageId: "page-123",
    pageUrl: "https://www.notion.so/page-123",
  });
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);

    if (url.includes("/chat/completions")) {
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
    }

    return createFeedResponse(url);
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

describe("daily brief orchestration route", () => {
  test("returns 503 when scheduler auth is not configured", async () => {
    delete process.env.DAILY_SPARKS_SCHEDULER_SECRET;

    const response = await runDailyBriefRoute(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.message).toMatch(/scheduler/i);
  });

  test("rejects requests without the scheduler secret", async () => {
    const response = await runDailyBriefRoute(buildRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/scheduler/i);
  });

  test("returns a preflight summary with blockers when runtime dependencies are missing", async () => {
    await createEligibleProgrammeProfile(
      "parent@example.com",
      "PYP",
      "goodnotes",
    );

    const response = await runDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        dryRun: true,
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("preflight");
    expect(body.ready).toBe(false);
    expect(body.blockers).toContain("No active default AI connection is configured.");
    expect(body.blockers).toContain("No active prompt policy is configured.");
  });

  test("writes history entries on a successful run and returns summary counts", async () => {
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

    const response = await runDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });
    const candidateSnapshot = await getDailyBriefCandidateSnapshot("2026-04-03");

    expect(response.status).toBe(200);
    expect(body.mode).toBe("run");
    expect(body.ready).toBe(true);
    expect(body.stages.ingest.summary.candidateCount).toBe(1);
    expect(body.stages.cohorts).toHaveLength(3);
    expect(body.stages.cohorts[0].editorialCohort).toBe("APAC");
    expect(body.stages.cohorts[0].generate.summary.generatedCount).toBe(
      GENERATED_COUNT_PER_COHORT,
    );
    expect(body.stages.cohorts[0].preflight.ready).toBe(true);
    expect(body.summary.generatedCount).toBe(GENERATED_COUNT_PER_RUN);
    expect(body.summary.historyCreatedCount).toBe(GENERATED_COUNT_PER_RUN);
    expect(body.summary.publishedCount).toBe(1);
    expect(body.summary.failedCount).toBe(0);
    expect(body.summary.deliveryAttemptCount).toBe(1);
    expect(body.summary.deliverySuccessCount).toBe(1);
    expect(body.summary.deliveryFailureCount).toBe(0);
    expect(candidateSnapshot?.candidateCount).toBe(1);
    expect(history).toHaveLength(GENERATED_COUNT_PER_RUN);
    expect(history.filter((entry) => entry.status === "published")).toHaveLength(
      GENERATED_COUNT_PER_RUN,
    );
    expect(sendBriefToGoodnotesMock).not.toHaveBeenCalled();
    expect(createNotionBriefPageMock).toHaveBeenCalledTimes(1);
  });

  test("skips duplicate published date/programme runs on rerun", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      "goodnotes",
    );
    await configureRuntime();

    const firstResponse = await runDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    expect(firstResponse.status).toBe(200);

    sendBriefToGoodnotesMock.mockClear();

    const secondResponse = await runDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await secondResponse.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });

    expect(secondResponse.status).toBe(200);
    expect(body.stages.ingest.summary.candidateCount).toBe(1);
    expect(body.summary.generatedCount).toBe(0);
    expect(body.summary.historyCreatedCount).toBe(0);
    expect(body.summary.skippedProgrammes).toEqual(["MYP", "DP"]);
    expect(body.stages.cohorts).toHaveLength(3);
    expect(body.stages.cohorts[0].generate.summary.generatedCount).toBe(0);
    expect(body.stages.cohorts[0].preflight).toBeNull();
    expect(body.stages.deliver).toBeNull();
    expect(history).toHaveLength(GENERATED_COUNT_PER_RUN);
    expect(sendBriefToGoodnotesMock).not.toHaveBeenCalled();
  });

  test("records partial delivery failures without aborting the run", async () => {
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
    createNotionBriefPageMock.mockRejectedValue(new Error("Notion delivery failed."));

    const response = await runDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });
    const editorialOnlyEntry = history.find(
      (entry) =>
        entry.programme === "DP" &&
        entry.status === "published" &&
        entry.deliverySuccessCount === 0,
    );
    const failedEntry = history.find(
      (entry) =>
        entry.programme === "MYP" &&
        entry.status === "failed" &&
        entry.failedDeliveryTargets.length === 1,
    );

    expect(response.status).toBe(200);
    expect(body.summary.generatedCount).toBe(GENERATED_COUNT_PER_RUN);
    expect(body.stages.cohorts[0].generate.summary.generatedCount).toBe(
      GENERATED_COUNT_PER_COHORT,
    );
    expect(body.summary.publishedCount).toBe(0);
    expect(body.summary.failedCount).toBe(1);
    expect(body.summary.deliverySuccessCount).toBe(0);
    expect(body.summary.deliveryFailureCount).toBe(1);
    expect(editorialOnlyEntry?.status).toBe("published");
    expect(failedEntry?.status).toBe("failed");
    expect(failedEntry?.failureReason).toMatch(/delivery attempts failed/i);
    expect(failedEntry?.failedDeliveryTargets).toHaveLength(1);
  });
});
