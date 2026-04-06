import { describe, expect, test } from "vitest";

import { buildGeoVisibilitySummary, formatPercent } from "./geo-copilot-helpers";

describe("geo-copilot-helpers", () => {
  test("builds summary metrics from prompts, logs, and readability status", () => {
    const summary = buildGeoVisibilitySummary({
      prompts: [
        {
          id: "prompt-1",
          prompt: "Best LED tech for commercial lighting",
          intentLabel: "Commercial comparison",
          priority: "high",
          targetProgrammes: ["MYP"],
          engineCoverage: ["chatgpt-search", "gemini"],
          fanOutHints: [],
          active: true,
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
          promptTextSnapshot: "Best LED tech for commercial lighting",
          queryVariant: "Best LED tech for commercial lighting",
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
    expect(formatPercent(summary.shareOfModelAverage)).toBe("60%");
  });
});
