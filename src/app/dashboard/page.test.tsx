import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi, beforeEach } from "vitest";

const {
  cookiesMock,
  getSessionFromCookieStoreMock,
  getProfileByEmailMock,
  listDailyBriefHistoryMock,
  listDailyBriefNotebookEntriesMock,
  listDailyBriefNotebookWeeklyRecapsMock,
  buildOutboundDailyBriefPacketMock,
  buildDailyBriefKnowledgeBankMock,
  isNotionConfiguredMock,
  dashboardFormMock,
  redirectMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getSessionFromCookieStoreMock: vi.fn(),
  getProfileByEmailMock: vi.fn(),
  listDailyBriefHistoryMock: vi.fn(),
  listDailyBriefNotebookEntriesMock: vi.fn(),
  listDailyBriefNotebookWeeklyRecapsMock: vi.fn(),
  buildOutboundDailyBriefPacketMock: vi.fn(),
  buildDailyBriefKnowledgeBankMock: vi.fn(),
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

vi.mock("../../lib/daily-brief-history-store", () => ({
  listDailyBriefHistory: listDailyBriefHistoryMock,
}));

vi.mock("../../lib/daily-brief-notebook-store", () => ({
  listDailyBriefNotebookEntries: listDailyBriefNotebookEntriesMock,
}));

vi.mock("../../lib/daily-brief-notebook-weekly-recap-store", () => ({
  listDailyBriefNotebookWeeklyRecaps: listDailyBriefNotebookWeeklyRecapsMock,
}));

vi.mock("../../lib/outbound-daily-brief-packet", () => ({
  buildOutboundDailyBriefPacket: buildOutboundDailyBriefPacketMock,
}));

vi.mock("../../lib/daily-brief-knowledge-bank", () => ({
  buildDailyBriefKnowledgeBank: buildDailyBriefKnowledgeBankMock,
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
    listDailyBriefHistoryMock.mockReset();
    listDailyBriefNotebookEntriesMock.mockReset();
    listDailyBriefNotebookWeeklyRecapsMock.mockReset();
    buildOutboundDailyBriefPacketMock.mockReset();
    buildDailyBriefKnowledgeBankMock.mockReset();
    isNotionConfiguredMock.mockReset();
    dashboardFormMock.mockReset();
    redirectMock.mockReset();
  });

  test("loads recap history records and passes them into the dashboard form", async () => {
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
    listDailyBriefHistoryMock.mockResolvedValue([]);
    listDailyBriefNotebookEntriesMock.mockResolvedValue([]);
    listDailyBriefNotebookWeeklyRecapsMock.mockResolvedValue([
      {
        id: "recap-2",
        parentId: "parent-1",
        parentEmail: "parent@example.com",
        studentId: "student-1",
        programme: "MYP",
        weekKey: "2026-04-06",
        weekLabel: "Apr 6 – Apr 12",
        title: "MYP weekly recap",
        totalEntries: 3,
        systemCount: 2,
        authoredCount: 1,
        topTags: ["Tech & Innovation"],
        summaryLines: ["Summary"],
        entryTypeBreakdown: [],
        highlights: [],
        retrievalPrompts: [],
        retrievalResponses: [],
        generationSource: "scheduled",
        notionLastSyncedAt: null,
        notionLastSyncPageId: null,
        notionLastSyncPageUrl: null,
        emailLastSentAt: "2026-04-12T10:05:00.000Z",
        emailLastStatus: "sent",
        emailLastMessageId: "message-1",
        emailLastErrorMessage: null,
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z",
      },
      {
        id: "recap-1",
        parentId: "parent-1",
        parentEmail: "parent@example.com",
        studentId: "student-1",
        programme: "MYP",
        weekKey: "2026-03-30",
        weekLabel: "Mar 30 – Apr 5",
        title: "MYP weekly recap",
        totalEntries: 2,
        systemCount: 2,
        authoredCount: 0,
        topTags: ["Society & Culture"],
        summaryLines: ["Summary"],
        entryTypeBreakdown: [],
        highlights: [],
        retrievalPrompts: [],
        retrievalResponses: [],
        generationSource: "manual",
        notionLastSyncedAt: null,
        notionLastSyncPageId: null,
        notionLastSyncPageUrl: null,
        emailLastSentAt: null,
        emailLastStatus: "skipped",
        emailLastMessageId: null,
        emailLastErrorMessage: "Weekly recap email is not configured.",
        createdAt: "2026-04-05T10:00:00.000Z",
        updatedAt: "2026-04-05T10:00:00.000Z",
      },
    ]);
    isNotionConfiguredMock.mockReturnValue(true);

    renderToStaticMarkup(await DashboardPage());

    expect(listDailyBriefNotebookWeeklyRecapsMock).toHaveBeenCalledWith({
      parentId: "parent-1",
      programme: "MYP",
      limit: 12,
    });
    expect(dashboardFormMock).toHaveBeenCalledWith(
      expect.objectContaining({
        weeklyRecapRecord: expect.objectContaining({
          weekKey: "2026-04-06",
        }),
        weeklyRecapHistory: expect.arrayContaining([
          expect.objectContaining({ weekKey: "2026-04-06" }),
          expect.objectContaining({ weekKey: "2026-03-30" }),
        ]),
      }),
    );
  });
});
