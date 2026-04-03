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
      headline: "Students debate how cities should respond to rising heat.",
      summary: "A climate brief.",
      programme: "MYP",
      status: "failed",
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
      briefMarkdown: "## Today\nCities are testing new heat protections.",
      pipelineStage: "failed",
      candidateSnapshotAt: "2026-04-02T05:00:00.000Z",
      generationCompletedAt: "2026-04-02T06:00:00.000Z",
      pdfBuiltAt: "2026-04-02T06:05:00.000Z",
      deliveryWindowAt: "2026-04-02T09:00:00.000Z",
      lastDeliveryAttemptAt: "2026-04-02T09:12:00.000Z",
      deliveryAttemptCount: 2,
      deliverySuccessCount: 3,
      deliveryFailureCount: 2,
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
    expect(markup).toContain("## Today");
    expect(markup).toContain("Pipeline timeline");
    expect(markup).toContain("Delivery health");
    expect(markup).toContain("Delivery receipts");
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
