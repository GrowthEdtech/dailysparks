import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createAiConnection } from "./ai-connection-store";
import { createDailyBriefHistoryEntry } from "./daily-brief-history-store";
import type { EditorialSourceCandidate } from "./source-ingestion";
import { generateDailyBriefDrafts } from "./daily-brief-orchestrator";
import {
  getOrCreateParentProfile,
  updateParentNotionConnection,
  updateParentSubscription,
  updateStudentGoodnotesDelivery,
  updateStudentPreferences,
} from "./mvp-store";
import { createPromptPolicy } from "./prompt-policy-store";

const ORIGINAL_ENV = { ...process.env };

function buildCandidate(
  overrides: Partial<EditorialSourceCandidate>,
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
    fetchedAt: "2026-04-03T06:10:00.000Z",
    ...overrides,
  };
}

const fetchMock = vi.fn<typeof fetch>();
let tempDirectory = "";
const TEST_AI_CONNECTION_TOKEN = ["fixture", "runtime", "credential"].join("-");

async function createEligibleProgrammeProfile(
  email: string,
  programme: "PYP" | "MYP" | "DP",
  channel: "goodnotes" | "notion" | "none",
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
    programme,
    programmeYear: programme === "DP" ? 1 : programme === "MYP" ? 3 : 5,
    goodnotesEmail: `${programme.toLowerCase()}@goodnotes.email`,
  });

  if (channel === "goodnotes") {
    await updateStudentGoodnotesDelivery(email, {
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-02T00:00:00.000Z",
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage: "Ready",
    });
  } else if (channel === "notion") {
    await updateParentNotionConnection(email, {
      notionConnected: true,
      notionWorkspaceId: `${programme.toLowerCase()}-workspace`,
      notionWorkspaceName: `${programme} Workspace`,
    });
  }
}

function createChatCompletionResponse(payload: Record<string, unknown>) {
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
            content: JSON.stringify(payload),
          },
          finish_reason: "stop",
        },
      ],
    }),
    { status: 200 },
  );
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-orchestrator-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
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
  };

  fetchMock.mockReset();
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("daily brief orchestrator", () => {
  test("chooses one topic cluster for the day and generates briefs for every programme in editorial scope", async () => {
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
    await getOrCreateParentProfile({
      email: "dp-family@example.com",
      fullName: "DP Family",
      studentName: "DP Learner",
    });

    await createAiConnection({
      name: "NF Relay",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: TEST_AI_CONNECTION_TOKEN,
      active: true,
      isDefault: true,
      notes: "Primary runtime connection.",
    });

    await createPromptPolicy({
      name: "Family Daily Sparks Core",
      versionLabel: "v1.0.0",
      sharedInstructions: "Use clear, family-facing language.",
      antiRepetitionInstructions: "Avoid repeating recent editorial angles.",
      outputContractInstructions:
        "Return JSON with headline, summary, briefMarkdown, and topicTags.",
      pypInstructions: "Use short sentences and concrete examples.",
      mypInstructions: "Add comparisons and causes.",
      dpInstructions: "Add evidence limits and nuance.",
      notes: "Primary policy",
    });

    fetchMock
      .mockResolvedValueOnce(
        createChatCompletionResponse({
          headline: "PYP ocean mapping brief",
          summary: "A younger learner summary.",
          briefMarkdown: "## PYP\nStudents are helping map turtle routes.",
          topicTags: ["oceans", "science"],
        }),
      )
      .mockResolvedValueOnce(
        createChatCompletionResponse({
          headline: "MYP ocean mapping brief",
          summary: "A middle-years analytical summary.",
          briefMarkdown: "## MYP\nStudents compare why ocean data matters.",
          topicTags: ["oceans", "migration"],
        }),
      )
      .mockResolvedValueOnce(
        createChatCompletionResponse({
          headline: "DP ocean mapping brief",
          summary: "A diploma-level analytical summary.",
          briefMarkdown: "## DP\nStudents evaluate why ocean evidence matters.",
          topicTags: ["oceans", "evidence"],
        }),
      );

    const candidates = [
      buildCandidate(),
      buildCandidate({
        id: "npr:oceans",
        sourceId: "npr",
        sourceName: "NPR",
        sourceDomain: "npr.org",
        feedUrl: "https://feeds.npr.org/1004/rss.xml",
        url: "https://www.npr.org/2026/04/03/turtles",
        normalizedUrl: "https://www.npr.org/2026/04/03/turtles",
      }),
      buildCandidate({
        id: "bbc:forests",
        title: "Cities test new forest classrooms",
        summary: "A different topic cluster that should not be selected today.",
        url: "https://www.bbc.com/news/education-456",
        normalizedUrl: "https://www.bbc.com/news/education-456",
        normalizedTitle: "cities test new forest classrooms",
        publishedAt: "2026-04-03T07:00:00.000Z",
      }),
    ];

    const result = await generateDailyBriefDrafts({
      scheduledFor: "2026-04-03",
      candidates,
      fetchImpl: fetchMock,
      now: new Date("2026-04-03T08:00:00.000Z"),
    });

    expect(result.selectedTopic?.clusterKey).toBe("students map sea turtles");
    expect(result.generatedBriefs.map((brief) => brief.programme)).toEqual([
      "PYP",
      "MYP",
      "DP",
    ]);
    expect(result.generatedBriefs.every((brief) => brief.status === "draft")).toBe(
      true,
    );
    expect(result.generatedBriefs[0]).toMatchObject({
      aiConnectionName: "NF Relay",
      aiModel: "gpt-5.4",
      promptVersionLabel: "v1.0.0",
      sourceReferences: [
        expect.objectContaining({ sourceId: "bbc" }),
        expect.objectContaining({ sourceId: "npr" }),
      ],
    });
    expect(result.generatedBriefs[0]?.resolvedPrompt).toContain(
      "Use clear, family-facing language.",
    );
    expect(result.generatedBriefs[0]?.resolvedPrompt).toContain(
      "Use short sentences and concrete examples.",
    );
    expect(result.generatedBriefs[1]?.resolvedPrompt).toContain(
      "Add comparisons and causes.",
    );
    expect(result.generatedBriefs[2]?.resolvedPrompt).toContain(
      "Add evidence limits and nuance.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("generates editorial-only briefs even when only one programme has audience coverage", async () => {
    await createEligibleProgrammeProfile(
      "myp-family@example.com",
      "MYP",
      "none",
    );

    await createAiConnection({
      name: "NF Relay",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: TEST_AI_CONNECTION_TOKEN,
      active: true,
      isDefault: true,
      notes: "Primary runtime connection.",
    });

    await createPromptPolicy({
      name: "Family Daily Sparks Core",
      versionLabel: "v1.0.0",
      sharedInstructions: "Use clear, family-facing language.",
      antiRepetitionInstructions: "Avoid repeating recent editorial angles.",
      outputContractInstructions:
        "Return JSON with headline, summary, briefMarkdown, and topicTags.",
      pypInstructions: "Use short sentences and concrete examples.",
      mypInstructions: "Add comparisons and causes.",
      dpInstructions: "Add evidence limits and nuance.",
      notes: "Primary policy",
    });

    fetchMock.mockImplementation(async (_input, init) => {
      const payload = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      const programmeLine =
        payload.messages
          .find((message) => message.role === "user")
          ?.content.split("\n")
          .find((line) => line.startsWith("Programme: ")) ?? "Programme: PYP";
      const programme = programmeLine.replace("Programme: ", "").trim();

      return createChatCompletionResponse({
        headline: `${programme} ocean mapping brief`,
        summary: `${programme} analytical summary.`,
        briefMarkdown: `## ${programme}\nStudents compare why ocean data matters.`,
        topicTags: ["oceans", "migration"],
      });
    });

    const result = await generateDailyBriefDrafts({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate()],
      fetchImpl: fetchMock,
      now: new Date("2026-04-03T08:00:00.000Z"),
    });

    expect(result.generatedBriefs.map((brief) => brief.programme)).toEqual([
      "PYP",
      "MYP",
      "DP",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("skips programmes that already have a published brief for the scheduled date", async () => {
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

    const connection = await createAiConnection({
      name: "NF Relay",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: TEST_AI_CONNECTION_TOKEN,
      active: true,
      isDefault: true,
      notes: "Primary runtime connection.",
    });

    const promptPolicy = await createPromptPolicy({
      name: "Family Daily Sparks Core",
      versionLabel: "v1.0.0",
      sharedInstructions: "Use clear, family-facing language.",
      antiRepetitionInstructions: "Avoid repeating recent editorial angles.",
      outputContractInstructions:
        "Return JSON with headline, summary, briefMarkdown, and topicTags.",
      pypInstructions: "Use short sentences and concrete examples.",
      mypInstructions: "Add comparisons and causes.",
      dpInstructions: "Add evidence limits and nuance.",
      notes: "Primary policy",
    });

    await createDailyBriefHistoryEntry({
      scheduledFor: "2026-04-03",
      headline: "Existing PYP brief",
      summary: "Already generated for PYP.",
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
      aiConnectionId: connection.id,
      aiConnectionName: connection.name,
      aiModel: connection.defaultModel,
      promptPolicyId: promptPolicy.id,
      promptVersionLabel: promptPolicy.versionLabel,
      promptVersion: promptPolicy.versionLabel,
      repetitionRisk: "low",
      repetitionNotes: "Already shipped.",
      adminNotes: "",
      briefMarkdown: "## PYP\nExisting brief",
    });

    fetchMock.mockImplementation(async (_input, init) => {
      const payload = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      const programmeLine =
        payload.messages
          .find((message) => message.role === "user")
          ?.content.split("\n")
          .find((line) => line.startsWith("Programme: ")) ?? "Programme: PYP";
      const programme = programmeLine.replace("Programme: ", "").trim();

      return createChatCompletionResponse({
        headline: `${programme} ocean mapping brief`,
        summary: `${programme} analytical summary.`,
        briefMarkdown: `## ${programme}\nStudents compare why ocean data matters.`,
        topicTags: ["oceans", "migration"],
      });
    });

    const result = await generateDailyBriefDrafts({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate()],
      fetchImpl: fetchMock,
      now: new Date("2026-04-03T08:00:00.000Z"),
    });

    expect(result.generatedBriefs.map((brief) => brief.programme)).toEqual([
      "MYP",
      "DP",
    ]);
    expect(result.skippedProgrammes).toContain("PYP");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("treats existing same-day drafts as already generated for idempotent reruns", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      "goodnotes",
    );

    const connection = await createAiConnection({
      name: "NF Relay",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: TEST_AI_CONNECTION_TOKEN,
      active: true,
      isDefault: true,
      notes: "Primary runtime connection.",
    });

    const promptPolicy = await createPromptPolicy({
      name: "Family Daily Sparks Core",
      versionLabel: "v1.0.0",
      sharedInstructions: "Use clear, family-facing language.",
      antiRepetitionInstructions: "Avoid repeating recent editorial angles.",
      outputContractInstructions:
        "Return JSON with headline, summary, briefMarkdown, and topicTags.",
      pypInstructions: "Use short sentences and concrete examples.",
      mypInstructions: "Add comparisons and causes.",
      dpInstructions: "Add evidence limits and nuance.",
      notes: "Primary policy",
    });

    await createDailyBriefHistoryEntry({
      scheduledFor: "2026-04-03",
      headline: "Existing PYP draft",
      summary: "Already generated for PYP.",
      programme: "PYP",
      status: "draft",
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
      aiConnectionId: connection.id,
      aiConnectionName: connection.name,
      aiModel: connection.defaultModel,
      promptPolicyId: promptPolicy.id,
      promptVersionLabel: promptPolicy.versionLabel,
      promptVersion: promptPolicy.versionLabel,
      repetitionRisk: "low",
      repetitionNotes: "Already generated.",
      adminNotes: "",
      briefMarkdown: "## PYP\nExisting draft",
      pipelineStage: "generated",
      candidateSnapshotAt: "2026-04-03T05:00:00.000Z",
      generationCompletedAt: "2026-04-03T06:00:00.000Z",
      pdfBuiltAt: null,
      deliveryWindowAt: "2026-04-03T01:00:00.000Z",
      lastDeliveryAttemptAt: null,
      deliveryAttemptCount: 0,
      deliverySuccessCount: 0,
      deliveryFailureCount: 0,
      failureReason: "",
      retryEligibleUntil: null,
    });

    fetchMock.mockImplementation(async (_input, init) => {
      const payload = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      const programmeLine =
        payload.messages
          .find((message) => message.role === "user")
          ?.content.split("\n")
          .find((line) => line.startsWith("Programme: ")) ?? "Programme: PYP";
      const programme = programmeLine.replace("Programme: ", "").trim();

      return createChatCompletionResponse({
        headline: `${programme} ocean mapping brief`,
        summary: `${programme} analytical summary.`,
        briefMarkdown: `## ${programme}\nStudents compare why ocean data matters.`,
        topicTags: ["oceans", "migration"],
      });
    });

    const result = await generateDailyBriefDrafts({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate({})],
      fetchImpl: fetchMock,
      now: new Date("2026-04-03T08:00:00.000Z"),
    });

    expect(result.generatedBriefs.map((brief) => brief.programme)).toEqual([
      "MYP",
      "DP",
    ]);
    expect(result.skippedProgrammes).toEqual(["PYP"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("does not let same-day test history block production generation for the same programme", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      "goodnotes",
    );

    const connection = await createAiConnection({
      name: "NF Relay",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: TEST_AI_CONNECTION_TOKEN,
      active: true,
      isDefault: true,
      notes: "Primary runtime connection.",
    });

    const promptPolicy = await createPromptPolicy({
      name: "Family Daily Sparks Core",
      versionLabel: "v1.0.0",
      sharedInstructions: "Use clear, family-facing language.",
      antiRepetitionInstructions: "Avoid repeating recent editorial angles.",
      outputContractInstructions:
        "Return JSON with headline, summary, briefMarkdown, and topicTags.",
      pypInstructions: "Use short sentences and concrete examples.",
      mypInstructions: "Add comparisons and causes.",
      dpInstructions: "Add evidence limits and nuance.",
      notes: "Primary policy",
    });

    await createDailyBriefHistoryEntry({
      scheduledFor: "2026-04-03",
      recordKind: "test",
      headline: "Existing PYP test brief",
      summary: "Already generated for the test pipeline.",
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
      aiConnectionId: connection.id,
      aiConnectionName: connection.name,
      aiModel: connection.defaultModel,
      promptPolicyId: promptPolicy.id,
      promptVersionLabel: promptPolicy.versionLabel,
      promptVersion: promptPolicy.versionLabel,
      repetitionRisk: "low",
      repetitionNotes: "Already generated as a test record.",
      adminNotes: "",
      briefMarkdown: "## PYP\nExisting test brief",
    });

    fetchMock.mockImplementation(async (_input, init) => {
      const payload = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      const programmeLine =
        payload.messages
          .find((message) => message.role === "user")
          ?.content.split("\n")
          .find((line) => line.startsWith("Programme: ")) ?? "Programme: PYP";
      const programme = programmeLine.replace("Programme: ", "").trim();

      return createChatCompletionResponse({
        headline: `${programme} ocean mapping brief`,
        summary: `${programme} learner summary.`,
        briefMarkdown: `## ${programme}\nStudents are helping map turtle routes.`,
        topicTags: ["oceans", "science"],
      });
    });

    const result = await generateDailyBriefDrafts({
      scheduledFor: "2026-04-03",
      recordKind: "production",
      candidates: [buildCandidate()],
      fetchImpl: fetchMock,
      now: new Date("2026-04-03T08:00:00.000Z"),
    });

    expect(result.generatedBriefs.map((brief) => brief.programme)).toContain("PYP");
    expect(result.skippedProgrammes).not.toContain("PYP");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("blocks an exact published headline from being reused and reports the block reason", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      "goodnotes",
    );

    const connection = await createAiConnection({
      name: "NF Relay",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: TEST_AI_CONNECTION_TOKEN,
      active: true,
      isDefault: true,
      notes: "Primary runtime connection.",
    });

    const promptPolicy = await createPromptPolicy({
      name: "Family Daily Sparks Core",
      versionLabel: "v1.0.0",
      sharedInstructions: "Use clear, family-facing language.",
      antiRepetitionInstructions: "Avoid repeating recent editorial angles.",
      outputContractInstructions:
        "Return JSON with headline, summary, briefMarkdown, and topicTags.",
      pypInstructions: "Use short sentences and concrete examples.",
      mypInstructions: "Add comparisons and causes.",
      dpInstructions: "Add evidence limits and nuance.",
      notes: "Primary policy",
    });

    await createDailyBriefHistoryEntry({
      scheduledFor: "2026-04-03",
      headline: "Students map sea turtles",
      summary: "Already published headline.",
      programme: "PYP",
      editorialCohort: "EMEA",
      status: "published",
      topicClusterKey: "students map sea turtles",
      normalizedHeadline: "students map sea turtles",
      topicLatestPublishedAt: "2026-04-03T06:00:00.000Z",
      selectionDecision: "new",
      selectionOverrideNote: "",
      blockedTopics: [],
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
      aiConnectionId: connection.id,
      aiConnectionName: connection.name,
      aiModel: connection.defaultModel,
      promptPolicyId: promptPolicy.id,
      promptVersionLabel: promptPolicy.versionLabel,
      promptVersion: promptPolicy.versionLabel,
      repetitionRisk: "low",
      repetitionNotes: "Already shipped.",
      adminNotes: "",
      briefMarkdown: "## PYP\nExisting brief",
    });

    const result = await generateDailyBriefDrafts({
      scheduledFor: "2026-04-07",
      editorialCohort: "APAC",
      candidates: [buildCandidate({})],
      fetchImpl: fetchMock,
      now: new Date("2026-04-07T08:00:00.000Z"),
    });

    expect(result.selectedTopic).toBeNull();
    expect(result.generatedBriefs).toEqual([]);
    expect(result.selectionAudit.blockedTopics).toEqual([
      expect.objectContaining({
        policy: "exact_headline",
        headline: "Students map sea turtles",
      }),
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("allows a follow-up exception for a newer same-topic APAC story and records the override note", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      "goodnotes",
    );

    const connection = await createAiConnection({
      name: "NF Relay",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: TEST_AI_CONNECTION_TOKEN,
      active: true,
      isDefault: true,
      notes: "Primary runtime connection.",
    });

    const promptPolicy = await createPromptPolicy({
      name: "Family Daily Sparks Core",
      versionLabel: "v1.0.0",
      sharedInstructions: "Use clear, family-facing language.",
      antiRepetitionInstructions: "Avoid repeating recent editorial angles.",
      outputContractInstructions:
        "Return JSON with headline, summary, briefMarkdown, and topicTags.",
      pypInstructions: "Use short sentences and concrete examples.",
      mypInstructions: "Add comparisons and causes.",
      dpInstructions: "Add evidence limits and nuance.",
      notes: "Primary policy",
    });

    await createDailyBriefHistoryEntry({
      scheduledFor: "2026-04-04",
      headline: "Trump removes US Attorney General Pam Bondi",
      summary: "Earlier APAC edition.",
      programme: "PYP",
      editorialCohort: "APAC",
      status: "published",
      topicClusterKey: "pam bondi justice department trump",
      normalizedHeadline: "trump removes us attorney general pam bondi",
      topicLatestPublishedAt: "2026-04-04T06:00:00.000Z",
      selectionDecision: "new",
      selectionOverrideNote: "",
      blockedTopics: [],
      topicTags: ["us-politics", "justice-department"],
      sourceReferences: [
        {
          sourceId: "bbc",
          sourceName: "BBC",
          sourceDomain: "bbc.com",
          articleTitle: "Trump removes US Attorney General Pam Bondi",
          articleUrl: "https://www.bbc.com/news/world-123",
        },
      ],
      aiConnectionId: connection.id,
      aiConnectionName: connection.name,
      aiModel: connection.defaultModel,
      promptPolicyId: promptPolicy.id,
      promptVersionLabel: promptPolicy.versionLabel,
      promptVersion: promptPolicy.versionLabel,
      repetitionRisk: "low",
      repetitionNotes: "Already shipped.",
      adminNotes: "",
      briefMarkdown: "## PYP\nExisting brief",
    });

    fetchMock.mockImplementation(async (_input, init) => {
      const payload = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      const programmeLine =
        payload.messages
          .find((message) => message.role === "user")
          ?.content.split("\n")
          .find((line) => line.startsWith("Programme: ")) ?? "Programme: PYP";
      const programme = programmeLine.replace("Programme: ", "").trim();

      return createChatCompletionResponse({
        headline: `Pam Bondi ouster reshapes Justice Department oversight for ${programme}`,
        summary: `A follow-up summary for ${programme.toLowerCase()} learners.`,
        briefMarkdown: `## ${programme}\nFamilies discuss what changed after the ouster.`,
        topicTags: ["us-politics", "justice-department"],
      });
    });

    const result = await generateDailyBriefDrafts({
      scheduledFor: "2026-04-07",
      editorialCohort: "APAC",
      candidates: [
        buildCandidate({
          title: "Pam Bondi ouster reshapes Justice Department oversight",
          summary: "A newer development on the same topic.",
          normalizedTitle: "pam bondi ouster reshapes justice department oversight",
          publishedAt: "2026-04-07T06:00:00.000Z",
          url: "https://www.bbc.com/news/world-789",
          normalizedUrl: "https://www.bbc.com/news/world-789",
        }),
      ],
      fetchImpl: fetchMock,
      now: new Date("2026-04-07T08:00:00.000Z"),
    });

    expect(result.generatedBriefs).toHaveLength(3);
    expect(
      result.generatedBriefs.every(
        (brief) =>
          brief.selectionDecision === "follow_up" &&
          /follow-up/i.test(brief.selectionOverrideNote) &&
          brief.topicClusterKey === "pam bondi justice department trump",
      ),
    ).toBe(true);
    expect(result.selectionAudit.decision).toBe("follow_up");
    expect(result.selectionAudit.overrideNote).toMatch(/follow-up/i);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("rejects AI payloads that omit required non-empty output fields", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      "goodnotes",
    );
    await createAiConnection({
      name: "NF Relay",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: TEST_AI_CONNECTION_TOKEN,
      active: true,
      isDefault: true,
      notes: "Primary runtime connection.",
    });
    await createPromptPolicy({
      name: "Family Daily Sparks Core",
      versionLabel: "v1.0.0",
      sharedInstructions: "Use clear, family-facing language.",
      antiRepetitionInstructions: "Avoid repeating recent editorial angles.",
      outputContractInstructions:
        "Return JSON with headline, summary, briefMarkdown, and topicTags.",
      pypInstructions: "Use short sentences and concrete examples.",
      mypInstructions: "Add comparisons and causes.",
      dpInstructions: "Add evidence limits and nuance.",
      notes: "Primary policy",
    });

    fetchMock.mockResolvedValueOnce(
      createChatCompletionResponse({
        headline: "",
        summary: "Still has summary.",
        briefMarkdown: "## PYP\nStudents are helping map turtle routes.",
        topicTags: ["oceans"],
      }),
    );

    await expect(
      generateDailyBriefDrafts({
        scheduledFor: "2026-04-03",
        candidates: [buildCandidate({})],
        fetchImpl: fetchMock,
        now: new Date("2026-04-03T08:00:00.000Z"),
      }),
    ).rejects.toThrow(/headline/i);
  });
});
