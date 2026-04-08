import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import type { ParentProfile } from "../../lib/mvp-types";
import DashboardForm from "./dashboard-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("../../components/account-menu", () => ({
  default: () => <div>Account menu</div>,
}));

vi.mock("../../components/goodnotes-delivery-card", () => ({
  default: () => <div>Goodnotes card</div>,
}));

vi.mock("../../components/notion-sync-card", () => ({
  default: () => <div>Notion card</div>,
}));

const initialProfile: ParentProfile = {
  parent: {
    id: "parent_123",
    email: "parent@example.com",
    fullName: "Katherine Parent",
    countryCode: "HK",
    deliveryTimeZone: "Asia/Hong_Kong",
    preferredDeliveryLocalTime: "09:00",
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
  },
  student: {
    id: "student_123",
    parentId: "parent_123",
    studentName: "Katherine",
    programme: "MYP",
    programmeYear: 3,
    interestTags: ["Tech & Innovation", "Society & Culture"],
    goodnotesEmail: "katherine@goodnotes.email",
    goodnotesConnected: false,
    goodnotesVerifiedAt: null,
    goodnotesLastTestSentAt: null,
    goodnotesLastDeliveryStatus: "idle",
    goodnotesLastDeliveryMessage: null,
    notionConnected: false,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
};

describe("DashboardForm", () => {
  test("uses a wide desktop container and two-column layout instead of mobile-only stacking", () => {
    const markup = renderToStaticMarkup(
      <DashboardForm initialProfile={initialProfile} notionConfigured={true} />,
    );

    expect(markup).toContain("max-w-6xl");
    expect(markup).toContain(
      "grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]",
    );
    expect(markup).toContain("order-2 space-y-6 lg:order-1");
    expect(markup).toContain("order-1 space-y-6 lg:order-2");
    expect(markup).not.toContain("max-w-md flex-col gap-6 px-4");
  });

  test("renders the child name setup card when the persisted name is still the placeholder", () => {
    const markup = renderToStaticMarkup(
      <DashboardForm
        initialProfile={{
          ...initialProfile,
          student: {
            ...initialProfile.student,
            studentName: "Student",
          },
        }}
        notionConfigured={true}
      />,
    );

    expect(markup).toContain("Add your child&#x27;s first name");
    expect(markup).toContain("Save child name");
  });

  test("keeps the child name card visible after setup and switches it into an editable saved state", () => {
    const markup = renderToStaticMarkup(
      <DashboardForm initialProfile={initialProfile} notionConfigured={true} />,
    );

    expect(markup).toContain("Child profile");
    expect(markup).toContain("Saved");
    expect(markup).toContain("Current child name");
    expect(markup).toContain("Update child name");
    expect(markup).not.toContain("Add your child&#x27;s first name");
  });

  test("renders a delivery timing card with country, time zone, and local send time controls", () => {
    const markup = renderToStaticMarkup(
      <DashboardForm initialProfile={initialProfile} notionConfigured={true} />,
    );

    expect(markup).toContain("Delivery timing");
    expect(markup).toContain("Deliver daily briefs in your local time");
    expect(markup).toContain("Country / region");
    expect(markup).toContain("Local delivery time");
    expect(markup).toContain("Time zone");
    expect(markup).toContain("Save delivery schedule");
    expect(markup).toContain("Hong Kong");
    expect(markup).toContain("9:00 AM");
    expect(markup).toContain("Asia/Hong Kong");
  });

  test("uses a darker text color for typed child names than the placeholder", () => {
    const markup = renderToStaticMarkup(
      <DashboardForm
        initialProfile={{
          ...initialProfile,
          student: {
            ...initialProfile.student,
            studentName: "Student",
          },
        }}
        notionConfigured={true}
      />,
    );

    expect(markup).toContain("text-[#0f172a]");
    expect(markup).toContain("placeholder:text-slate-300");
    expect(markup).toContain("caret-[#0f172a]");
  });

  test("soft-hides PYP from the public programme selector and shows MYP interest focus options", () => {
    const markup = renderToStaticMarkup(
      <DashboardForm initialProfile={initialProfile} notionConfigured={true} />,
    );

    expect(markup).toContain("Interest focus");
    expect(markup).toContain("Tech &amp; Innovation");
    expect(markup).toContain("Society &amp; Culture");
    expect(markup).not.toContain('<span class="text-base font-bold">PYP</span>');
  });

  test("shows a legacy-mode note when the existing profile is still on PYP", () => {
    const markup = renderToStaticMarkup(
      <DashboardForm
        initialProfile={{
          ...initialProfile,
          student: {
            ...initialProfile.student,
            programme: "PYP",
            programmeYear: 5,
            interestTags: [],
          },
        }}
        notionConfigured={true}
      />,
    );

    expect(markup).toContain("PYP legacy mode");
    expect(markup).toContain("New public setup is now focused on MYP and DP");
  });
});
