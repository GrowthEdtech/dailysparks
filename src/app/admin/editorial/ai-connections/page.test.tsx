import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { listAiConnectionsWithOpsSummaryMock } = vi.hoisted(() => ({
  listAiConnectionsWithOpsSummaryMock: vi.fn(),
}));

vi.mock("../../../../lib/ai-connection-store", () => ({
  listAiConnectionsWithOpsSummary: listAiConnectionsWithOpsSummaryMock,
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
    listAiConnectionsWithOpsSummaryMock.mockReset();
  });

  test("renders the AI connections panel with fetched connections", async () => {
    listAiConnectionsWithOpsSummaryMock.mockResolvedValue([
      { id: "nf-relay", name: "NF Relay" },
    ]);

    const markup = renderToStaticMarkup(await EditorialAiConnectionsPage());

    expect(markup).toContain("AI panel 1");
  });
});
