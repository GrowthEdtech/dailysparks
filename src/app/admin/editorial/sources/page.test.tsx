import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { listEditorialSourcesMock } = vi.hoisted(() => ({
  listEditorialSourcesMock: vi.fn(),
}));

vi.mock("../../../../lib/editorial-source-store", () => ({
  listEditorialSources: listEditorialSourcesMock,
}));

vi.mock("../editorial-admin-panel", () => ({
  default: ({
    initialSources,
  }: {
    initialSources: Array<{ name: string }>;
  }) => <div>Editorial panel {initialSources.length}</div>,
}));

import EditorialSourcesAdminPage from "./page";

describe("EditorialSourcesAdminPage", () => {
  beforeEach(() => {
    listEditorialSourcesMock.mockReset();
  });

  test("renders the editorial sources panel with fetched sources", async () => {
    listEditorialSourcesMock.mockResolvedValue([
      { id: "reuters", name: "Reuters" },
    ]);

    const markup = renderToStaticMarkup(await EditorialSourcesAdminPage());

    expect(markup).toContain("Editorial panel 1");
  });
});
