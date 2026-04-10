import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import type { ParentProfile } from "../../lib/mvp-types";
import BillingForm from "./billing-form";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}));

vi.mock("../../components/account-menu", () => ({
  default: () => <div>Account menu</div>,
}));

const initialProfile: ParentProfile = {
  parent: {
    id: "parent_ck",
    email: "ckx.leung@gmail.com",
    fullName: "C K Leung",
    countryCode: "HK",
    deliveryTimeZone: "Asia/Hong_Kong",
    preferredDeliveryLocalTime: "09:00",
    subscriptionStatus: "trial",
    subscriptionPlan: "yearly",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    trialStartedAt: "2026-04-01T03:59:21.201Z",
    trialEndsAt: "2026-04-08T03:59:21.201Z",
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
    createdAt: "2026-04-01T03:59:21.201Z",
    updatedAt: "2026-04-10T08:00:00.000Z",
  },
  student: {
    id: "student_ck",
    parentId: "parent_ck",
    studentName: "Casey",
    programme: "DP",
    programmeYear: 1,
    interestTags: ["Politics & Society"],
    goodnotesEmail: "casey@goodnotes.email",
    goodnotesConnected: true,
    goodnotesVerifiedAt: "2026-04-09T23:42:41.222Z",
    goodnotesLastTestSentAt: "2026-04-09T23:42:41.222Z",
    goodnotesLastDeliveryStatus: "success",
    goodnotesLastDeliveryMessage: "Welcome note sent.",
    notionConnected: false,
    createdAt: "2026-04-01T03:59:21.201Z",
    updatedAt: "2026-04-10T08:00:00.000Z",
  },
};

describe("BillingForm", () => {
  test("uses a wider three-card desktop billing board on large screens", () => {
    const markup = renderToStaticMarkup(
      <BillingForm initialProfile={initialProfile} initialPricingMarket="intl" />,
    );

    expect(markup).toContain("max-w-7xl");
    expect(markup).toContain("xl:grid-cols-3");
    expect(markup).not.toContain(
      "xl:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)]",
    );
    expect(markup).not.toContain("xl:sticky xl:top-8");
  });

  test("uses flex-based desktop cards so plan actions align on a shared lower edge", () => {
    const markup = renderToStaticMarkup(
      <BillingForm initialProfile={initialProfile} initialPricingMarket="intl" />,
    );

    expect(markup).toContain("xl:items-stretch");
    expect(markup).toContain("flex h-full flex-col");
    expect(markup).toContain("mt-auto pt-6");
  });
});
