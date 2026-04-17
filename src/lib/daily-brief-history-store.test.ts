import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createDailyBriefHistoryEntry,
  getDailyBriefHistoryEntry,
  listDailyBriefHistory,
  updateDailyBriefHistoryEntry,
} from "./daily-brief-history-store";

const ORIGINAL_ENV = { ...process.env };

function buildBriefInput(overrides: Partial<Parameters<typeof createDailyBriefHistoryEntry>[0]> = {}) {
  return {
    scheduledFor: "2026-04-02",
    recordKind: "production" as const,
    headline: "Students debate how cities should respond to rising heat.",
    summary:
      "A family-friendly brief about how cities, schools, and communities respond to heat waves.",
    programme: "MYP" as const,
    editorialCohort: "APAC" as const,
    status: "draft" as const,
    topicTags: ["climate", "cities"],
    sourceReferences: [
      {
        sourceId: "reuters",
        sourceName: "Reuters",
        sourceDomain: "reuters.com",
        articleTitle: "Cities test new heat protections",
        articleUrl: "https://www.reuters.com/world/example-heat-story",
      },
    ],
    aiConnectionId: "nf-relay",
    aiConnectionName: "NF Relay",
    aiModel: "gpt-5.4",
    promptPolicyId: "policy-1",
    promptVersionLabel: "v1.0.0",
    promptVersion: "v1.0.0",
    repetitionRisk: "low" as const,
    repetitionNotes: "No similar climate-city brief in the past 14 days.",
    adminNotes: "Strong family discussion potential.",
    briefMarkdown:
      "## Today\nCities are testing how to keep schools and public spaces safe during extreme heat.",
    pipelineStage: "generated" as const,
    candidateSnapshotAt: "2026-04-02T05:00:00.000Z",
    generationCompletedAt: "2026-04-02T06:00:00.000Z",
    pdfBuiltAt: null,
    deliveryWindowAt: "2026-04-02T01:00:00.000Z",
    lastDeliveryAttemptAt: null,
    deliveryAttemptCount: 0,
    deliverySuccessCount: 0,
    deliveryFailureCount: 0,
    deliveryReceipts: [],
    failureReason: "",
    retryEligibleUntil: null,
    ...overrides,
  };
}

let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-daily-brief-history-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_DAILY_BRIEF_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-history.json",
    ),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("daily brief history store", () => {
  test("returns an empty list before any daily briefs are recorded", async () => {
    expect(await listDailyBriefHistory()).toEqual([]);
  });

  test("creates, sorts, and fetches history entries", async () => {
    const olderEntry = await createDailyBriefHistoryEntry(
      buildBriefInput({
        scheduledFor: "2026-04-01",
        headline: "An earlier brief",
      }),
    );
    const newerEntry = await createDailyBriefHistoryEntry(
      buildBriefInput({
        scheduledFor: "2026-04-02",
        headline: "A later brief",
        status: "published",
      }),
    );

    const history = await listDailyBriefHistory();
    const fetchedEntry = await getDailyBriefHistoryEntry(newerEntry.id);

    expect(history).toHaveLength(2);
    expect(history[0]?.id).toBe(newerEntry.id);
    expect(history[1]?.id).toBe(olderEntry.id);
    expect(fetchedEntry?.headline).toBe("A later brief");
    expect(fetchedEntry?.sourceReferences[0]?.sourceName).toBe("Reuters");
    expect(fetchedEntry?.promptPolicyId).toBe("policy-1");
    expect(fetchedEntry?.promptVersionLabel).toBe("v1.0.0");
    expect(fetchedEntry?.editorialCohort).toBe("APAC");
    expect(fetchedEntry?.pipelineStage).toBe("generated");
    expect(fetchedEntry?.candidateSnapshotAt).toBe("2026-04-02T05:00:00.000Z");
    expect(fetchedEntry?.deliveryAttemptCount).toBe(0);
  });

  test("filters history by scheduled date, programme, status, record kind, and cohort", async () => {
    await createDailyBriefHistoryEntry(
      buildBriefInput({
        scheduledFor: "2026-04-01",
        programme: "PYP",
        status: "published",
        editorialCohort: "APAC",
      }),
    );
    await createDailyBriefHistoryEntry(
      buildBriefInput({
        scheduledFor: "2026-04-02",
        programme: "MYP",
        status: "draft",
        editorialCohort: "EMEA",
      }),
    );
    await createDailyBriefHistoryEntry(
      buildBriefInput({
        scheduledFor: "2026-04-02",
        programme: "DP",
        status: "failed",
        recordKind: "test",
        editorialCohort: "AMER",
      }),
    );

    const byDate = await listDailyBriefHistory({
      scheduledFor: "2026-04-02",
    });
    const byDateAndProgramme = await listDailyBriefHistory({
      scheduledFor: "2026-04-02",
      programme: "MYP",
    });
    const byStatus = await listDailyBriefHistory({
      scheduledFor: "2026-04-02",
      status: "failed",
    });
    const byRecordKind = await listDailyBriefHistory({
      scheduledFor: "2026-04-02",
      recordKind: "production",
    });
    const byCohort = await listDailyBriefHistory({
      scheduledFor: "2026-04-02",
      editorialCohort: "EMEA",
    });

    expect(byDate).toHaveLength(2);
    expect(byDate.every((entry) => entry.scheduledFor === "2026-04-02")).toBe(
      true,
    );
    expect(byDateAndProgramme).toHaveLength(1);
    expect(byDateAndProgramme[0]?.programme).toBe("MYP");
    expect(byStatus).toHaveLength(1);
    expect(byStatus[0]?.programme).toBe("DP");
    expect(byRecordKind).toHaveLength(1);
    expect(byRecordKind[0]?.recordKind).toBe("production");
    expect(byCohort).toHaveLength(1);
    expect(byCohort[0]?.editorialCohort).toBe("EMEA");
  });

  test("stores pipeline metadata fields for staged scheduler flow", async () => {
    const createdEntry = await createDailyBriefHistoryEntry(
      buildBriefInput({
        status: "approved",
        pipelineStage: "preflight_passed",
        pdfBuiltAt: "2026-04-02T06:05:00.000Z",
        lastDeliveryAttemptAt: "2026-04-02T09:10:00.000Z",
        deliveryAttemptCount: 2,
        deliverySuccessCount: 1,
        deliveryFailureCount: 1,
        deliveryReceipts: [
          {
            parentId: "parent-1",
            parentEmail: "family@example.com",
            channel: "goodnotes",
            renderer: "typst",
            attachmentFileName:
              "2026-04-02_DailySparks_DailyBrief_MYP_cities-test-new-heat-protections.pdf",
            externalId: "smtp-message-id",
            externalUrl: null,
          },
        ],
        renderAudit: {
          renderer: "typst",
          layoutVariant: "standard",
          pageCount: 2,
          onePageCompliant: null,
          auditedAt: "2026-04-02T06:05:30.000Z",
        },
        failureReason: "One destination timed out.",
        retryEligibleUntil: "2026-04-02T09:30:00.000Z",
      }),
    );
    const fetchedEntry = await getDailyBriefHistoryEntry(createdEntry.id);

    expect(fetchedEntry?.pipelineStage).toBe("preflight_passed");
    expect(fetchedEntry?.pdfBuiltAt).toBe("2026-04-02T06:05:00.000Z");
    expect(fetchedEntry?.lastDeliveryAttemptAt).toBe(
      "2026-04-02T09:10:00.000Z",
    );
    expect(fetchedEntry?.deliveryAttemptCount).toBe(2);
    expect(fetchedEntry?.deliverySuccessCount).toBe(1);
    expect(fetchedEntry?.deliveryFailureCount).toBe(1);
    expect(fetchedEntry?.deliveryReceipts).toEqual([
      expect.objectContaining({
        channel: "goodnotes",
        parentEmail: "family@example.com",
        renderer: "typst",
        attachmentFileName:
          "2026-04-02_DailySparks_DailyBrief_MYP_cities-test-new-heat-protections.pdf",
        externalId: "smtp-message-id",
      }),
    ]);
    expect(fetchedEntry?.renderAudit).toEqual({
      renderer: "typst",
      layoutVariant: "standard",
      pageCount: 2,
      onePageCompliant: null,
      pagePolicyLabel: null,
      pagePolicyPageCountLimit: null,
      pagePolicyCompliant: null,
      auditedAt: "2026-04-02T06:05:30.000Z",
    });
    expect(fetchedEntry?.failureReason).toBe("One destination timed out.");
    expect(fetchedEntry?.retryEligibleUntil).toBe("2026-04-02T09:30:00.000Z");
  });

  test("persists academic routing variants on create and update", async () => {
    const createdEntry = await createDailyBriefHistoryEntry(
      buildBriefInput({
        academicTier: "foundation",
        learnerPersona: "analytical",
      }),
    );

    const updatedEntry = await updateDailyBriefHistoryEntry(createdEntry.id, {
      academicTier: "enriched",
      learnerPersona: "reflective",
    });
    const fetchedEntry = await getDailyBriefHistoryEntry(createdEntry.id);

    expect(createdEntry.academicTier).toBe("foundation");
    expect(createdEntry.learnerPersona).toBe("analytical");
    expect(updatedEntry?.academicTier).toBe("enriched");
    expect(updatedEntry?.learnerPersona).toBe("reflective");
    expect(fetchedEntry?.academicTier).toBe("enriched");
    expect(fetchedEntry?.learnerPersona).toBe("reflective");
  });

  test("updates an existing history entry with preflight status and stage changes", async () => {
    const createdEntry = await createDailyBriefHistoryEntry(buildBriefInput());

    const updatedEntry = await updateDailyBriefHistoryEntry(createdEntry.id, {
      status: "approved",
      pipelineStage: "preflight_passed",
      adminNotes: "Ready for dispatch.",
    });
    const fetchedEntry = await getDailyBriefHistoryEntry(createdEntry.id);

    expect(updatedEntry?.status).toBe("approved");
    expect(updatedEntry?.pipelineStage).toBe("preflight_passed");
    expect(updatedEntry?.adminNotes).toContain("Ready for dispatch.");
    expect(fetchedEntry?.status).toBe("approved");
  });

  test("preserves untouched fields when applying a partial history update", async () => {
    const createdEntry = await createDailyBriefHistoryEntry(
      buildBriefInput({
        scheduledFor: "2026-04-03",
        headline: "Original headline",
        programme: "PYP",
      }),
    );

    const updatedEntry = await updateDailyBriefHistoryEntry(createdEntry.id, {
      status: "published",
      pipelineStage: "published",
    });
    const filteredHistory = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });

    expect(updatedEntry?.scheduledFor).toBe("2026-04-03");
    expect(updatedEntry?.headline).toBe("Original headline");
    expect(updatedEntry?.programme).toBe("PYP");
    expect(filteredHistory).toHaveLength(1);
    expect(filteredHistory[0]?.id).toBe(createdEntry.id);
  });
});
