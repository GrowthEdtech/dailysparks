import { describe, expect, test, vi } from "vitest";

import { generateOpenAiCompatibleText } from "./ai-runtime";

describe("ai runtime", () => {
  test("uses the stored API key for openai-compatible connections", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "gpt-5.4",
        choices: [{ message: { content: "Hello from relay" } }],
      }),
    });

    const result = await generateOpenAiCompatibleText({
      connection: {
        id: "relay",
        name: "NF Relay",
        providerType: "openai-compatible",
        baseUrl: "https://relay.nf.video/v1",
        defaultModel: "gpt-5.4",
        apiKeyPreview: "••••••••7890",
        hasApiKey: true,
        active: true,
        isDefault: true,
        notes: "",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
        apiKey: "relay-key",
      },
      developerPrompt: "developer",
      userPrompt: "user",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.text).toBe("Hello from relay");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://relay.nf.video/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer relay-key",
        }),
      }),
    );
  });

  test("uses a Google access token for Vertex connections", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "google/gemini-3.1-pro-preview",
        choices: [{ message: { content: "Hello from Gemini" } }],
      }),
    });

    const result = await generateOpenAiCompatibleText({
      connection: {
        id: "vertex",
        name: "Vertex Gemini",
        providerType: "vertex-openai-compatible",
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
      },
      developerPrompt: "developer",
      userPrompt: "user",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getVertexAccessToken: vi.fn().mockResolvedValue("vertex-token"),
    });

    expect(result.text).toBe("Hello from Gemini");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://aiplatform.googleapis.com/v1/projects/gen-lang-client-0586185740/locations/global/endpoints/openapi/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer vertex-token",
        }),
      }),
    );
  });
});
