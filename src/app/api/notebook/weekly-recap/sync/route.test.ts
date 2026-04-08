import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as login } from "../../../login/route";
import { POST as syncWeeklyRecap } from "./route";
import { SESSION_COOKIE_NAME } from "../../../../../lib/session";
import {
  saveDailyBriefNotebookAuthoredEntry,
  saveDailyBriefNotebookEntries,
} from "../../../../../lib/daily-brief-notebook-store";
import {
  getOrCreateParentProfile,
  updateStudentPreferences,
  updateParentNotionConnection,
} from "../../../../../lib/mvp-store";
import { encryptNotionToken } from "../../../../../lib/notion-crypto";
import { setNotionConnectionSecret } from "../../../../../lib/notion-connection-store";

const {
  verifyIdTokenMock,
  createSessionCookieMock,
  verifySessionCookieMock,
} = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  createSessionCookieMock: vi.fn(),
  verifySessionCookieMock: vi.fn(),
}));

vi.mock("../../../../../lib/firebase-admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
    createSessionCookie: createSessionCookieMock,
    verifySessionCookie: verifySessionCookieMock,
  }),
}));

const ORIGINAL_ENV = { ...process.env };
const fetchMock = vi.fn<typeof fetch>();
let tempDirectory = "";

async function signInParent() {
  verifyIdTokenMock.mockResolvedValue({
    uid: "firebase-parent-1",
    email: "parent@example.com",
    name: "Parent Example",
    auth_time: Math.floor(Date.now() / 1000),
  });
  createSessionCookieMock.mockResolvedValue("firebase-session-cookie");
  verifySessionCookieMock.mockResolvedValue({
    uid: "firebase-parent-1",
    email: "parent@example.com",
    name: "Parent Example",
  });

  await login(
    new Request("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        idToken: "firebase-id-token",
      }),
    }),
  );

  return `${SESSION_COOKIE_NAME}=firebase-session-cookie`;
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-weekly-recap-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-notebook.json",
    ),
    NOTION_OAUTH_CLIENT_ID: "notion-client-id",
    NOTION_OAUTH_CLIENT_SECRET: "notion-client-secret",
    NOTION_OAUTH_REDIRECT_URI:
      "https://dailysparks.geledtech.com/api/notion/callback",
    NOTION_TOKEN_ENCRYPTION_SECRET: "test-encryption-secret",
  };
  verifyIdTokenMock.mockReset();
  createSessionCookieMock.mockReset();
  verifySessionCookieMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("weekly recap sync route", () => {
  test("builds a weekly recap from notebook entries and syncs it to notion", async () => {
    const cookie = await signInParent();

    const profile = await getOrCreateParentProfile({
      email: "parent@example.com",
      fullName: "Parent Example",
      studentName: "Katherine",
    });
    await updateStudentPreferences("parent@example.com", {
      studentName: "Katherine",
      goodnotesEmail: "katherine@goodnotes.email",
      programme: "DP",
      programmeYear: 1,
      interestTags: ["TOK", "Philosophy"],
    });
    await updateParentNotionConnection("parent@example.com", {
      notionWorkspaceId: "workspace-123",
      notionWorkspaceName: "Growth Education",
      notionBotId: "bot-123",
      notionDatabaseId: "database-123",
      notionDatabaseName: "Daily Sparks Reading Archive",
      notionDataSourceId: "data-source-123",
      notionAuthorizedAt: "2026-04-07T00:00:00.000Z",
    });
    await setNotionConnectionSecret({
      parentId: profile.parent.id,
      accessTokenCiphertext: encryptNotionToken(
        "test-encryption-secret",
        "secret-access-token",
      ),
      refreshTokenCiphertext: null,
      workspaceId: "workspace-123",
      botId: "bot-123",
      expiresAt: null,
      createdAt: "2026-04-07T00:00:00.000Z",
      updatedAt: "2026-04-07T00:00:00.000Z",
    });

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "weekly-page-123",
          url: "https://www.notion.so/weekly-page-123",
        }),
        { status: 200 },
      ),
    );

    await saveDailyBriefNotebookEntries({
      parentId: profile.parent.id,
      parentEmail: profile.parent.email,
      studentId: profile.student.id,
      programme: "DP",
      interestTags: ["TOK", "Philosophy"],
      briefId: "brief-1",
      scheduledFor: "2026-04-07",
      headline: "Governments debate whether AI regulation can keep up",
      topicTags: ["AI", "Ethics"],
      knowledgeBankTitle: "Academic idea bank",
      entries: [
        {
          title: "Claim",
          body: "Stronger regulation is justified when public harm can scale faster than oversight.",
        },
        {
          title: "Counterpoint",
          body: "Regulation can overreach when the evidence base is still incomplete.",
        },
      ],
    });

    await saveDailyBriefNotebookAuthoredEntry({
      parentId: profile.parent.id,
      parentEmail: profile.parent.email,
      studentId: profile.student.id,
      programme: "DP",
      interestTags: ["TOK", "Philosophy"],
      briefId: "brief-1",
      scheduledFor: "2026-04-07",
      headline: "Governments debate whether AI regulation can keep up",
      topicTags: ["AI", "Ethics"],
      knowledgeBankTitle: "Academic idea bank",
      entryType: "tok-prompt",
      body: "I would compare precaution with freedom to experiment before deciding which response is more justified.",
    });

    const response = await syncWeeklyRecap(
      new Request("http://localhost:3000/api/notebook/weekly-recap/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          asOf: "2026-04-10T12:00:00.000Z",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recap).toEqual(
      expect.objectContaining({
        totalEntries: 3,
        authoredCount: 1,
        systemCount: 2,
      }),
    );
    expect(body.notionSync).toEqual(
      expect.objectContaining({
        status: "synced",
        pageId: "weekly-page-123",
      }),
    );
  });
});
