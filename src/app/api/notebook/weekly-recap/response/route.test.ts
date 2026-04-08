import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as login } from "../../../login/route";
import { POST as saveWeeklyRecap } from "../save/route";
import { POST as saveWeeklyRecapResponse } from "./route";
import { SESSION_COOKIE_NAME } from "../../../../../lib/session";
import {
  saveDailyBriefNotebookEntries,
} from "../../../../../lib/daily-brief-notebook-store";
import {
  getOrCreateParentProfile,
  updateStudentPreferences,
} from "../../../../../lib/mvp-store";

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
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-weekly-recap-response-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-notebook.json",
    ),
    DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_WEEKLY_RECAP_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-notebook-weekly-recaps.json",
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

describe("weekly recap response route", () => {
  test("saves a retrieval response onto the persisted weekly recap", async () => {
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
          title: "TOK prompt",
          body: "When evidence is incomplete, how should societies decide whether caution is wiser than freedom to experiment?",
        },
      ],
    });

    const saveResponse = await saveWeeklyRecap(
      new Request("http://localhost:3000/api/notebook/weekly-recap/save", {
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
    const saveBody = await saveResponse.json();

    const response = await saveWeeklyRecapResponse(
      new Request("http://localhost:3000/api/notebook/weekly-recap/response", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          weekKey: saveBody.record.weekKey,
          promptEntryId: saveBody.record.retrievalPrompts[0].entryId,
          response:
            "I would compare precaution with iterative oversight before deciding which response is stronger.",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.record.retrievalResponses).toHaveLength(1);
    expect(body.record.retrievalResponses[0]).toEqual(
      expect.objectContaining({
        promptEntryId: saveBody.record.retrievalPrompts[0].entryId,
        response:
          "I would compare precaution with iterative oversight before deciding which response is stronger.",
      }),
    );
  });
});
