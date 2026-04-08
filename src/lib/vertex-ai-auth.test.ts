import { describe, expect, test, vi } from "vitest";

import { getVertexAccessToken } from "./vertex-ai-auth";

const VERTEX_CONNECTION = {
  id: "vertex",
  name: "Vertex Gemini",
  providerType: "vertex-openai-compatible" as const,
  baseUrl:
    "https://aiplatform.googleapis.com/v1/projects/gen-lang-client-0586185740/locations/global/endpoints/openapi",
  defaultModel: "google/gemini-3.1-pro-preview",
  apiKeyPreview: "",
  hasApiKey: false,
  active: true,
  isDefault: true,
  notes: "",
  vertexProjectId: "gen-lang-client-0586185740",
  vertexLocation: "global",
  serviceAccountEmail:
    "automation-agent@gen-lang-client-0586185740.iam.gserviceaccount.com",
  createdAt: "2026-04-09T00:00:00.000Z",
  updatedAt: "2026-04-09T00:00:00.000Z",
};

describe("vertex ai auth", () => {
  test("uses service-account impersonation when a target principal is configured", async () => {
    const sourceClient = {
      getAccessToken: vi.fn(),
    };
    const impersonatedClient = {
      getAccessToken: vi.fn().mockResolvedValue("vertex-token"),
    };
    const buildGoogleAuth = vi.fn().mockReturnValue({
      getClient: vi.fn().mockResolvedValue(sourceClient),
    });
    const buildImpersonatedClient = vi.fn().mockReturnValue(impersonatedClient);

    const token = await getVertexAccessToken(VERTEX_CONNECTION, {
      buildGoogleAuth,
      buildImpersonatedClient,
    });

    expect(token).toBe("vertex-token");
    expect(buildImpersonatedClient).toHaveBeenCalledWith(
      sourceClient,
      VERTEX_CONNECTION.serviceAccountEmail,
    );
  });

  test("uses the ambient ADC identity when no service account override is configured", async () => {
    const directClient = {
      getAccessToken: vi.fn().mockResolvedValue({ token: "adc-token" }),
    };
    const buildGoogleAuth = vi.fn().mockReturnValue({
      getClient: vi.fn().mockResolvedValue(directClient),
    });
    const buildImpersonatedClient = vi.fn();

    const token = await getVertexAccessToken(
      {
        ...VERTEX_CONNECTION,
        serviceAccountEmail: "",
      },
      {
        buildGoogleAuth,
        buildImpersonatedClient,
      },
    );

    expect(token).toBe("adc-token");
    expect(buildImpersonatedClient).not.toHaveBeenCalled();
  });
});
