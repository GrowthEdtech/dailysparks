import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { getDailyBriefHistoryEntryMock, notFoundMock } = vi.hoisted(() => ({
  getDailyBriefHistoryEntryMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("../../../../../lib/daily-brief-history-store", () => ({
  getDailyBriefHistoryEntry: getDailyBriefHistoryEntryMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import DailyBriefDetailPage from "./page";

describe("DailyBriefDetailPage", () => {
  beforeEach(() => {
    getDailyBriefHistoryEntryMock.mockReset();
    notFoundMock.mockClear();
  });

  test("renders the full daily brief detail when a record exists", async () => {
    getDailyBriefHistoryEntryMock.mockResolvedValue({
      id: "brief-1",
      scheduledFor: "2026-04-02",
      recordKind: "test",
      headline: "Students debate how cities should respond to rising heat.",
      summary: "A climate brief.",
      programme: "MYP",
      editorialCohort: "EMEA",
      status: "failed",
      topicClusterKey: "cities rising heat schools",
      normalizedHeadline:
        "students debate how cities should respond to rising heat",
      topicLatestPublishedAt: "2026-04-02T04:00:00.000Z",
      selectionDecision: "follow_up",
      selectionOverrideNote:
        "Follow-up exception approved because the cluster contains a newer development and a distinct headline.",
      blockedTopics: [
        {
          clusterKey: "trump justice department bondi",
          headline: "Trump removes US Attorney General Pam Bondi",
          policy: "exact_headline",
          reason: "An identical published headline already exists in the editorial archive.",
          existingScheduledFor: "2026-04-01",
          existingEditorialCohort: "APAC",
        },
      ],
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
      repetitionRisk: "low",
      repetitionNotes: "No similar brief.",
      adminNotes: "Shareable with families.",
      briefMarkdown: [
        "What’s happening? Cities are testing new heat protections.",
        "Why does this matter? Hotter weather can make school and travel harder for families.",
        "Picture it Imagine bus stops, classrooms, and sports fields staying cooler during a heatwave.",
        "Words to know - Heatwave: A period of unusually hot weather - Cooling centre: A safe indoor place where people can escape extreme heat",
        "Talk about it at home - What places in your community need extra cooling? - How can families stay safe when the weather becomes dangerous?",
        "Big idea Communities can protect people by planning ahead for extreme heat.",
      ].join("\n"),
      pipelineStage: "failed",
      candidateSnapshotAt: "2026-04-02T05:00:00.000Z",
      generationCompletedAt: "2026-04-02T06:00:00.000Z",
      pdfBuiltAt: "2026-04-02T06:05:00.000Z",
      deliveryWindowAt: "2026-04-02T09:00:00.000Z",
      lastDeliveryAttemptAt: "2026-04-02T09:12:00.000Z",
      deliveryAttemptCount: 2,
      deliverySuccessCount: 3,
      deliveryFailureCount: 2,
      dispatchMode: "canary",
      dispatchCanaryParentEmails: [
        "deploy-smoke@example.com",
        "family@example.com",
      ],
      targetedProfiles: [
        {
          parentId: "parent-1",
          parentEmail: "family@example.com",
          localDeliveryWindow: "9:00 AM · Europe/London",
          reason: "Selected for the current canary delivery wave.",
        },
      ],
      skippedProfiles: [
        {
          parentId: "parent-2",
          parentEmail: "skip@example.com",
          localDeliveryWindow: "9:00 AM · Europe/London",
          reason: "Skipped by canary mode for this delivery wave.",
        },
      ],
      pendingFutureProfiles: [
        {
          parentId: "parent-3",
          parentEmail: "future@example.com",
          localDeliveryWindow: "9:00 AM · America/New York",
          reason: "Pending future local delivery window.",
        },
      ],
      heldProfiles: [
        {
          parentId: "parent-4",
          parentEmail: "held@example.com",
          localDeliveryWindow: "9:00 AM · Europe/London",
          reason: "No healthy delivery channel was available for this wave.",
        },
      ],
      deliveryReceipts: [
        {
          parentId: "parent-1",
          parentEmail: "family@example.com",
          channel: "goodnotes",
          renderer: "pdf-lib",
          attachmentFileName:
            "2026-04-02_DailySparks_DailyBrief_MYP_cities-test-new-heat-protections.pdf",
          externalId: "smtp-message-id",
          externalUrl: null,
        },
      ],
      renderAudit: {
        renderer: "pdf-lib",
        layoutVariant: "standard",
        pageCount: 2,
        onePageCompliant: null,
        auditedAt: "2026-04-02T09:12:00.000Z",
      },
      failedDeliveryTargets: [
        {
          parentId: "parent-1",
          parentEmail: "family@example.com",
          channel: "goodnotes",
          errorMessage: "Relay timeout.",
        },
      ],
      failureReason: "Two configured deliveries timed out during the 09:10 retry window.",
      retryEligibleUntil: "2026-04-02T09:30:00.000Z",
      createdAt: "2026-04-02T00:00:00.000Z",
      updatedAt: "2026-04-02T00:00:00.000Z",
    });

    const markup = renderToStaticMarkup(
      await DailyBriefDetailPage({
        params: Promise.resolve({ briefId: "brief-1" }),
      }),
    );

    expect(markup).toContain(
      "Students debate how cities should respond to rising heat.",
    );
    expect(markup).toContain("Shareable with families.");
    expect(markup).toContain("Cities test new heat protections");
    expect(markup).toContain("v1.0.0");
    expect(markup).toContain("Cities are testing new heat protections.");
    expect(markup).toContain("Editorial preview");
    expect(markup).toContain(
      "daily-brief-thumbnail%2Fbrief-1",
    );
    expect(markup).toContain("Typst live renderer");
    expect(markup).toContain("Legacy pdf-lib record");
    expect(markup).toContain("Legacy pdf-lib preview");
    expect(markup).toContain("Typst live");
    expect(markup).toContain("daily-brief-typst/brief-1");
    expect(markup).toContain("daily-brief-typst-thumbnail/brief-1");
    expect(markup).toContain("Summary deck");
    expect(markup).toContain("Reading brief");
    expect(markup).toContain("What&#x27;s happening?");
    expect(markup).toContain("Words to know");
    expect(markup).toContain("Cooling centre");
    expect(markup).toContain("Talk about it at home");
    expect(markup).toContain("Big idea");
    expect(markup).toContain("Theme focus");
    expect(markup).toContain("Pipeline timeline");
    expect(markup).toContain("Render audit");
    expect(markup).toContain("Layout variant");
    expect(markup).toContain("Page count");
    expect(markup).toContain("Dispatch review");
    expect(markup).toContain("Dispatch audience");
    expect(markup).toContain("Delivery receipts");
    expect(markup).toContain("Selection governance");
    expect(markup).toContain("Follow-up exception");
    expect(markup).toContain("Skipped by canary mode for this delivery wave.");
    expect(markup).toContain("Pending future local delivery window.");
    expect(markup).toContain("No healthy delivery channel was available for this wave.");
    expect(markup).toContain("Manual resend / backfill");
    expect(markup).toContain("Renderer");
    expect(markup).toContain("Auto (policy)");
    expect(markup).toContain("Typst live");
    expect(markup).toContain("Send manual resend");
    expect(markup).toContain(
      "Follow-up exception approved because the cluster contains a newer development and a distinct headline.",
    );
    expect(markup).toContain(
      "An identical published headline already exists in the editorial archive.",
    );
    expect(markup).toContain("Test run");
    expect(markup).toContain(
      "2026-04-02_DailySparks_DailyBrief_MYP_cities-test-new-heat-protections.pdf",
    );
    expect(markup).toContain("Renderer:</span> Legacy pdf-lib");
    expect(markup).toContain("Retry eligible until");
    expect(markup).toContain(
      "Two configured deliveries timed out during the 09:10 retry window.",
    );
  });

  test("triggers the not-found flow when the brief does not exist", async () => {
    getDailyBriefHistoryEntryMock.mockResolvedValue(null);

    await expect(
      DailyBriefDetailPage({
        params: Promise.resolve({ briefId: "missing-brief" }),
      }),
    ).rejects.toThrow("NOT_FOUND");
  });

  test("surfaces typst rollout guidance for PYP canary briefs", async () => {
    getDailyBriefHistoryEntryMock.mockResolvedValue({
      id: "brief-pyp-1",
      scheduledFor: "2026-04-05",
      recordKind: "test",
      headline: "UN watchdog voices deep concern as Iran reports new attacks on nuclear plant.",
      summary: "A PYP canary brief.",
      programme: "PYP",
      editorialCohort: "APAC",
      status: "published",
      topicClusterKey: "nuclear safety",
      normalizedHeadline: "un watchdog voices deep concern as iran reports new attacks on nuclear plant",
      topicLatestPublishedAt: null,
      selectionDecision: "new",
      selectionOverrideNote: "",
      blockedTopics: [],
      topicTags: ["nuclear safety"],
      sourceReferences: [],
      aiConnectionId: "nf-relay",
      aiConnectionName: "NF Relay",
      aiModel: "gpt-5.4",
      promptPolicyId: "policy-1",
      promptVersionLabel: "v1.1.1",
      promptVersion: "v1.1.1",
      repetitionRisk: "low",
      repetitionNotes: "No overlap.",
      adminNotes: "",
      briefMarkdown: "What’s happening? A brief.",
      pipelineStage: "published",
      candidateSnapshotAt: "2026-04-05T00:00:00.000Z",
      generationCompletedAt: "2026-04-05T00:10:00.000Z",
      pdfBuiltAt: "2026-04-05T00:12:00.000Z",
      deliveryWindowAt: "2026-04-05T01:00:00.000Z",
      lastDeliveryAttemptAt: "2026-04-05T01:03:00.000Z",
      deliveryAttemptCount: 1,
      deliverySuccessCount: 1,
      deliveryFailureCount: 0,
      dispatchMode: "canary",
      dispatchCanaryParentEmails: ["family@example.com"],
      targetedProfiles: [],
      skippedProfiles: [],
      pendingFutureProfiles: [],
      heldProfiles: [],
      deliveryReceipts: [
        {
          parentId: "parent-1",
          parentEmail: "family@example.com",
          channel: "goodnotes",
          renderer: "typst",
          attachmentFileName: "pyp-typst.pdf",
          externalId: "smtp-1",
          externalUrl: null,
        },
      ],
      renderAudit: {
        renderer: "typst",
        layoutVariant: "pyp-one-page",
        pageCount: 1,
        onePageCompliant: true,
        auditedAt: "2026-04-05T01:03:00.000Z",
      },
      failedDeliveryTargets: [],
      failureReason: "",
      retryEligibleUntil: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T00:00:00.000Z",
    });

    const markup = renderToStaticMarkup(
      await DailyBriefDetailPage({
        params: Promise.resolve({ briefId: "brief-pyp-1" }),
      }),
    );

    expect(markup).toContain("Renderer rollout");
    expect(markup).toContain("Current brief auto policy");
    expect(markup).toContain("Coverage");
    expect(markup).toContain("PYP, MYP, and DP are Typst-first");
    expect(markup).toContain("Typst live");
    expect(markup).toContain("Page policy");
    expect(markup).toContain("Compliant");
  });

  test("surfaces a legacy warning when a historical brief used pdf-lib", async () => {
    getDailyBriefHistoryEntryMock.mockResolvedValue({
      id: "brief-pyp-prod-1",
      scheduledFor: "2026-04-05",
      recordKind: "production",
      headline: "PYP production fallback brief.",
      summary: "A PYP production brief.",
      programme: "PYP",
      editorialCohort: "APAC",
      status: "published",
      topicClusterKey: "pyp fallback",
      normalizedHeadline: "pyp production fallback brief",
      topicLatestPublishedAt: null,
      selectionDecision: "new",
      selectionOverrideNote: "",
      blockedTopics: [],
      topicTags: ["science"],
      sourceReferences: [],
      aiConnectionId: "nf-relay",
      aiConnectionName: "NF Relay",
      aiModel: "gpt-5.4",
      promptPolicyId: "policy-1",
      promptVersionLabel: "v1.1.1",
      promptVersion: "v1.1.1",
      repetitionRisk: "low",
      repetitionNotes: "No overlap.",
      adminNotes: "",
      briefMarkdown: "What’s happening? A brief.",
      pipelineStage: "published",
      candidateSnapshotAt: "2026-04-05T00:00:00.000Z",
      generationCompletedAt: "2026-04-05T00:10:00.000Z",
      pdfBuiltAt: "2026-04-05T00:12:00.000Z",
      deliveryWindowAt: "2026-04-05T01:00:00.000Z",
      lastDeliveryAttemptAt: "2026-04-05T01:03:00.000Z",
      deliveryAttemptCount: 1,
      deliverySuccessCount: 1,
      deliveryFailureCount: 0,
      dispatchMode: "all",
      dispatchCanaryParentEmails: [],
      targetedProfiles: [],
      skippedProfiles: [],
      pendingFutureProfiles: [],
      heldProfiles: [],
      deliveryReceipts: [
        {
          parentId: "parent-1",
          parentEmail: "family@example.com",
          channel: "goodnotes",
          renderer: "pdf-lib",
          attachmentFileName: "pyp-pdf-lib.pdf",
          externalId: "smtp-1",
          externalUrl: null,
        },
      ],
      renderAudit: {
        renderer: "pdf-lib",
        layoutVariant: "pyp-one-page",
        pageCount: 1,
        onePageCompliant: true,
        auditedAt: "2026-04-05T01:03:00.000Z",
      },
      failedDeliveryTargets: [],
      failureReason: "",
      retryEligibleUntil: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T00:00:00.000Z",
    });

    const markup = renderToStaticMarkup(
      await DailyBriefDetailPage({
        params: Promise.resolve({ briefId: "brief-pyp-prod-1" }),
      }),
    );

    expect(markup).toContain(
      "This record still carries legacy pdf-lib evidence.",
    );
    expect(markup).toContain("legacy preview only for historical audit");
  });

  test("surfaces MYP page-policy guidance and compliance", async () => {
    getDailyBriefHistoryEntryMock.mockResolvedValue({
      id: "brief-myp-compare-1",
      scheduledFor: "2026-04-05",
      recordKind: "production",
      headline: "Students compare coastal cleanup plans across cities.",
      summary: "A MYP editorial brief.",
      programme: "MYP",
      editorialCohort: "EMEA",
      status: "approved",
      topicClusterKey: "coastal cleanup",
      normalizedHeadline: "students compare coastal cleanup plans across cities",
      topicLatestPublishedAt: null,
      selectionDecision: "new",
      selectionOverrideNote: "",
      blockedTopics: [],
      topicTags: ["civic planning"],
      sourceReferences: [],
      aiConnectionId: "nf-relay",
      aiConnectionName: "NF Relay",
      aiModel: "gpt-5.4",
      promptPolicyId: "policy-1",
      promptVersionLabel: "v1.1.1",
      promptVersion: "v1.1.1",
      repetitionRisk: "low",
      repetitionNotes: "No overlap.",
      adminNotes: "",
      briefMarkdown: "What’s happening? A MYP compare brief.",
      pipelineStage: "preflight_passed",
      candidateSnapshotAt: "2026-04-05T00:00:00.000Z",
      generationCompletedAt: "2026-04-05T00:10:00.000Z",
      pdfBuiltAt: "2026-04-05T00:12:00.000Z",
      deliveryWindowAt: null,
      lastDeliveryAttemptAt: null,
      deliveryAttemptCount: 0,
      deliverySuccessCount: 0,
      deliveryFailureCount: 0,
      dispatchMode: "all",
      dispatchCanaryParentEmails: [],
      targetedProfiles: [],
      skippedProfiles: [],
      pendingFutureProfiles: [],
      heldProfiles: [],
      deliveryReceipts: [],
      renderAudit: {
        renderer: "typst",
        layoutVariant: "myp-compare",
        pageCount: 2,
        onePageCompliant: null,
        pagePolicyLabel: "MYP two-page target",
        pagePolicyPageCountLimit: 2,
        pagePolicyCompliant: true,
        auditedAt: "2026-04-05T01:03:00.000Z",
      },
      failedDeliveryTargets: [],
      failureReason: "",
      retryEligibleUntil: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T00:00:00.000Z",
    });

    const markup = renderToStaticMarkup(
      await DailyBriefDetailPage({
        params: Promise.resolve({ briefId: "brief-myp-compare-1" }),
      }),
    );

    expect(markup).toContain("Renderer rollout");
    expect(markup).toContain("Current brief auto policy");
    expect(markup).toContain("Page policy");
    expect(markup).toContain("MYP two-page target");
    expect(markup).toContain("2 pages max");
    expect(markup).toContain("Compliant");
    expect(markup).toContain(
      "MYP uses the Typst live chain with a two-page editorial target.",
    );
  });
});
