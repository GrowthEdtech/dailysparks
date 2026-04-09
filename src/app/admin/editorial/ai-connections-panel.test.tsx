import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import AiConnectionsPanel from "./ai-connections-panel";
import type { AiConnectionRecord } from "../../../lib/ai-connection-schema";

const initialConnections: AiConnectionRecord[] = [
  {
    id: "nf-relay",
    name: "NF Relay",
    providerType: "openai-compatible",
    baseUrl: "https://relay.nf.video/v1",
    defaultModel: "gpt-5.4",
    apiKeyPreview: "••••••••e225",
    hasApiKey: true,
    active: true,
    isDefault: true,
    notes: "Primary relay connection.",
    fallbackConnectionId: "vertex-gemini",
    lastTestStatus: "success",
    lastTestLatencyMs: 840,
    lastTestModel: "gpt-5.4",
    lastRuntimeStatus: "fallback-succeeded",
    runtimeSuccessCount: 12,
    runtimeFailureCount: 1,
    runtimeFallbackCount: 2,
    recentDailyBriefUsageCount: 6,
    recentDailyBriefLastUsedAt: "2026-04-09T08:00:00.000Z",
    createdAt: "2026-04-02T00:00:00.000Z",
    updatedAt: "2026-04-02T00:00:00.000Z",
  },
  {
    id: "vertex-gemini",
    name: "Vertex Gemini",
    providerType: "vertex-openai-compatible",
    baseUrl:
      "https://aiplatform.googleapis.com/v1/projects/gen-lang-client-0586185740/locations/global/endpoints/openapi",
    defaultModel: "google/gemini-3.1-pro-preview",
    apiKeyPreview: "",
    hasApiKey: false,
    active: true,
    isDefault: false,
    notes: "Default Gemini connection.",
    lastRuntimeStatus: "success",
    runtimeSuccessCount: 8,
    runtimeFailureCount: 0,
    runtimeFallbackCount: 0,
    recentDailyBriefUsageCount: 3,
    recentDailyBriefLastUsedAt: "2026-04-09T06:00:00.000Z",
    vertexProjectId: "gen-lang-client-0586185740",
    vertexLocation: "global",
    serviceAccountEmail:
      "automation-agent@gen-lang-client-0586185740.iam.gserviceaccount.com",
    createdAt: "2026-04-09T00:00:00.000Z",
    updatedAt: "2026-04-09T00:00:00.000Z",
  },
];

describe("AiConnectionsPanel", () => {
  test("renders the AI connections registry, defaults, and masked key preview", () => {
    const markup = renderToStaticMarkup(
      <AiConnectionsPanel initialConnections={initialConnections} />,
    );

    expect(markup).toContain("AI connections");
    expect(markup).toContain("relay.nf.video");
    expect(markup).toContain("gpt-5.4");
    expect(markup).toContain("••••••••e225");
    expect(markup).toContain("Default");
    expect(markup).toContain("Vertex AI (Google Cloud)");
    expect(markup).toContain("Google Cloud managed auth");
    expect(markup).toContain("gen-lang-client-0586185740");
    expect(markup).toContain(
      "automation-agent@gen-lang-client-0586185740.iam.gserviceaccount.com",
    );
    expect(markup).toContain("Test connection");
    expect(markup).toContain("Fallback connection");
    expect(markup).toContain("Recent Daily Brief usage");
    expect(markup).toContain("12 runtime successes");
  });
});
