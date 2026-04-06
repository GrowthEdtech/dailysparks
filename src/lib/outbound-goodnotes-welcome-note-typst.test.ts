import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  buildGoodnotesWelcomeNoteTypstSource,
  renderGoodnotesWelcomeNoteTypst,
} from "./outbound-goodnotes-welcome-note-typst";
import { countPdfPages } from "./pdf-page-count";
import type { ParentProfile } from "./mvp-types";

function createProfile(): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "parent@example.com",
      fullName: "Parent Example",
      subscriptionStatus: "trial",
      subscriptionPlan: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialStartedAt: "2026-04-01T00:00:00.000Z",
      trialEndsAt: "2026-04-08T00:00:00.000Z",
      subscriptionActivatedAt: null,
      subscriptionRenewalAt: null,
      latestInvoiceId: null,
      latestInvoiceNumber: null,
      latestInvoiceStatus: null,
      latestInvoiceHostedUrl: null,
      latestInvoicePdfUrl: null,
      latestInvoiceAmountPaid: null,
      latestInvoiceCurrency: null,
      latestInvoicePaidAt: null,
      latestInvoicePeriodStart: null,
      latestInvoicePeriodEnd: null,
      notionWorkspaceId: null,
      notionWorkspaceName: null,
      notionBotId: null,
      notionDatabaseId: null,
      notionDatabaseName: null,
      notionDataSourceId: null,
      notionAuthorizedAt: null,
      notionLastSyncedAt: null,
      notionLastSyncStatus: null,
      notionLastSyncMessage: null,
      notionLastSyncPageId: null,
      notionLastSyncPageUrl: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    student: {
      id: "student-1",
      parentId: "parent-1",
      studentName: "Katherine",
      programme: "MYP",
      programmeYear: 3,
      goodnotesEmail: "katherine@goodnotes.email",
      goodnotesConnected: false,
      goodnotesVerifiedAt: null,
      goodnotesLastTestSentAt: null,
      goodnotesLastDeliveryStatus: null,
      goodnotesLastDeliveryMessage: null,
      notionConnected: false,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
  };
}

describe("outbound goodnotes welcome note typst", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T02:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("builds Typst source for the branded welcome note", () => {
    const source = buildGoodnotesWelcomeNoteTypstSource(createProfile());

    expect(source).toContain("Welcome to Daily Sparks");
    expect(source).toContain("Goodnotes destination confirmed");
    expect(source).toContain("What to expect");
    expect(source).toContain("Reading rhythm");
    expect(source).toContain("Your next steps");
    expect(source).toContain("Growth Education Limited");
  });

  test("renders a single-page welcome note PDF through Typst", async () => {
    const result = await renderGoodnotesWelcomeNoteTypst(createProfile());
    const pageCount = await countPdfPages(result.pdf);

    expect(result.fileName).toBe(
      "2026-04-03_DailySparks_WelcomeNote_MYP_getting-started_test.pdf",
    );
    expect(result.pdf).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(result.pdf).subarray(0, 4).toString()).toBe("%PDF");
    expect(pageCount).toBe(1);
    expect(result.pageCount).toBe(1);
  });
});
