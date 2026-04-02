import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  cookiesMock,
  redirectMock,
  getEditorialAdminSessionFromCookieStoreMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  getEditorialAdminSessionFromCookieStoreMock: vi.fn(),
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

vi.mock("./admin-logout-button", () => ({
  default: () => <div>Admin logout</div>,
}));

vi.mock("./editorial-admin-tabs", () => ({
  default: () => <div>Sources AI Connections Prompt Policy Daily Briefs</div>,
}));

import EditorialAdminLayout from "./layout";

describe("EditorialAdminLayout", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    redirectMock.mockClear();
    getEditorialAdminSessionFromCookieStoreMock.mockReset();
    cookiesMock.mockResolvedValue({
      get: vi.fn(),
    });
  });

  test("redirects unauthenticated admins to /admin/login", async () => {
    getEditorialAdminSessionFromCookieStoreMock.mockResolvedValue(null);

    await expect(
      EditorialAdminLayout({ children: <div>Hidden child</div> }),
    ).rejects.toThrow("REDIRECT:/admin/login");
  });

  test("renders the shared admin shell for authenticated admins", async () => {
    getEditorialAdminSessionFromCookieStoreMock.mockResolvedValue({
      role: "editorial-admin",
    });

    const markup = renderToStaticMarkup(
      await EditorialAdminLayout({
        children: <div>Visible child</div>,
      }),
    );

    expect(markup).toContain("Admin logout");
    expect(markup).toContain("Sources");
    expect(markup).toContain("AI Connections");
    expect(markup).toContain("Prompt Policy");
    expect(markup).toContain("Visible child");
  });
});
