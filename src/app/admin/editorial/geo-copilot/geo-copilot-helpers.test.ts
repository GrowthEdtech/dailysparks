import { describe, expect, test } from "vitest";

import {
  buildGeoOpsSummary,
  buildGeoVisibilitySummary,
  formatPercent,
} from "./geo-copilot-helpers";

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

  test("builds an operations summary with engine trend and AIO evidence coverage", () => {
    const currentRun = {
      id: "run-current",
      source: "scheduled" as const,
      status: "completed" as const,
      activePromptCount: 2,
      expandedQueryCount: 2,
      engineAttemptCount: 4,
      createdLogCount: 4,
      skippedCount: 0,
      failedCount: 0,
      machineReadabilityReadyCount: 4,
      rankabilityScore: 0.8,
      citationReadinessScore: 0.75,
      biasResistanceScore: 0.9,
      notes: "Active GEO monitoring engines: chatgpt-search, gemini.",
      startedAt: "2026-04-11T00:00:00.000Z",
      completedAt: "2026-04-11T00:04:00.000Z",
      engineBreakdown: [
        {
          engine: "chatgpt-search" as const,
          attemptedCount: 2,
          createdLogCount: 2,
          skippedCount: 0,
          failedCount: 0,
        },
        {
          engine: "gemini" as const,
          attemptedCount: 2,
          createdLogCount: 2,
          skippedCount: 0,
          failedCount: 0,
        },
      ],
      queryDiagnostics: [],
    };
    const previousRun = {
      ...currentRun,
      id: "run-previous",
      completedAt: "2026-04-04T00:04:00.000Z",
      createdLogCount: 2,
      engineBreakdown: [
        {
          engine: "chatgpt-search" as const,
          attemptedCount: 2,
          createdLogCount: 2,
          skippedCount: 0,
          failedCount: 0,
        },
      ],
    };
    const logs = [
      {
        id: "log-current",
        source: "scheduled" as const,
        monitoringRunId: "run-current",
        promptId: "prompt-1",
        promptTextSnapshot: "IB reading workflow",
        queryVariant: "IB reading workflow",
        engine: "gemini" as const,
        engineModel: "google/gemini-3.1-pro-preview",
        mentionStatus: "recommended" as const,
        citationUrls: ["https://dailysparks.geledtech.com/"],
        shareOfModelScore: 0.8,
        citationShareScore: 0.8,
        sentiment: "positive" as const,
        entityAccuracy: "accurate" as const,
        responseExcerpt: "Daily Sparks is recommended.",
        notes: "",
        createdAt: "2026-04-11T00:04:00.000Z",
      },
      {
        id: "log-previous",
        source: "scheduled" as const,
        monitoringRunId: "run-previous",
        promptId: "prompt-1",
        promptTextSnapshot: "IB reading workflow",
        queryVariant: "IB reading workflow",
        engine: "chatgpt-search" as const,
        engineModel: "gpt-5.4",
        mentionStatus: "mentioned" as const,
        citationUrls: [],
        shareOfModelScore: 0.4,
        citationShareScore: 0,
        sentiment: "neutral" as const,
        entityAccuracy: "accurate" as const,
        responseExcerpt: "Daily Sparks is mentioned.",
        notes: "",
        createdAt: "2026-04-04T00:04:00.000Z",
      },
    ];
    const opsSummary = buildGeoOpsSummary({
      runs: [currentRun, previousRun],
      logs,
      aioEvidence: [
        {
          id: "aio-1",
          promptId: "prompt-1",
          promptTextSnapshot: "IB reading workflow",
          queryVariant: "IB reading workflow",
          aiOverviewStatus: "cited" as const,
          citationUrls: ["https://dailysparks.geledtech.com/"],
          dailySparksCited: true,
          evidenceUrl: "",
          screenshotUrl: "",
          observedAt: "2026-04-11T00:04:00.000Z",
          notes: "",
          createdAt: "2026-04-11T00:04:00.000Z",
        },
      ],
      now: new Date("2026-04-11T12:00:00.000Z"),
    });

    expect(opsSummary.latestRunStatus).toBe("completed");
    expect(opsSummary.alertLevel).toBe("healthy");
    expect(opsSummary.currentWindow.shareOfModelAverage).toBe(0.8);
    expect(opsSummary.previousWindow.shareOfModelAverage).toBe(0.4);
    expect(opsSummary.weekOverWeekShareOfModelDelta).toBeCloseTo(0.4);
    expect(opsSummary.engineCoverage.map((engine) => engine.engine)).toEqual([
      "chatgpt-search",
      "google-ai-overviews",
      "gemini",
    ]);
    expect(opsSummary.aioEvidence.citedCount).toBe(1);
  });
});
