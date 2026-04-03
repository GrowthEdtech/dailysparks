import { describe, expect, test } from "vitest";

import type { ParentRecord } from "./mvp-types";
import {
  getDerivedAccessState,
  getDerivedUserTypeLabel,
  getEffectiveAccessStatusLabel,
} from "./access-state";

function createParentRecord(overrides: Partial<ParentRecord> = {}): ParentRecord {
  return {
    id: "parent-1",
    email: "parent@example.com",
    fullName: "Parent Example",
    subscriptionStatus: "trial",
    subscriptionPlan: "monthly",
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
    ...overrides,
  };
}

describe("access-state", () => {
  test("derives trial_expired after the trial end date has passed", () => {
    const state = getDerivedAccessState(
      createParentRecord({
        subscriptionStatus: "trial",
        trialEndsAt: "2026-04-02T00:00:00.000Z",
      }),
      new Date("2026-04-03T00:00:00.000Z"),
    );

    expect(state).toBe("trial_expired");
    expect(getEffectiveAccessStatusLabel(state)).toBe("Trial expired");
    expect(getDerivedUserTypeLabel(state)).toBe("Trial expired family");
  });

  test("keeps active subscriptions active regardless of trial dates", () => {
    const state = getDerivedAccessState(
      createParentRecord({
        subscriptionStatus: "active",
        trialEndsAt: "2026-04-02T00:00:00.000Z",
      }),
      new Date("2026-04-10T00:00:00.000Z"),
    );

    expect(state).toBe("active");
  });
});
