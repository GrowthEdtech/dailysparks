import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi, beforeEach } from "vitest";

const {
  cookiesMock,
  getSessionFromCookieStoreMock,
  getProfileByEmailMock,
  isNotionConfiguredMock,
  dashboardFormMock,
  redirectMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getSessionFromCookieStoreMock: vi.fn(),
  getProfileByEmailMock: vi.fn(),
  isNotionConfiguredMock: vi.fn(),
  dashboardFormMock: vi.fn(),
  redirectMock: vi.fn(),
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

vi.mock("../../lib/mvp-store", () => ({
  getProfileByEmail: getProfileByEmailMock,
}));

vi.mock("../../lib/notion-config", () => ({
  isNotionConfigured: isNotionConfiguredMock,
}));

vi.mock("./dashboard-form", () => ({
  default: (props: unknown) => {
    dashboardFormMock(props);
    return <div>Dashboard form</div>;
  },
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    getSessionFromCookieStoreMock.mockReset();
    getProfileByEmailMock.mockReset();
    isNotionConfiguredMock.mockReset();
    dashboardFormMock.mockReset();
    redirectMock.mockReset();
  });

  test("passes a deferred notebook loading signal into the dashboard form", async () => {
    cookiesMock.mockResolvedValue({
      get: () => undefined,
    });
    getSessionFromCookieStoreMock.mockResolvedValue({
      email: "parent@example.com",
    });
    getProfileByEmailMock.mockResolvedValue({
      parent: {
        id: "parent-1",
        email: "parent@example.com",
      },
      student: {
        id: "student-1",
        programme: "MYP",
      },
    });
    isNotionConfiguredMock.mockReturnValue(true);

    renderToStaticMarkup(await DashboardPage());

    expect(dashboardFormMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deferNotebookData: true,
      }),
    );
  });
});
