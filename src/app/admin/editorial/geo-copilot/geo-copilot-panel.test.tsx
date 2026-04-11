import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import GeoCopilotPanel from "./geo-copilot-panel";

const emptyOpsSummary = {
  latestRunId: null,
  latestRunStatus: null,
  latestRunCompletedAt: null,
  latestRunFailureRate: 0,
  alertLevel: "watch" as const,
  alertMessages: ["No GEO monitoring run has completed yet."],
  currentWindow: {
    logCount: 0,
    shareOfModelAverage: 0,
    citationShareAverage: 0,
    positiveSentimentRate: 0,
  },
  previousWindow: {
    logCount: 0,
    shareOfModelAverage: 0,
    citationShareAverage: 0,
    positiveSentimentRate: 0,
  },
  weekOverWeekShareOfModelDelta: 0,
  weekOverWeekCitationShareDelta: 0,
  engineCoverage: [],
  aioEvidence: {
    totalCount: 0,
    citedCount: 0,
    triggeredCount: 0,
    triggerRate: 0,
    citationRate: 0,
    lastObservedAt: null,
  },
};

const opsSummaryWithEngineCoverage = {
  ...emptyOpsSummary,
  engineCoverage: [
    {
      engine: "perplexity" as const,
      attemptedCount: 2,
      createdLogCount: 2,
      skippedCount: 0,
      failedCount: 0,
      failureRate: 0,
    },
    {
      engine: "google-ai-overviews" as const,
      attemptedCount: 0,
      createdLogCount: 0,
      skippedCount: 0,
      failedCount: 0,
      failureRate: 0,
    },
    {
      engine: "claude" as const,
      attemptedCount: 2,
      createdLogCount: 1,
      skippedCount: 0,
      failedCount: 1,
      failureRate: 0.5,
    },
  ],
};

describe("GeoCopilotPanel", () => {
  test("renders the four GEO modules and the audit workspace", () => {
    const markup = renderToStaticMarkup(
      <GeoCopilotPanel
        initialPrompts={[]}
        initialLogs={[]}
        initialRuns={[]}
        initialAioEvidence={[]}
        initialMachineReadabilityStatus={{
          llmsTxtStatus: "not-configured",
          llmsFullTxtStatus: "not-configured",
          ssrStatus: "needs-attention",
          jsonLdStatus: "needs-attention",
          notes: "",
          lastCheckedAt: null,
          updatedAt: "2026-04-06T00:00:00.000Z",
        }}
        initialSummary={{
          trackedPromptCount: 0,
          activePromptCount: 0,
          shareOfModelAverage: 0,
          citationShareAverage: 0,
          positiveSentimentRate: 0,
          entityAccuracyRate: 0,
          lastScanAt: null,
          readinessReadyCount: 0,
          intentBreakdown: [
            {
              bucket: "workflow",
              label: "Workflow intent",
              promptCount: 0,
              logCount: 0,
              shareOfModelAverage: 0,
              positiveSentimentRate: 0,
            },
            {
              bucket: "habit-building",
              label: "Habit-building intent",
              promptCount: 0,
              logCount: 0,
              shareOfModelAverage: 0,
              positiveSentimentRate: 0,
            },
            {
              bucket: "general",
              label: "General intent",
              promptCount: 0,
              logCount: 0,
              shareOfModelAverage: 0,
              positiveSentimentRate: 0,
            },
          ],
        }}
        initialOpsSummary={emptyOpsSummary}
      />,
    );

    expect(markup).toContain("Manage AI visibility, prompt coverage");
    expect(markup).toContain("GEO operations health");
    expect(markup).toContain("Golden prompts");
    expect(markup).toContain("Monitoring automation");
    expect(markup).toContain("Run monitoring now");
    expect(markup).toContain("Intent calibration");
    expect(markup).toContain("Workflow intent");
    expect(markup).toContain("Habit-building intent");
    expect(markup).toContain("Website-derived GEO starters");
    expect(markup).toContain("Seed website-derived prompts");
    expect(markup).toContain("Visibility logs");
    expect(markup).toContain("Google AI Overviews evidence");
    expect(markup).toContain("Machine-readability layer");
    expect(markup).toContain("Content optimization copilot");
    expect(markup).toContain("Content page structure suggestions");
    expect(markup).toContain("Rankability");
    expect(markup).toContain("Citation readiness");
    expect(markup).toContain("Bias resistance");
    expect(markup).toContain("Run GEO audit");
  });

  test("renders query-level diagnostics inside recent monitoring runs", () => {
    const markup = renderToStaticMarkup(
      <GeoCopilotPanel
        initialPrompts={[]}
        initialLogs={[]}
        initialRuns={[
          {
            id: "geo-run-1",
            source: "manual",
            status: "partial",
            activePromptCount: 1,
            expandedQueryCount: 2,
            engineAttemptCount: 2,
            createdLogCount: 1,
            skippedCount: 0,
            failedCount: 1,
            machineReadabilityReadyCount: 4,
            rankabilityScore: 0.9,
            citationReadinessScore: 1,
            biasResistanceScore: 0.95,
            notes: "One query timed out.",
            startedAt: "2026-04-11T01:00:00.000Z",
            completedAt: "2026-04-11T01:01:00.000Z",
            engineBreakdown: [],
            queryDiagnostics: [
              {
                promptId: "prompt-1",
                promptIntentLabel: "IB workflow comparison",
                queryVariant: "best IB reading workflow for parents",
                engine: "chatgpt-search",
                outcome: "success",
                mentionStatus: "recommended",
                sentiment: "positive",
                citationUrlCount: 1,
                durationMs: 1200,
                reason: "Created visibility log.",
                logId: "log-1",
              },
              {
                promptId: "prompt-1",
                promptIntentLabel: "IB workflow comparison",
                queryVariant: "Daily Sparks vs tutoring",
                engine: "chatgpt-search",
                outcome: "failed",
                mentionStatus: null,
                sentiment: null,
                citationUrlCount: 0,
                durationMs: 15000,
                reason: "chatgpt-search monitoring check timed out after 15000ms.",
                logId: null,
              },
            ],
          },
        ]}
        initialAioEvidence={[]}
        initialMachineReadabilityStatus={{
          llmsTxtStatus: "ready",
          llmsFullTxtStatus: "ready",
          ssrStatus: "ready",
          jsonLdStatus: "ready",
          notes: "",
          lastCheckedAt: "2026-04-11T01:01:00.000Z",
          updatedAt: "2026-04-11T01:01:00.000Z",
        }}
        initialSummary={{
          trackedPromptCount: 0,
          activePromptCount: 0,
          shareOfModelAverage: 0,
          citationShareAverage: 0,
          positiveSentimentRate: 0,
          entityAccuracyRate: 0,
          lastScanAt: null,
          readinessReadyCount: 4,
          intentBreakdown: [],
        }}
        initialOpsSummary={emptyOpsSummary}
      />,
    );

    expect(markup).toContain("Query diagnostics");
    expect(markup).toContain("1 success");
    expect(markup).toContain("1 failed");
    expect(markup).toContain("best IB reading workflow for parents");
    expect(markup).toContain("timed out after 15000ms");
  });

  test("renders Phase 3 engine coverage diagnostics in operations health", () => {
    const markup = renderToStaticMarkup(
      <GeoCopilotPanel
        initialPrompts={[]}
        initialLogs={[]}
        initialRuns={[]}
        initialAioEvidence={[]}
        initialMachineReadabilityStatus={{
          llmsTxtStatus: "ready",
          llmsFullTxtStatus: "ready",
          ssrStatus: "ready",
          jsonLdStatus: "ready",
          notes: "",
          lastCheckedAt: "2026-04-11T01:01:00.000Z",
          updatedAt: "2026-04-11T01:01:00.000Z",
        }}
        initialSummary={{
          trackedPromptCount: 0,
          activePromptCount: 0,
          shareOfModelAverage: 0,
          citationShareAverage: 0,
          positiveSentimentRate: 0,
          entityAccuracyRate: 0,
          lastScanAt: null,
          readinessReadyCount: 4,
          intentBreakdown: [],
        }}
        initialOpsSummary={opsSummaryWithEngineCoverage}
      />,
    );

    expect(markup).toContain("Engine coverage diagnostics");
    expect(markup).toContain("perplexity");
    expect(markup).toContain("google-ai-overviews");
    expect(markup).toContain("claude");
    expect(markup).toContain("2 checks");
    expect(markup).toContain("50% failure");
  });
});
