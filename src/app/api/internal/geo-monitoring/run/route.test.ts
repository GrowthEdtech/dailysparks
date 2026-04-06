import { describe, expect, test, vi } from "vitest";

const { runGeoMonitoringMock } = vi.hoisted(() => ({
  runGeoMonitoringMock: vi.fn(),
}));

vi.mock("../../../../../lib/geo-monitoring", () => ({
  runGeoMonitoring: runGeoMonitoringMock,
}));

import { POST } from "./route";

const ORIGINAL_ENV = { ...process.env };

describe("internal geo monitoring route", () => {
  test("rejects requests without scheduler auth", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      DAILY_SPARKS_SCHEDULER_SECRET: "scheduler-secret",
    };

    const response = await POST(
      new Request("http://localhost:3000/api/internal/geo-monitoring/run", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/scheduler/i);
  });

  test("runs the GEO monitor for authorized scheduler requests", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      DAILY_SPARKS_SCHEDULER_SECRET: "scheduler-secret",
    };
    runGeoMonitoringMock.mockResolvedValueOnce({
      run: {
        id: "run-1",
        status: "completed",
      },
      logs: [{ id: "log-1" }],
      machineReadabilityStatus: {
        llmsTxtStatus: "ready",
        llmsFullTxtStatus: "ready",
        ssrStatus: "ready",
        jsonLdStatus: "ready",
        notes: "",
        lastCheckedAt: "2026-04-06T08:15:00.000Z",
        updatedAt: "2026-04-06T08:15:00.000Z",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/internal/geo-monitoring/run", {
        method: "POST",
        headers: {
          "x-daily-sparks-scheduler-secret": "scheduler-secret",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("geo-monitoring");
    expect(body.run.id).toBe("run-1");
    expect(body.summary.logCreatedCount).toBe(1);
  });
});
