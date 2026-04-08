import { describe, expect, test, vi } from "vitest";

const { runScheduledNotebookWeeklyRecapDeliveryMock } = vi.hoisted(() => ({
  runScheduledNotebookWeeklyRecapDeliveryMock: vi.fn(),
}));

vi.mock("../../../../../../lib/daily-brief-notebook-weekly-recap-delivery", () => ({
  runScheduledNotebookWeeklyRecapDelivery: runScheduledNotebookWeeklyRecapDeliveryMock,
}));

import { POST } from "./route";

const ORIGINAL_ENV = { ...process.env };

describe("internal weekly recap delivery route", () => {
  test("rejects requests without scheduler auth", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      DAILY_SPARKS_SCHEDULER_SECRET: "scheduler-secret",
    };

    const response = await POST(
      new Request("http://localhost:3000/api/internal/notebook/weekly-recap/run", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/scheduler/i);
  });

  test("runs scheduled recap delivery for authorized scheduler requests", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      DAILY_SPARKS_SCHEDULER_SECRET: "scheduler-secret",
    };
    runScheduledNotebookWeeklyRecapDeliveryMock.mockResolvedValueOnce({
      asOf: "2026-04-12T10:00:00.000Z",
      checkedCount: 4,
      generatedCount: 3,
      skippedNoEntriesCount: 1,
      notionSyncedCount: 2,
      emailSentCount: 3,
      emailSkippedCount: 0,
      failedCount: 0,
      results: [],
    });

    const response = await POST(
      new Request("http://localhost:3000/api/internal/notebook/weekly-recap/run", {
        method: "POST",
        headers: {
          "x-daily-sparks-scheduler-secret": "scheduler-secret",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("weekly-recap-delivery");
    expect(body.summary.generatedCount).toBe(3);
    expect(body.summary.emailSentCount).toBe(3);
  });
});
