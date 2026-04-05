import { describe, expect, test } from "vitest";

import {
  buildManualTestRunOutcomeLabel,
  formatManualTestRunStageSummary,
  type ManualTestRunResult,
} from "./manual-test-run-summary";

function buildResult(
  overrides: Partial<ManualTestRunResult> = {},
): ManualTestRunResult {
  return {
    success: true,
    runDate: "2026-04-05",
    targetParentEmails: ["ckx.leung@gmail.com"],
    renderer: "pdf-lib",
    stages: {
      ingest: {
        status: 200,
        body: { mode: "ingest" },
      },
      deliver: {
        status: 200,
        body: {
          mode: "deliver",
          summary: {
            deliveredCount: 0,
            targetedProfileCount: 0,
          },
        },
      },
    },
    ...overrides,
  };
}

describe("manual test run summary", () => {
  test("reports manual fallback success as the final delivery outcome", () => {
    const result = buildResult({
      stages: {
        ingest: {
          status: 200,
          body: { mode: "ingest" },
        },
        deliver: {
          status: 200,
          body: {
            mode: "deliver",
            summary: {
              deliveredCount: 0,
              targetedProfileCount: 0,
            },
            manualBackfill: {
              parentEmail: "ckx.leung@gmail.com",
              renderer: "pdf-lib",
              deliveryAttemptCount: 1,
              deliverySuccessCount: 1,
              deliveryFailureCount: 0,
            },
          },
        },
      },
    });

    expect(buildManualTestRunOutcomeLabel(result)).toBe(
      "1 delivery sent via manual fallback.",
    );
    expect(formatManualTestRunStageSummary(result)).toContain(
      "Final outcome: 1 delivery sent via manual fallback.",
    );
  });

  test("reports a skipped fallback reason when no eligible brief can be resent", () => {
    const result = buildResult({
      stages: {
        ingest: {
          status: 200,
          body: { mode: "ingest" },
        },
        deliver: {
          status: 200,
          body: {
            mode: "deliver",
            summary: {
              deliveredCount: 0,
              targetedProfileCount: 0,
            },
            manualBackfill: {
              parentEmail: "ckx.leung@gmail.com",
              renderer: "pdf-lib",
              skippedReason:
                "No approved or published same-day test brief was available for fallback delivery.",
            },
          },
        },
      },
    });

    expect(buildManualTestRunOutcomeLabel(result)).toBe(
      "No delivery was sent. No approved or published same-day test brief was available for fallback delivery.",
    );
  });

  test("falls back to the normal staged-wave delivery count when no manual fallback ran", () => {
    const result = buildResult({
      stages: {
        ingest: {
          status: 200,
          body: { mode: "ingest" },
        },
        deliver: {
          status: 200,
          body: {
            mode: "deliver",
            summary: {
              deliveredCount: 2,
              targetedProfileCount: 2,
            },
          },
        },
      },
    });

    expect(buildManualTestRunOutcomeLabel(result)).toBe(
      "2 delivery sent in the staged canary wave.",
    );
  });
});
