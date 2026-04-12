import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  getEditorialAdminSessionFromRequestMock,
  clearEditorialAdminSessionCookieHeaderMock,
  runOperationsHealthWorkflowMock,
  afterMock,
  readOperationsHealthDashboardDataMock,
} = vi.hoisted(() => ({
  getEditorialAdminSessionFromRequestMock: vi.fn(),
  clearEditorialAdminSessionCookieHeaderMock: vi.fn(),
  runOperationsHealthWorkflowMock: vi.fn(),
  afterMock: vi.fn(),
  readOperationsHealthDashboardDataMock: vi.fn(),
}));

vi.mock("../../../../../lib/editorial-admin-auth", () => ({
  getEditorialAdminSessionFromRequest: getEditorialAdminSessionFromRequestMock,
  clearEditorialAdminSessionCookieHeader:
    clearEditorialAdminSessionCookieHeaderMock,
}));

vi.mock("../../../../../lib/operations-health-runner", () => ({
  runOperationsHealthWorkflow: runOperationsHealthWorkflowMock,
}));

vi.mock("next/server", () => ({
  after: afterMock,
}));

vi.mock("../../../../../lib/operations-health-dashboard-data", () => ({
  readOperationsHealthDashboardData: readOperationsHealthDashboardDataMock,
}));

import * as operationsHealthRunRoute from "./route";

describe("POST /api/admin/operations-health/run", () => {
  beforeEach(() => {
    getEditorialAdminSessionFromRequestMock.mockReset();
    clearEditorialAdminSessionCookieHeaderMock.mockReset();
    runOperationsHealthWorkflowMock.mockReset();
    afterMock.mockReset();
    readOperationsHealthDashboardDataMock.mockReset();

    clearEditorialAdminSessionCookieHeaderMock.mockReturnValue(
      "editorial-admin=; Path=/; Max-Age=0",
    );
  });

  test("rejects requests without an editorial admin session", async () => {
    getEditorialAdminSessionFromRequestMock.mockResolvedValue(null);

    const response = await operationsHealthRunRoute.POST(
      new Request("http://localhost:3000/api/admin/operations-health/run", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });

  test("queues a manual operations-health check for authenticated admins", async () => {
    getEditorialAdminSessionFromRequestMock.mockResolvedValue({
      email: "admin@geledtech.com",
    });
    runOperationsHealthWorkflowMock.mockResolvedValue({
      run: {
        id: "run-1",
        status: "healthy",
        alerts: [],
        remediationActions: [],
      },
      snapshot: {
        status: "healthy",
        alerts: [],
      },
    });

    const response = await operationsHealthRunRoute.POST(
      new Request("http://localhost:3000/api/admin/operations-health/run", {
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
      source: "manual",
    });
  });

  test("returns the latest snapshot and runs for polling authenticated admins", async () => {
    getEditorialAdminSessionFromRequestMock.mockResolvedValue({
      email: "admin@geledtech.com",
    });
    readOperationsHealthDashboardDataMock.mockResolvedValue({
      snapshot: {
        status: "warning",
        alerts: [{ title: "GEO timeout" }],
      },
      runs: [
        {
          id: "run-2",
          completedAt: "2026-04-12T03:27:30.000Z",
        },
      ],
    });

    expect(typeof operationsHealthRunRoute.GET).toBe("function");

    const response = await operationsHealthRunRoute.GET(
      new Request("http://localhost:3000/api/admin/operations-health/run", {
        method: "GET",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("operations-health-snapshot");
    expect(body.snapshot.status).toBe("warning");
    expect(body.runs[0].id).toBe("run-2");
    expect(readOperationsHealthDashboardDataMock).toHaveBeenCalledTimes(1);
  });
});
