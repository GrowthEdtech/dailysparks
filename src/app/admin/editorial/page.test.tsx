import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  cookiesMock,
  redirectMock,
  getEditorialAdminSessionFromCookieStoreMock,
  listEditorialSourcesMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  getEditorialAdminSessionFromCookieStoreMock: vi.fn(),
  listEditorialSourcesMock: vi.fn(),
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

vi.mock("./editorial-admin-panel", () => ({
  default: ({
    initialSources,
  }: {
    initialSources: Array<{ name: string }>;
  }) => <div>Editorial panel {initialSources.length}</div>,
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

    const markup = renderToStaticMarkup(await EditorialAdminPage());

    expect(markup).toContain("Editorial panel 1");
  });
});
