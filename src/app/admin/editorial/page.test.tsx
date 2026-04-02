import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  cookiesMock,
  redirectMock,
  getEditorialAdminSessionFromCookieStoreMock,
  listEditorialSourcesMock,
  listAiConnectionsMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  getEditorialAdminSessionFromCookieStoreMock: vi.fn(),
  listEditorialSourcesMock: vi.fn(),
  listAiConnectionsMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("../../../lib/editorial-admin-auth", () => ({
  getEditorialAdminSessionFromCookieStore:
    getEditorialAdminSessionFromCookieStoreMock,
}));

vi.mock("../../../lib/editorial-source-store", () => ({
  listEditorialSources: listEditorialSourcesMock,
}));

vi.mock("../../../lib/ai-connection-store", () => ({
  listAiConnections: listAiConnectionsMock,
}));

vi.mock("./editorial-admin-panel", () => ({
  default: ({
    initialSources,
  }: {
    initialSources: Array<{ name: string }>;
  }) => <div>Editorial panel {initialSources.length}</div>,
}));

vi.mock("./ai-connections-panel", () => ({
  default: ({
    initialConnections,
  }: {
    initialConnections: Array<{ name: string }>;
  }) => <div>AI panel {initialConnections.length}</div>,
}));

vi.mock("./admin-logout-button", () => ({
  default: () => <div>Admin logout</div>,
}));

import EditorialAdminPage from "./page";

describe("EditorialAdminPage", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    redirectMock.mockClear();
    getEditorialAdminSessionFromCookieStoreMock.mockReset();
    listEditorialSourcesMock.mockReset();
    listAiConnectionsMock.mockReset();
    cookiesMock.mockResolvedValue({
      get: vi.fn(),
    });
  });

  test("redirects unauthenticated admins to /admin/login", async () => {
    getEditorialAdminSessionFromCookieStoreMock.mockResolvedValue(null);

    await expect(EditorialAdminPage()).rejects.toThrow("REDIRECT:/admin/login");
  });

  test("renders the editorial panel for an authenticated admin session", async () => {
    getEditorialAdminSessionFromCookieStoreMock.mockResolvedValue({
      role: "editorial-admin",
    });
    listEditorialSourcesMock.mockResolvedValue([
      { id: "reuters", name: "Reuters" },
    ]);
    listAiConnectionsMock.mockResolvedValue([
      { id: "nf-relay", name: "NF Relay" },
    ]);

    const markup = renderToStaticMarkup(await EditorialAdminPage());

    expect(markup).toContain("Editorial panel 1");
    expect(markup).toContain("AI panel 1");
  });
});
