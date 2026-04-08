import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as login } from "../../login/route";
import { POST as saveNotebookEntry } from "./route";
import { SESSION_COOKIE_NAME } from "../../../../lib/session";
import { createDailyBriefHistoryEntry } from "../../../../lib/daily-brief-history-store";
import {
  listDailyBriefNotebookEntries,
} from "../../../../lib/daily-brief-notebook-store";
import {
  getProfileByEmail,
  getOrCreateParentProfile,
  updateStudentPreferences,
} from "../../../../lib/mvp-store";

const {
  verifyIdTokenMock,
  createSessionCookieMock,
  verifySessionCookieMock,
} = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  createSessionCookieMock: vi.fn(),
  verifySessionCookieMock: vi.fn(),
}));

vi.mock("../../../../lib/firebase-admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
    createSessionCookie: createSessionCookieMock,
    verifySessionCookie: verifySessionCookieMock,
  }),
}));

const ORIGINAL_ENV = { ...process.env };
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
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-notebook-entry-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_DAILY_BRIEF_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-history.json",
    ),
    DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-notebook.json",
    ),
  };
  verifyIdTokenMock.mockReset();
  createSessionCookieMock.mockReset();
  verifySessionCookieMock.mockReset();
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("save authored notebook entry route", () => {
  test("saves and updates a user-authored notebook note for the logged-in parent", async () => {
    const cookie = await signInParent();

    await getOrCreateParentProfile({
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

    const brief = await createDailyBriefHistoryEntry({
      scheduledFor: "2026-04-09",
      recordKind: "production",
      headline: "Governments debate whether AI regulation can keep up",
      summary:
        "Governments are debating how quickly AI regulation can respond to fast-moving tools and public risk.",
      programme: "DP",
      editorialCohort: "EMEA",
      status: "published",
      topicTags: ["AI", "Ethics"],
      sourceReferences: [],
      aiConnectionId: "nf-relay",
      aiConnectionName: "NF Relay",
      aiModel: "gpt-5.4",
      promptPolicyId: "policy-1",
      promptVersionLabel: "v2.0.0",
      promptVersion: "v2.0.0",
      repetitionRisk: "low",
      repetitionNotes: "No recent overlap.",
      adminNotes: "",
      briefMarkdown:
        "TOK / essay prompt - When evidence is incomplete, how should societies decide whether caution is wiser than freedom to experiment?",
    });

    const firstResponse = await saveNotebookEntry(
      new Request("http://localhost:3000/api/notebook/entry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          briefId: brief.id,
          entryType: "tok-prompt",
          body: "I would start by comparing the risks of delay with the risks of acting too early.",
        }),
      }),
    );

    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody.wasUpdate).toBe(false);
    expect(firstBody.entry).toEqual(
      expect.objectContaining({
        programme: "DP",
        entryOrigin: "authored",
        entryType: "tok-prompt",
        savedSource: "reflection",
      }),
    );

    const secondResponse = await saveNotebookEntry(
      new Request("http://localhost:3000/api/notebook/entry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          briefId: brief.id,
          entryType: "tok-prompt",
          body: "I would compare precaution with freedom to experiment before deciding which response is more justified.",
        }),
      }),
    );

    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody.wasUpdate).toBe(true);

    const profile = await getProfileByEmail("parent@example.com");
    const entries = await listDailyBriefNotebookEntries({
      parentId: profile?.parentId ?? "",
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        entryOrigin: "authored",
        body: "I would compare precaution with freedom to experiment before deciding which response is more justified.",
      }),
    );
  });
});
