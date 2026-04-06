import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  getEditorialAdminSessionFromRequestMock,
  clearEditorialAdminSessionCookieHeaderMock,
  runOperationsHealthWorkflowMock,
} = vi.hoisted(() => ({
  getEditorialAdminSessionFromRequestMock: vi.fn(),
  clearEditorialAdminSessionCookieHeaderMock: vi.fn(),
  runOperationsHealthWorkflowMock: vi.fn(),
}));

vi.mock("../../../../../lib/editorial-admin-auth", () => ({
  getEditorialAdminSessionFromRequest: getEditorialAdminSessionFromRequestMock,
  clearEditorialAdminSessionCookieHeader:
    clearEditorialAdminSessionCookieHeaderMock,
}));

vi.mock("../../../../../lib/operations-health-runner", () => ({
  runOperationsHealthWorkflow: runOperationsHealthWorkflowMock,
}));

import { POST } from "./route";

describe("POST /api/admin/operations-health/run", () => {
  beforeEach(() => {
    getEditorialAdminSessionFromRequestMock.mockReset();
    clearEditorialAdminSessionCookieHeaderMock.mockReset();
    runOperationsHealthWorkflowMock.mockReset();

    clearEditorialAdminSessionCookieHeaderMock.mockReturnValue(
      "editorial-admin=; Path=/; Max-Age=0",
    );
  });

  test("rejects requests without an editorial admin session", async () => {
    getEditorialAdminSessionFromRequestMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/admin/operations-health/run", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });

  test("runs a manual operations-health check for authenticated admins", async () => {
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

    const response = await POST(
      new Request("http://localhost:3000/api/admin/operations-health/run", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("operations-health");
    expect(body.run.id).toBe("run-1");
    expect(runOperationsHealthWorkflowMock).toHaveBeenCalledWith({
      source: "manual",
    });
  });
});
