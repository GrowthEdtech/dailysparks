import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { getDailyBriefHistoryEntryMock, notFoundMock } = vi.hoisted(() => ({
  getDailyBriefHistoryEntryMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("../../../../../lib/daily-brief-history-store", () => ({
  getDailyBriefHistoryEntry: getDailyBriefHistoryEntryMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import DailyBriefDetailPage from "./page";

describe("DailyBriefDetailPage", () => {
  beforeEach(() => {
    getDailyBriefHistoryEntryMock.mockReset();
    notFoundMock.mockClear();
  });

  test("renders the full daily brief detail when a record exists", async () => {
    getDailyBriefHistoryEntryMock.mockResolvedValue({
      id: "brief-1",
      scheduledFor: "2026-04-02",
      recordKind: "test",
      headline: "Students debate how cities should respond to rising heat.",
      summary: "A climate brief.",
      programme: "MYP",
      editorialCohort: "EMEA",
      status: "failed",
      topicClusterKey: "cities rising heat schools",
      normalizedHeadline:
        "students debate how cities should respond to rising heat",
      topicLatestPublishedAt: "2026-04-02T04:00:00.000Z",
      selectionDecision: "follow_up",
      selectionOverrideNote:
        "Follow-up exception approved because the cluster contains a newer development and a distinct headline.",
      blockedTopics: [
        {
          clusterKey: "trump justice department bondi",
          headline: "Trump removes US Attorney General Pam Bondi",
          policy: "exact_headline",
          reason: "An identical published headline already exists in the editorial archive.",
          existingScheduledFor: "2026-04-01",
          existingEditorialCohort: "APAC",
        },
      ],
      topicTags: ["climate", "cities"],
      sourceReferences: [
        {
          sourceId: "reuters",
          sourceName: "Reuters",
          sourceDomain: "reuters.com",
          articleTitle: "Cities test new heat protections",
          articleUrl: "https://www.reuters.com/world/example-heat-story",
        },
      ],
      aiConnectionId: "nf-relay",
      aiConnectionName: "NF Relay",
      aiModel: "gpt-5.4",
      promptPolicyId: "policy-1",
      promptVersionLabel: "v1.0.0",
      promptVersion: "v1.0.0",
      repetitionRisk: "low",
      repetitionNotes: "No similar brief.",
      adminNotes: "Shareable with families.",
      briefMarkdown: [
        "What’s happening? Cities are testing new heat protections.",
        "Why does this matter? Hotter weather can make school and travel harder for families.",
        "Picture it Imagine bus stops, classrooms, and sports fields staying cooler during a heatwave.",
        "Words to know - Heatwave: A period of unusually hot weather - Cooling centre: A safe indoor place where people can escape extreme heat",
        "Talk about it at home - What places in your community need extra cooling? - How can families stay safe when the weather becomes dangerous?",
        "Big idea Communities can protect people by planning ahead for extreme heat.",
      ].join("\n"),
      pipelineStage: "failed",
      candidateSnapshotAt: "2026-04-02T05:00:00.000Z",
      generationCompletedAt: "2026-04-02T06:00:00.000Z",
      pdfBuiltAt: "2026-04-02T06:05:00.000Z",
      deliveryWindowAt: "2026-04-02T09:00:00.000Z",
      lastDeliveryAttemptAt: "2026-04-02T09:12:00.000Z",
      deliveryAttemptCount: 2,
      deliverySuccessCount: 3,
      deliveryFailureCount: 2,
      dispatchMode: "canary",
      dispatchCanaryParentEmails: [
        "deploy-smoke@example.com",
        "family@example.com",
      ],
      targetedProfiles: [
        {
          parentId: "parent-1",
          parentEmail: "family@example.com",
          localDeliveryWindow: "9:00 AM · Europe/London",
          reason: "Selected for the current canary delivery wave.",
        },
      ],
      skippedProfiles: [
        {
          parentId: "parent-2",
          parentEmail: "skip@example.com",
          localDeliveryWindow: "9:00 AM · Europe/London",
          reason: "Skipped by canary mode for this delivery wave.",
        },
      ],
      pendingFutureProfiles: [
        {
          parentId: "parent-3",
          parentEmail: "future@example.com",
          localDeliveryWindow: "9:00 AM · America/New York",
          reason: "Pending future local delivery window.",
        },
      ],
      heldProfiles: [
        {
          parentId: "parent-4",
          parentEmail: "held@example.com",
          localDeliveryWindow: "9:00 AM · Europe/London",
          reason: "No healthy delivery channel was available for this wave.",
        },
      ],
      deliveryReceipts: [
        {
          parentId: "parent-1",
          parentEmail: "family@example.com",
          channel: "goodnotes",
          attachmentFileName:
            "2026-04-02_DailySparks_DailyBrief_MYP_cities-test-new-heat-protections.pdf",
          externalId: "smtp-message-id",
          externalUrl: null,
        },
      ],
      failedDeliveryTargets: [
        {
          parentId: "parent-1",
          parentEmail: "family@example.com",
          channel: "goodnotes",
          errorMessage: "Relay timeout.",
        },
      ],
      failureReason: "Two configured deliveries timed out during the 09:10 retry window.",
      retryEligibleUntil: "2026-04-02T09:30:00.000Z",
      createdAt: "2026-04-02T00:00:00.000Z",
      updatedAt: "2026-04-02T00:00:00.000Z",
    });

    const markup = renderToStaticMarkup(
      await DailyBriefDetailPage({
        params: Promise.resolve({ briefId: "brief-1" }),
      }),
    );

    expect(markup).toContain(
      "Students debate how cities should respond to rising heat.",
    );
    expect(markup).toContain("Shareable with families.");
    expect(markup).toContain("Cities test new heat protections");
    expect(markup).toContain("v1.0.0");
    expect(markup).toContain("Cities are testing new heat protections.");
    expect(markup).toContain("Editorial preview");
    expect(markup).toContain(
      "daily-brief-thumbnail%2Fbrief-1",
    );
    expect(markup).toContain("First-page PDF preview");
    expect(markup).toContain("Summary deck");
    expect(markup).toContain("Reading brief");
    expect(markup).toContain("What&#x27;s happening?");
    expect(markup).toContain("Words to know");
    expect(markup).toContain("Cooling centre");
    expect(markup).toContain("Talk about it at home");
    expect(markup).toContain("Big idea");
    expect(markup).toContain("Theme focus");
    expect(markup).toContain("Pipeline timeline");
    expect(markup).toContain("Dispatch review");
    expect(markup).toContain("Dispatch audience");
    expect(markup).toContain("Delivery receipts");
    expect(markup).toContain("Selection governance");
    expect(markup).toContain("Follow-up exception");
    expect(markup).toContain("Skipped by canary mode for this delivery wave.");
    expect(markup).toContain("Pending future local delivery window.");
    expect(markup).toContain("No healthy delivery channel was available for this wave.");
    expect(markup).toContain("Manual resend / backfill");
    expect(markup).toContain("Send manual resend");
    expect(markup).toContain(
      "Follow-up exception approved because the cluster contains a newer development and a distinct headline.",
    );
    expect(markup).toContain(
      "An identical published headline already exists in the editorial archive.",
    );
    expect(markup).toContain("Test run");
    expect(markup).toContain(
      "2026-04-02_DailySparks_DailyBrief_MYP_cities-test-new-heat-protections.pdf",
    );
    expect(markup).toContain("Retry eligible until");
    expect(markup).toContain(
      "Two configured deliveries timed out during the 09:10 retry window.",
    );
  });

  test("triggers the not-found flow when the brief does not exist", async () => {
    getDailyBriefHistoryEntryMock.mockResolvedValue(null);

    await expect(
      DailyBriefDetailPage({
        params: Promise.resolve({ briefId: "missing-brief" }),
      }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
