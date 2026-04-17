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
const ROUTING_VARIANTS = [
  { academicTier: "foundation", learnerPersona: "analytical" },
  { academicTier: "foundation", learnerPersona: "reflective" },
  { academicTier: "core", learnerPersona: "analytical" },
  { academicTier: "core", learnerPersona: "reflective" },
  { academicTier: "enriched", learnerPersona: "analytical" },
  { academicTier: "enriched", learnerPersona: "reflective" },
] as const;

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

async function seedProgrammeHistoryVariants(
  base: Omit<
    Parameters<typeof createDailyBriefHistoryEntry>[0],
    "academicTier" | "learnerPersona" | "headline" | "summary" | "briefMarkdown"
  > & {
    headlineBase: string;
    summaryBase: string;
    briefMarkdownBase: string;
  },
) {
  for (const variant of ROUTING_VARIANTS) {
    await createDailyBriefHistoryEntry({
      ...base,
      ...variant,
      headline: `${base.headlineBase} (${variant.academicTier}/${variant.learnerPersona})`,
      summary: base.summaryBase,
      briefMarkdown: `${base.briefMarkdownBase}\n${variant.academicTier}/${variant.learnerPersona}`,
    });
  }
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
  test("chooses one topic cluster for the day and generates briefs for every active programme in editorial scope", async () => {
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

    fetchMock.mockImplementation(async (_input, init) => {
      const payload = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      const programmeLine =
        payload.messages
          .find((message) => message.role === "user")
          ?.content.split("\n")
          .find((line) => line.startsWith("Programme: ")) ?? "Programme: MYP";
      const programme = programmeLine.replace("Programme: ", "").trim();

      return createChatCompletionResponse({
        headline: `${programme} ocean mapping brief`,
        summary: `${programme} analytical summary.`,
        briefMarkdown: `## ${programme}\nStudents compare why ocean data matters.`,
        topicTags: programme === "DP" ? ["oceans", "evidence"] : ["oceans", "migration"],
      });
    });

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
    expect([...new Set(result.generatedBriefs.map((brief) => brief.programme))]).toEqual([
      "MYP",
      "DP",
    ]);
    expect(result.generatedBriefs).toHaveLength(12);
    expect(result.generatedBriefs.every((brief) => brief.status === "draft")).toBe(
      true,
    );
    const firstMypBrief = result.generatedBriefs.find((brief) => brief.programme === "MYP");
    const firstDpBrief = result.generatedBriefs.find((brief) => brief.programme === "DP");

    expect(firstMypBrief).toMatchObject({
      aiConnectionName: "NF Relay",
      aiModel: "gpt-5.4",
      promptVersionLabel: "v1.0.0",
      sourceReferences: [
        expect.objectContaining({ sourceId: "bbc" }),
        expect.objectContaining({ sourceId: "npr" }),
      ],
    });
    expect(firstMypBrief?.resolvedPrompt).toContain(
      "Use clear, family-facing language.",
    );
    expect(firstMypBrief?.resolvedPrompt).toContain(
      "Add comparisons and causes.",
    );
    expect(firstMypBrief?.resolvedPrompt).toContain(
      "Runtime contract overlay",
    );
    expect(firstMypBrief?.resolvedPrompt).toContain(
      "Use this exact section order: What's happening? -> Why does this matter? -> Global context -> Compare or connect -> Words to know -> Inquiry question -> Notebook prompt.",
    );
    expect(firstDpBrief?.resolvedPrompt).toContain(
      "Add evidence limits and nuance.",
    );
    expect(firstDpBrief?.resolvedPrompt).toContain(
      "Use this exact section order: 3-sentence abstract -> Core issue -> Claim -> Counterpoint or evidence limit -> Why this matters for IB thinking -> Key academic term -> TOK / essay prompt -> Notebook capture.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });

  test("generates editorial-only briefs even when only one active programme has audience coverage", async () => {
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

    expect([...new Set(result.generatedBriefs.map((brief) => brief.programme))].sort()).toEqual([
      "DP",
      "MYP",
    ]);
    expect(result.generatedBriefs).toHaveLength(12);
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });

  test("adds programme-specific weekend framing to MYP and DP generation prompts", async () => {
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
        headline: `${programme} weekend brief`,
        summary: `${programme} weekend summary.`,
        briefMarkdown: `## ${programme}\nWeekend reading body.`,
        topicTags: ["weekend", "reading"],
      });
    });

    const result = await generateDailyBriefDrafts({
      scheduledFor: "2026-04-05",
      candidates: [buildCandidate()],
      fetchImpl: fetchMock,
      now: new Date("2026-04-05T08:00:00.000Z"),
    });

    const userPrompts = fetchMock.mock.calls.map(([, init]) => {
      const payload = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };

      return payload.messages.find((message) => message.role === "user")?.content ?? "";
    });

    const mypPrompt = userPrompts.find((prompt) => prompt.includes("Programme: MYP"));
    const dpPrompt = userPrompts.find((prompt) => prompt.includes("Programme: DP"));

    expect(mypPrompt).toContain("Weekend delivery mode: Vision day");
    expect(mypPrompt).toContain("global culture");
    expect(dpPrompt).toContain("Weekend delivery mode: TOK day");
    expect(dpPrompt).toContain("knowledge questions");
    expect(
      result.generatedBriefs.find((brief) => brief.programme === "MYP")?.resolvedPrompt,
    ).toContain("Vision day");
    expect(
      result.generatedBriefs.find((brief) => brief.programme === "DP")?.resolvedPrompt,
    ).toContain("TOK day");
  });

  test("biases shared weekend topic selection toward a Vision plus TOK-friendly topic", async () => {
    await createEligibleProgrammeProfile(
      "myp-family@example.com",
      "MYP",
      "goodnotes",
    );
    await createEligibleProgrammeProfile(
      "dp-family@example.com",
      "DP",
      "notion",
    );

    await createAiConnection({
      name: "NF Relay",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: TEST_AI_CONNECTION_TOKEN,
      active: true,
      isDefault: true,
      notes: "Weekend runtime connection.",
    });

    await createPromptPolicy({
      name: "Weekend Policy",
      versionLabel: "v1.0.0",
      sharedInstructions: "Use clear academic language.",
      antiRepetitionInstructions: "Keep weekend briefs distinct.",
      outputContractInstructions:
        "Return JSON with headline, summary, briefMarkdown, and topicTags.",
      pypInstructions: "Unused",
      mypInstructions: "Use inquiry structure.",
      dpInstructions: "Use TOK structure.",
      notes: "Weekend selection test.",
    });

    fetchMock.mockImplementation(async (_input, init) => {
      const payload = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      const programmeLine =
        payload.messages
          .find((message) => message.role === "user")
          ?.content.split("\n")
          .find((line) => line.startsWith("Programme: ")) ?? "Programme: MYP";
      const programme = programmeLine.replace("Programme: ", "").trim();

      return createChatCompletionResponse({
        headline: `${programme} weekend brief`,
        summary: `${programme} weekend summary.`,
        briefMarkdown:
          programme === "DP"
            ? "## DP\nWeekend TOK brief."
            : "## MYP\nWeekend bridge brief.",
        topicTags: programme === "DP" ? ["weekend", "tok"] : ["weekend", "vision"],
      });
    });

    const result = await generateDailyBriefDrafts({
      scheduledFor: "2026-04-12",
      editorialCohort: "APAC",
      recordKind: "production",
      now: new Date("2026-04-12T09:00:00.000Z"),
      fetchImpl: fetchMock,
      candidates: [
        buildCandidate(
          {
            title: "City budget update challenges local councils",
            summary:
              "A standard public policy article without a special weekend framing.",
            url: "https://www.bbc.com/news/world-999",
            normalizedUrl: "https://www.bbc.com/news/world-999",
            normalizedTitle: "city budget update challenges local councils",
          },
        ),
        buildCandidate(
          {
            title: "How should future cities use AI fairly across cultures?",
            summary:
              "A cross-disciplinary debate that combines future technology, fairness, evidence limits, and global cultural trade-offs.",
            url: "https://www.bbc.com/news/world-1000",
            normalizedUrl: "https://www.bbc.com/news/world-1000",
            normalizedTitle:
              "how should future cities use ai fairly across cultures",
          },
        ),
      ],
    });

    expect(result.selectedTopic?.headline).toBe(
      "How should future cities use AI fairly across cultures?",
    );
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

    await seedProgrammeHistoryVariants({
      scheduledFor: "2026-04-03",
      headlineBase: "Existing MYP brief",
      summaryBase: "Already generated for MYP.",
      briefMarkdownBase: "## MYP\nExisting brief",
      programme: "MYP",
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
      recordKind: "production",
      editorialCohort: "APAC",
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

    expect(result.generatedBriefs).toHaveLength(6);
    expect(result.generatedBriefs.every((brief) => brief.programme === "DP")).toBe(true);
    expect(result.skippedProgrammes).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(6);
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

    await seedProgrammeHistoryVariants({
      scheduledFor: "2026-04-03",
      headlineBase: "Existing MYP draft",
      summaryBase: "Already generated for MYP.",
      briefMarkdownBase: "## MYP\nExisting draft",
      programme: "MYP",
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
      recordKind: "production",
      editorialCohort: "APAC",
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

    expect(result.generatedBriefs).toHaveLength(6);
    expect(result.generatedBriefs.every((brief) => brief.programme === "DP")).toBe(true);
    expect(result.skippedProgrammes).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(6);
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
      headline: "Existing MYP test brief",
      summary: "Already generated for the test pipeline.",
      programme: "MYP",
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
      briefMarkdown: "## MYP\nExisting test brief",
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

    expect([...new Set(result.generatedBriefs.map((brief) => brief.programme))].sort()).toEqual([
      "DP",
      "MYP",
    ]);
    expect(result.generatedBriefs).toHaveLength(12);
    expect(result.skippedProgrammes).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });

  test("ignores routing-incomplete legacy history when deciding same-day idempotent skips", async () => {
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
      editorialCohort: "APAC",
      historyEntries: [
        {
          id: "legacy-pyp-apac",
          scheduledFor: "2026-04-03",
          recordKind: "production",
          headline: "Legacy PYP brief",
          normalizedHeadline: "legacy pyp brief",
          summary: "Legacy brief with incomplete routing metadata.",
          programme: "PYP",
          editorialCohort: "APAC",
          status: "published",
          topicClusterKey: "legacy-pyp-brief",
          topicLatestPublishedAt: null,
          selectionDecision: "new",
          selectionOverrideNote: "",
          blockedTopics: [],
          topicTags: ["legacy"],
          sourceReferences: [
            {
              sourceId: "bbc",
              sourceName: "BBC",
              sourceDomain: "bbc.com",
              articleTitle: "Legacy PYP brief",
              articleUrl: "https://www.bbc.com/news/world-123",
            },
          ],
          aiConnectionId: "legacy",
          aiConnectionName: "Legacy",
          aiModel: "gpt-5.4",
          promptPolicyId: "legacy-policy",
          promptVersionLabel: "v0.9.0",
          promptVersion: "v0.9.0",
          repetitionRisk: "low",
          repetitionNotes: "Legacy record.",
          adminNotes: "",
          briefMarkdown: "## Legacy\nOld brief.",
          pipelineStage: "published",
          candidateSnapshotAt: "2026-04-03T05:00:00.000Z",
          generationCompletedAt: "2026-04-03T06:00:00.000Z",
          pdfBuiltAt: "2026-04-03T06:05:00.000Z",
          deliveryWindowAt: "2026-04-03T01:00:00.000Z",
          lastDeliveryAttemptAt: "2026-04-03T01:10:00.000Z",
          deliveryAttemptCount: 1,
          deliverySuccessCount: 1,
          deliveryFailureCount: 0,
          deliveryReceipts: [],
          failedDeliveryTargets: [],
          failureReason: "",
          retryEligibleUntil: null,
          createdAt: "2026-04-03T06:00:00.000Z",
          updatedAt: "2026-04-03T06:10:00.000Z",
          routingKeyIncomplete: true,
        },
      ],
      candidates: [buildCandidate()],
      fetchImpl: fetchMock,
      now: new Date("2026-04-03T08:00:00.000Z"),
    });

    expect([...new Set(result.generatedBriefs.map((brief) => brief.programme))].sort()).toEqual([
      "DP",
      "MYP",
    ]);
    expect(result.generatedBriefs).toHaveLength(12);
    expect(result.skippedProgrammes).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(12);
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

    expect(result.generatedBriefs).toHaveLength(12);
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
    expect(fetchMock).toHaveBeenCalledTimes(12);
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

  test("keeps generated variants in draft/generated until preflight approves them", async () => {
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
          .find((line) => line.startsWith("Programme: ")) ?? "Programme: MYP";
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

    expect(result.generatedBriefs.length).toBeGreaterThan(0);
    expect(
      result.generatedBriefs.every(
        (brief) =>
          brief.status === "draft" &&
          brief.recommendedStatus === "draft" &&
          brief.recommendedPipelineStage === "generated" &&
          brief.academicTier !== undefined &&
          brief.learnerPersona !== undefined,
      ),
    ).toBe(true);
  });
});
