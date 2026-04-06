import { describe, expect, test } from "vitest";

import { buildGeoVisibilitySummary, formatPercent } from "./geo-copilot-helpers";

describe("geo-copilot-helpers", () => {
  test("builds summary metrics from prompts, logs, and readability status", () => {
    const summary = buildGeoVisibilitySummary({
      prompts: [
        {
          id: "prompt-1",
          prompt: "Goodnotes reading brief workflow",
          intentLabel: "Goodnotes delivery workflow",
          priority: "high",
          targetProgrammes: ["MYP"],
          engineCoverage: ["chatgpt-search", "gemini"],
          fanOutHints: [],
          active: true,
          notes: "",
          createdAt: "2026-04-06T00:00:00.000Z",
          updatedAt: "2026-04-06T00:00:00.000Z",
        },
        {
          id: "prompt-2",
          prompt: "daily reading habit for IB students",
          intentLabel: "Daily IB reading habit",
          priority: "high",
          targetProgrammes: ["MYP"],
          engineCoverage: ["chatgpt-search"],
          fanOutHints: [],
          active: false,
          notes: "",
          createdAt: "2026-04-06T00:00:00.000Z",
          updatedAt: "2026-04-06T00:00:00.000Z",
        },
      ],
      logs: [
        {
          id: "log-1",
          source: "manual",
          monitoringRunId: null,
          promptId: "prompt-1",
          promptTextSnapshot: "Goodnotes reading brief workflow",
          queryVariant: "Goodnotes reading brief workflow",
          engine: "chatgpt-search",
          engineModel: "gpt-5.4",
          mentionStatus: "mentioned",
          citationUrls: [],
          shareOfModelScore: 0.6,
          citationShareScore: 0.4,
          sentiment: "positive",
          entityAccuracy: "accurate",
          responseExcerpt: "",
          notes: "",
          createdAt: "2026-04-06T01:00:00.000Z",
        },
        {
          id: "log-2",
          source: "manual",
          monitoringRunId: null,
          promptId: "prompt-2",
          promptTextSnapshot: "daily reading habit for IB students",
          queryVariant: "daily reading habit for IB students",
          engine: "chatgpt-search",
          engineModel: "gpt-5.4",
          mentionStatus: "mentioned",
          citationUrls: [],
          shareOfModelScore: 0.5,
          citationShareScore: 0.4,
          sentiment: "positive",
          entityAccuracy: "accurate",
          responseExcerpt: "",
          notes: "",
          createdAt: "2026-04-06T01:05:00.000Z",
        },
      ],
      machineReadabilityStatus: {
        llmsTxtStatus: "ready",
        llmsFullTxtStatus: "ready",
        ssrStatus: "needs-attention",
        jsonLdStatus: "ready",
        notes: "",
        lastCheckedAt: "2026-04-06T02:00:00.000Z",
        updatedAt: "2026-04-06T02:00:00.000Z",
      },
    });

    expect(summary.activePromptCount).toBe(1);
    expect(summary.readinessReadyCount).toBe(3);
    expect(formatPercent(summary.shareOfModelAverage)).toBe("55%");
    expect(summary.intentBreakdown).toEqual([
      expect.objectContaining({
        bucket: "workflow",
        promptCount: 1,
        logCount: 1,
        shareOfModelAverage: 0.6,
      }),
      expect.objectContaining({
        bucket: "habit-building",
        promptCount: 1,
        logCount: 1,
        shareOfModelAverage: 0.5,
      }),
      expect.objectContaining({
        bucket: "general",
        promptCount: 0,
        logCount: 0,
        shareOfModelAverage: 0,
      }),
    ]);
  });
});
