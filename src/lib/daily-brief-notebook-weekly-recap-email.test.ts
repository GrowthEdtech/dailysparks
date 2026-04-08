import { describe, expect, test } from "vitest";

import type { ParentProfile } from "./mvp-types";
import type { DailyBriefNotebookWeeklyRecap } from "./daily-brief-notebook-weekly-recap";
import { buildDailyBriefNotebookWeeklyRecapEmail } from "./daily-brief-notebook-weekly-recap-email";

function createProfile(): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "parent@example.com",
      fullName: "Parent Example",
      countryCode: "HK",
      deliveryTimeZone: "Asia/Hong_Kong",
      preferredDeliveryLocalTime: "09:00",
      subscriptionStatus: "active",
      subscriptionPlan: "monthly",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialStartedAt: null,
      trialEndsAt: null,
      subscriptionActivatedAt: "2026-04-01T00:00:00.000Z",
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
      notionWorkspaceId: "workspace-1",
      notionWorkspaceName: "Growth Education",
      notionBotId: "bot-1",
      notionDatabaseId: "db-1",
      notionDatabaseName: "Daily Sparks Reading Archive",
      notionDataSourceId: "ds-1",
      notionAuthorizedAt: "2026-04-01T00:00:00.000Z",
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
      programme: "DP",
      programmeYear: 1,
      interestTags: ["TOK", "Philosophy"],
      goodnotesEmail: "katherine@goodnotes.email",
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-01T00:00:00.000Z",
      goodnotesLastTestSentAt: null,
      goodnotesLastDeliveryStatus: "delivered",
      goodnotesLastDeliveryMessage: null,
      notionConnected: true,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
  };
}

function createRecap(): DailyBriefNotebookWeeklyRecap {
  return {
    programme: "DP",
    weekKey: "2026-04-06",
    weekLabel: "Apr 6 – Apr 12",
    title: "DP weekly recap",
    totalEntries: 4,
    systemCount: 3,
    authoredCount: 1,
    topTags: ["TOK", "AI", "Ethics"],
    summaryLines: [
      "You captured 4 notebook entries this week, including 1 note in your own words.",
      "Your strongest focus areas were TOK and AI.",
      "This week leaned most on Claim, Counterpoint, and TOK prompt thinking.",
    ],
    entryTypeBreakdown: [
      { entryType: "claim", label: "Claim", count: 2 },
      { entryType: "counterpoint", label: "Counterpoint", count: 1 },
      { entryType: "tok-prompt", label: "TOK prompt", count: 1 },
    ],
    highlights: [
      {
        entryId: "entry-1",
        title: "Claim",
        body: "Regulation is justified when public risk can scale faster than oversight.",
        entryType: "claim",
        entryOrigin: "system",
        sourceHeadline: "Governments debate AI oversight",
        updatedAt: "2026-04-10T09:00:00.000Z",
      },
    ],
    retrievalPrompts: [
      {
        entryId: "entry-1",
        title: "Claim",
        prompt:
          "Would you still defend this claim? Which evidence would strengthen it now?",
        entryType: "claim",
        sourceHeadline: "Governments debate AI oversight",
      },
      {
        entryId: "entry-2",
        title: "TOK prompt",
        prompt:
          "Has your answer to this TOK prompt shifted? Which perspective would you add now?",
        entryType: "tok-prompt",
        sourceHeadline: "Governments debate AI oversight",
      },
    ],
  };
}

describe("daily brief notebook weekly recap email", () => {
  test("builds a lightweight parent recap email with summary, prompts, and dashboard CTA", () => {
    const email = buildDailyBriefNotebookWeeklyRecapEmail({
      profile: createProfile(),
      recap: createRecap(),
      appBaseUrl: "https://dailysparks.geledtech.com",
    });

    expect(email.subject).toContain("Apr 6 – Apr 12");
    expect(email.html).toContain("Weekly notebook recap");
    expect(email.html).toContain("Your strongest focus areas were TOK and AI.");
    expect(email.html).toContain("Retrieval prompts");
    expect(email.text).toContain(
      "Would you still defend this claim? Which evidence would strengthen it now?",
    );
    expect(email.text).toContain("Open notebook dashboard: https://dailysparks.geledtech.com/dashboard");
  });
});
