import { describe, expect, test, vi } from "vitest";

const { testAiConnectionMock } = vi.hoisted(() => ({
  testAiConnectionMock: vi.fn(),
}));

vi.mock("../../../../../lib/ai-connection-store", () => ({
  testAiConnection: testAiConnectionMock,
}));

import { POST } from "./route";

describe("AI connection test route", () => {
  test("rejects unauthenticated requests", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/admin/ai-connections/test", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/editorial admin/i);
  });

  test("runs an AI connection health check for authenticated admins", async () => {
    const { POST: login } = await import("../../login/route");
    process.env.DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD = "open-sesame";
    process.env.DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET =
      "test-editorial-admin-session-secret";

    const loginResponse = await login(
      new Request("http://localhost:3000/api/admin/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ password: "open-sesame" }),
      }),
    );
    const cookie = loginResponse.headers.get("set-cookie") ?? "";

    testAiConnectionMock.mockResolvedValueOnce({
      connection: {
        id: "vertex-gemini",
        name: "Vertex Gemini",
      },
      status: "success",
      model: "google/gemini-3.1-pro-preview",
      latencyMs: 642,
      textPreview: "Daily Sparks appears as a useful recommendation.",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/admin/ai-connections/test", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: "vertex-gemini",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.status).toBe("success");
    expect(body.result.model).toBe("google/gemini-3.1-pro-preview");
    expect(body.result.latencyMs).toBe(642);
    expect(testAiConnectionMock).toHaveBeenCalledWith(
      "vertex-gemini",
      expect.any(Object),
    );
  });
});
