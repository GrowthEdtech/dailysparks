import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  hasValidDailyBriefSchedulerSecretMock,
  isDailyBriefSchedulerConfiguredMock,
  getDailyBriefSchedulerHeaderNameMock,
  runOperationsHealthWorkflowMock,
} = vi.hoisted(() => ({
  hasValidDailyBriefSchedulerSecretMock: vi.fn(),
  isDailyBriefSchedulerConfiguredMock: vi.fn(),
  getDailyBriefSchedulerHeaderNameMock: vi.fn(),
  runOperationsHealthWorkflowMock: vi.fn(),
}));

vi.mock("../../../../../lib/daily-brief-run-auth", () => ({
  hasValidDailyBriefSchedulerSecret: hasValidDailyBriefSchedulerSecretMock,
  isDailyBriefSchedulerConfigured: isDailyBriefSchedulerConfiguredMock,
  getDailyBriefSchedulerHeaderName: getDailyBriefSchedulerHeaderNameMock,
}));

vi.mock("../../../../../lib/operations-health-runner", () => ({
  runOperationsHealthWorkflow: runOperationsHealthWorkflowMock,
}));

import { POST } from "./route";

describe("POST /api/internal/operations-health/run", () => {
  beforeEach(() => {
    hasValidDailyBriefSchedulerSecretMock.mockReset();
    isDailyBriefSchedulerConfiguredMock.mockReset();
    getDailyBriefSchedulerHeaderNameMock.mockReset();
    runOperationsHealthWorkflowMock.mockReset();

    isDailyBriefSchedulerConfiguredMock.mockReturnValue(true);
    hasValidDailyBriefSchedulerSecretMock.mockReturnValue(true);
    getDailyBriefSchedulerHeaderNameMock.mockReturnValue(
      "x-daily-sparks-scheduler-secret",
    );
  });

  test("rejects unauthorized requests", async () => {
    hasValidDailyBriefSchedulerSecretMock.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost:3000/api/internal/operations-health/run", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });

  test("returns the operations-health run result when authorized", async () => {
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

    const response = await POST(
      new Request("http://localhost:3000/api/internal/operations-health/run", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("operations-health");
    expect(body.run.id).toBe("run-1");
    expect(body.summary.status).toBe("warning");
    expect(runOperationsHealthWorkflowMock).toHaveBeenCalledWith({
      source: "scheduled",
    });
  });
});
