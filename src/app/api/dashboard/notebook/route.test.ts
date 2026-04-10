import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as login } from "../../login/route";
import { GET as getDashboardNotebook } from "./route";
import { SESSION_COOKIE_NAME } from "../../../../lib/session";
import { createDailyBriefHistoryEntry } from "../../../../lib/daily-brief-history-store";
import { saveDailyBriefNotebookEntries } from "../../../../lib/daily-brief-notebook-store";
import { getOrCreateParentProfile, updateStudentPreferences } from "../../../../lib/mvp-store";

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
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-dashboard-notebook-"));
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

describe("dashboard notebook route", () => {
  test("returns notebook, recap, and suggestion data for the logged-in parent", async () => {
    const cookie = await signInParent();

    const profile = await getOrCreateParentProfile({
      email: "parent@example.com",
      fullName: "Parent Example",
      studentName: "Katherine",
    });
    await updateStudentPreferences("parent@example.com", {
      studentName: "Katherine",
      programme: "MYP",
      programmeYear: 3,
      interestTags: ["Tech & Innovation", "Society & Culture"],
    });

    const brief = await createDailyBriefHistoryEntry({
      scheduledFor: "2026-04-10",
      recordKind: "production",
      headline: "Students compare coastal cleanup plans",
      summary:
        "Students compare how different cities organise shoreline cleanup efforts and what trade-offs each plan makes.",
      programme: "MYP",
      editorialCohort: "APAC",
      status: "published",
      topicTags: ["civic planning", "sustainability"],
      sourceReferences: [],
      aiConnectionId: "vertex-default",
      aiConnectionName: "Vertex Gemini 3.1 Pro",
      aiModel: "google/gemini-3.1-pro-preview",
      promptPolicyId: "policy-1",
      promptVersionLabel: "v2.0.0",
      promptVersion: "v2.0.0",
      repetitionRisk: "low",
      repetitionNotes: "No recent overlap.",
      adminNotes: "",
      briefMarkdown: [
        "What’s happening? Students are comparing several coastal cleanup plans from different cities.",
        "Why does this matter? Each plan solves one problem well, but creates trade-offs in cost, speed, and fairness.",
        "Global context Coastal cleanup decisions affect communities, public budgets, and environmental recovery.",
        "Compare or connect One city may value speed, while another values resident voice and resilience.",
        "Inquiry question - Which cleanup plan would feel fairest, and what evidence would help you defend that choice?",
        "Notebook prompt Write two sentences comparing a fast cleanup plan with a community-led cleanup plan.",
      ].join("\n"),
    });

    await saveDailyBriefNotebookEntries({
      parentId: profile.parent.id,
      parentEmail: profile.parent.email,
      studentId: profile.student.id,
      programme: "MYP",
      interestTags: ["Tech & Innovation", "Society & Culture"],
      briefId: brief.id,
      scheduledFor: brief.scheduledFor,
      headline: brief.headline,
      topicTags: brief.topicTags,
      knowledgeBankTitle: "Inquiry notebook",
      entries: [
        {
          title: "Inquiry notebook",
          body: "Which plan feels fairest, and why?",
        },
      ],
    });

    const response = await getDashboardNotebook(
      new Request("http://localhost:3000/api/dashboard/notebook", {
        headers: {
          cookie,
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notebookItems).toHaveLength(1);
    expect(body.weeklyRecapHistory).toEqual([]);
    expect(body.weeklyRecapRecord).toBeNull();
    expect(body.notebookSuggestion).toEqual(
      expect.objectContaining({
        briefId: brief.id,
        headline: brief.headline,
      }),
    );
  });

  test("returns 401 when the parent is not logged in", async () => {
    const response = await getDashboardNotebook(
      new Request("http://localhost:3000/api/dashboard/notebook"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toBe("Please log in to continue.");
  });
});
