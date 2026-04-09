import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  cookiesMock,
  getSessionFromCookieStoreMock,
  redirectMock,
  openingDashboardScreenMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getSessionFromCookieStoreMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  openingDashboardScreenMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("../../lib/session", () => ({
  getSessionFromCookieStore: getSessionFromCookieStoreMock,
}));

vi.mock("./screen", () => ({
  default: () => {
    openingDashboardScreenMock();
    return <div>Opening dashboard screen</div>;
  },
}));

import OpeningDashboardPage from "./page";

describe("OpeningDashboardPage", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    getSessionFromCookieStoreMock.mockReset();
    redirectMock.mockReset();
    openingDashboardScreenMock.mockReset();
  });

  test("redirects unauthenticated parents back to /login", async () => {
    cookiesMock.mockResolvedValue({
      get: () => undefined,
    });
    getSessionFromCookieStoreMock.mockResolvedValue(null);

    await expect(OpeningDashboardPage()).rejects.toThrow("REDIRECT:/login");
  });

  test("renders a lightweight transition screen when a session exists", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "session-cookie" }),
    });
    getSessionFromCookieStoreMock.mockResolvedValue({
      email: "parent@example.com",
    });

    const markup = renderToStaticMarkup(await OpeningDashboardPage());

    expect(openingDashboardScreenMock).toHaveBeenCalledTimes(1);
    expect(markup).toContain("Opening dashboard screen");
  });
});
