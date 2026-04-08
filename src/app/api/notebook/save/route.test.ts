import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as login } from "../../login/route";
import { POST as saveNotebook } from "./route";
import { SESSION_COOKIE_NAME } from "../../../../lib/session";
import {
  createDailyBriefHistoryEntry,
} from "../../../../lib/daily-brief-history-store";
import {
  getOrCreateParentProfile,
  updateParentSubscription,
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
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-notebook-api-"));
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

describe("save notebook route", () => {
  test("saves the structured knowledge bank entries from a published brief for the logged-in parent", async () => {
    const cookie = await signInParent();

    await getOrCreateParentProfile({
      email: "parent@example.com",
      fullName: "Parent Example",
      studentName: "Katherine",
    });
    await updateParentSubscription("parent@example.com", {
      subscriptionStatus: "active",
    });
    await updateStudentPreferences("parent@example.com", {
      studentName: "Katherine",
      goodnotesEmail: "katherine@goodnotes.email",
      programme: "MYP",
      programmeYear: 3,
      interestTags: ["Tech & Innovation", "Society & Culture"],
    });

    const brief = await createDailyBriefHistoryEntry({
      scheduledFor: "2026-04-08",
      recordKind: "production",
      headline: "Students compare coastal cleanup plans",
      summary:
        "Students compare how different cities organise shoreline cleanup efforts and what trade-offs each plan makes.",
      programme: "MYP",
      editorialCohort: "APAC",
      status: "published",
      topicTags: ["civic planning", "sustainability"],
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
      briefMarkdown: [
        "What’s happening? Students are comparing several coastal cleanup plans from different cities.",
        "Why does this matter? Each plan solves one problem well, but creates trade-offs in cost, speed, and fairness.",
        "Global context Coastal cleanup decisions affect communities, public budgets, and environmental recovery.",
        "Compare or connect One city may value speed, while another values resident voice and resilience.",
        "Inquiry question - Which cleanup plan would feel fairest, and what evidence would help you defend that choice?",
        "Notebook prompt Write two sentences comparing a fast cleanup plan with a community-led cleanup plan.",
      ].join("\n"),
    });

    const response = await saveNotebook(
      new Request("http://localhost:3000/api/notebook/save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          briefId: brief.id,
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.savedCount).toBe(4);
    expect(body.dedupedCount).toBe(0);
    expect(body.entries).toHaveLength(4);
    expect(body.entries[0]).toEqual(
      expect.objectContaining({
        programme: "MYP",
        sourceBriefId: brief.id,
        entryType: "inquiry-notebook",
      }),
    );
  });

  test("returns deduped entries instead of duplicating notebook saves from the same brief", async () => {
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
      scheduledFor: "2026-04-08",
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
      briefMarkdown: [
        "3-sentence abstract Governments are debating whether AI laws can move fast enough to regulate powerful new tools.",
        "Core issue The central question is how institutions should govern fast-changing systems without pretending that risk can be removed entirely.",
        "Claim Stronger regulation is justified when a tool can scale harm faster than existing oversight can respond.",
        "Counterpoint or evidence limit Regulation can overreach when the evidence base is still incomplete.",
        "Why this matters for IB thinking This issue invites students to compare certainty with precaution, public good with innovation, and evidence with political pressure.",
        "Key academic term - Precautionary principle: The idea that policymakers may act to reduce harm even before all evidence is complete.",
        "TOK / essay prompt - When evidence is incomplete, how should societies decide whether caution is wiser than freedom to experiment?",
        "Notebook capture Note one claim supporting faster regulation and one evidence limit that weakens a simplistic policy response.",
      ].join("\n"),
    });

    await saveNotebook(
      new Request("http://localhost:3000/api/notebook/save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          briefId: brief.id,
        }),
      }),
    );

    const secondResponse = await saveNotebook(
      new Request("http://localhost:3000/api/notebook/save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          briefId: brief.id,
        }),
      }),
    );

    const body = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(body.savedCount).toBe(0);
    expect(body.dedupedCount).toBe(4);
  });
});
