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
    createdAt: "2026-04-02T00:00:00.000Z",
    updatedAt: "2026-04-02T00:00:00.000Z",
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
  });
});
