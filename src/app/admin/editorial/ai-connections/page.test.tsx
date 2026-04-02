import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { listAiConnectionsMock } = vi.hoisted(() => ({
  listAiConnectionsMock: vi.fn(),
}));

vi.mock("../../../../lib/ai-connection-store", () => ({
  listAiConnections: listAiConnectionsMock,
}));

vi.mock("../ai-connections-panel", () => ({
  default: ({
    initialConnections,
  }: {
    initialConnections: Array<{ name: string }>;
  }) => <div>AI panel {initialConnections.length}</div>,
}));

import EditorialAiConnectionsPage from "./page";

describe("EditorialAiConnectionsPage", () => {
  beforeEach(() => {
    listAiConnectionsMock.mockReset();
  });

  test("renders the AI connections panel with fetched connections", async () => {
    listAiConnectionsMock.mockResolvedValue([
      { id: "nf-relay", name: "NF Relay" },
    ]);

    const markup = renderToStaticMarkup(await EditorialAiConnectionsPage());

    expect(markup).toContain("AI panel 1");
  });
});
