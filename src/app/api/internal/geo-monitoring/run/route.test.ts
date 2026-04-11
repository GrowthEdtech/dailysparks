import { describe, expect, test, vi } from "vitest";

const {
  runGeoMonitoringMock,
  createGeoMonitoringRunMock,
  updateGeoMonitoringRunMock,
  afterMock,
} = vi.hoisted(() => ({
  runGeoMonitoringMock: vi.fn(),
  createGeoMonitoringRunMock: vi.fn(),
  updateGeoMonitoringRunMock: vi.fn(),
  afterMock: vi.fn(),
}));

vi.mock("../../../../../lib/geo-monitoring", () => ({
  runGeoMonitoring: runGeoMonitoringMock,
}));

vi.mock("../../../../../lib/geo-monitoring-run-store", () => ({
  createGeoMonitoringRun: createGeoMonitoringRunMock,
  updateGeoMonitoringRun: updateGeoMonitoringRunMock,
}));

vi.mock("next/server", () => ({
  after: afterMock,
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

  test("queues the GEO monitor for authorized scheduler requests", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      DAILY_SPARKS_SCHEDULER_SECRET: "scheduler-secret",
    };
    createGeoMonitoringRunMock.mockImplementationOnce(async (input) => ({
      ...input,
      id: "scheduled-run-1",
      status: "running",
      queryDiagnostics: [],
    }));
    runGeoMonitoringMock.mockResolvedValueOnce({
      run: {
        id: "scheduled-run-1",
        status: "completed",
        createdLogCount: 1,
        machineReadabilityReadyCount: 4,
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

    expect(response.status).toBe(202);
    expect(body.mode).toBe("geo-monitoring-async");
    expect(body.run.id).toBe("scheduled-run-1");
    expect(body.run.status).toBe("running");
    expect(body.summary.runStatus).toBe("running");
    expect(body.summary.logCreatedCount).toBe(0);
    expect(afterMock).toHaveBeenCalledTimes(1);

    await afterMock.mock.calls[0]?.[0]();

    expect(runGeoMonitoringMock).toHaveBeenCalledWith({
      source: "scheduled",
      runId: "scheduled-run-1",
      persistMode: "update",
    });
  });
});
