import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  hasValidDailyBriefSchedulerSecretMock,
  isDailyBriefSchedulerConfiguredMock,
  getDailyBriefSchedulerHeaderNameMock,
  runOperationsHealthWorkflowMock,
  afterMock,
} = vi.hoisted(() => ({
  hasValidDailyBriefSchedulerSecretMock: vi.fn(),
  isDailyBriefSchedulerConfiguredMock: vi.fn(),
  getDailyBriefSchedulerHeaderNameMock: vi.fn(),
  runOperationsHealthWorkflowMock: vi.fn(),
  afterMock: vi.fn(),
}));

vi.mock("../../../../../lib/daily-brief-run-auth", () => ({
  hasValidDailyBriefSchedulerSecret: hasValidDailyBriefSchedulerSecretMock,
  isDailyBriefSchedulerConfigured: isDailyBriefSchedulerConfiguredMock,
  getDailyBriefSchedulerHeaderName: getDailyBriefSchedulerHeaderNameMock,
}));

vi.mock("../../../../../lib/operations-health-runner", () => ({
  runOperationsHealthWorkflow: runOperationsHealthWorkflowMock,
}));

vi.mock("next/server", () => ({
  after: afterMock,
}));

import * as operationsHealthRunRoute from "./route";

describe("POST /api/internal/operations-health/run", () => {
  beforeEach(() => {
    hasValidDailyBriefSchedulerSecretMock.mockReset();
    isDailyBriefSchedulerConfiguredMock.mockReset();
    getDailyBriefSchedulerHeaderNameMock.mockReset();
    runOperationsHealthWorkflowMock.mockReset();
    afterMock.mockReset();

    isDailyBriefSchedulerConfiguredMock.mockReturnValue(true);
    hasValidDailyBriefSchedulerSecretMock.mockReturnValue(true);
    getDailyBriefSchedulerHeaderNameMock.mockReturnValue(
      "x-daily-sparks-scheduler-secret",
    );
  });

  test("rejects unauthorized requests", async () => {
    hasValidDailyBriefSchedulerSecretMock.mockReturnValue(false);

    const response = await operationsHealthRunRoute.POST(
      new Request("http://localhost:3000/api/internal/operations-health/run", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });

  test("queues the operations-health run when authorized", async () => {
    runOperationsHealthWorkflowMock.mockResolvedValue({
      run: {
        id: "run-1",
        status: "warning",
        alerts: [],
        remediationActions: [],
      },
      snapshot: {
        status: "warning",
        alerts: [],
      },
    });

    const response = await operationsHealthRunRoute.POST(
      new Request("http://localhost:3000/api/internal/operations-health/run", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.mode).toBe("operations-health-async");
    expect(body.message).toMatch(/queued/i);
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(runOperationsHealthWorkflowMock).not.toHaveBeenCalled();

    await afterMock.mock.calls[0]?.[0]();

    expect(runOperationsHealthWorkflowMock).toHaveBeenCalledWith({
      source: "scheduled",
    });
  });

  test("logs background failures clearly", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const backgroundError = new Error("workflow failed");
    runOperationsHealthWorkflowMock.mockRejectedValue(backgroundError);

    const response = await operationsHealthRunRoute.POST(
      new Request("http://localhost:3000/api/internal/operations-health/run", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(202);
    expect(afterMock).toHaveBeenCalledTimes(1);

    await afterMock.mock.calls[0]?.[0]();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Background scheduled operations health run failed.",
      backgroundError,
    );

    consoleErrorSpy.mockRestore();
  });
});
