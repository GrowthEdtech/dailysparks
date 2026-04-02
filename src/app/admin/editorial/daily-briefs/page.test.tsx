import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { listDailyBriefHistoryMock } = vi.hoisted(() => ({
  listDailyBriefHistoryMock: vi.fn(),
}));

vi.mock("../../../../lib/daily-brief-history-store", () => ({
  listDailyBriefHistory: listDailyBriefHistoryMock,
}));

import DailyBriefsAdminPage from "./page";

describe("DailyBriefsAdminPage", () => {
  beforeEach(() => {
    listDailyBriefHistoryMock.mockReset();
  });

  test("renders an honest empty state when no daily briefs exist", async () => {
    listDailyBriefHistoryMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await DailyBriefsAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("No daily briefs recorded yet");
    expect(markup).toContain("Generation history will appear here");
  });

  test("renders recorded daily briefs when history exists", async () => {
    listDailyBriefHistoryMock.mockResolvedValue([
      {
        id: "brief-1",
        scheduledFor: "2026-04-02",
        headline: "Students debate how cities should respond to rising heat.",
        summary: "A climate brief.",
        programme: "MYP",
        status: "published",
        topicTags: ["climate"],
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
        adminNotes: "",
        briefMarkdown: "## Today",
        createdAt: "2026-04-02T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
      },
    ]);

    const markup = renderToStaticMarkup(
      await DailyBriefsAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(
      "Students debate how cities should respond to rising heat.",
    );
    expect(markup).toContain("Reuters");
    expect(markup).toContain("gpt-5.4");
    expect(markup).toContain("v1.0.0");
    expect(markup).toContain("/admin/editorial/daily-briefs/brief-1");
  });
});
