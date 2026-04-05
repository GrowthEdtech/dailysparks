import { describe, expect, test } from "vitest";

import { renderDailyBriefThumbnailPng } from "./daily-brief-thumbnail";

describe("renderDailyBriefThumbnailPng", () => {
  test("renders the first page of a daily brief into a png buffer", async () => {
    const pngBuffer = await renderDailyBriefThumbnailPng({
      id: "brief-1",
      scheduledFor: "2026-04-10",
      recordKind: "production",
      headline: "Students study coral reef protection",
      normalizedHeadline: "students study coral reef protection",
      summary:
        "Families explore how reefs support ocean life and why protection matters.",
      programme: "PYP",
      editorialCohort: "APAC",
      status: "published",
      topicClusterKey: "students study coral reef protection",
      topicLatestPublishedAt: null,
      selectionDecision: "new",
      selectionOverrideNote: "",
      blockedTopics: [],
      topicTags: ["oceans", "science"],
      sourceReferences: [
        {
          sourceId: "bbc",
          sourceName: "BBC",
          sourceDomain: "bbc.com",
          articleTitle: "Students study coral reef protection",
          articleUrl: "https://www.bbc.com/news/world-123",
        },
      ],
      aiConnectionId: "nf-relay",
      aiConnectionName: "NF Relay",
      aiModel: "gpt-5.4",
      promptPolicyId: "policy-1",
      promptVersionLabel: "v1.1.1",
      promptVersion: "v1.1.1",
      repetitionRisk: "low",
      repetitionNotes: "No recent overlap.",
      adminNotes: "",
      briefMarkdown:
        "## Today\nStudents explore how coral reefs are protected.\n\nThey discuss what communities can do next.",
      pipelineStage: "published",
      candidateSnapshotAt: "2026-04-10T05:00:00.000Z",
      generationCompletedAt: "2026-04-10T06:00:00.000Z",
      pdfBuiltAt: "2026-04-10T06:05:00.000Z",
      deliveryWindowAt: "2026-04-10T01:00:00.000Z",
      lastDeliveryAttemptAt: "2026-04-10T01:00:00.000Z",
      deliveryAttemptCount: 1,
      deliverySuccessCount: 1,
      deliveryFailureCount: 0,
      dispatchMode: "all",
      dispatchCanaryParentEmails: [],
      targetedProfiles: [],
      skippedProfiles: [],
      pendingFutureProfiles: [],
      heldProfiles: [],
      deliveryReceipts: [],
      failedDeliveryTargets: [],
      failureReason: "",
      retryEligibleUntil: null,
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z",
    });

    expect(pngBuffer.length).toBeGreaterThan(1_000);
    expect(Array.from(pngBuffer.subarray(0, 8))).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });
});
