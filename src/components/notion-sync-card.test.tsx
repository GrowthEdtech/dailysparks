/* eslint-disable @next/next/no-img-element */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import type { ParentProfile } from "../lib/mvp-types";
import NotionSyncCard from "./notion-sync-card";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const initialProfile: ParentProfile = {
  parent: {
    id: "parent_123",
    email: "parent@example.com",
    fullName: "Katherine Parent",
    subscriptionStatus: "trial",
    subscriptionPlan: "monthly",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    trialStartedAt: "2026-04-01T00:00:00.000Z",
    trialEndsAt: "2026-04-15T00:00:00.000Z",
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
    programme: "PYP",
    programmeYear: 5,
    goodnotesEmail: "",
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

describe("NotionSyncCard", () => {
  test("uses the same centered primary CTA treatment as the Goodnotes setup action", () => {
    const markup = renderToStaticMarkup(
      <NotionSyncCard initialProfile={initialProfile} notionConfigured />,
    );

    expect(markup).toContain("Connect Notion");
    expect(markup).toContain("mt-4 flex justify-center");
    expect(markup).toContain(
      "inline-flex min-w-[17rem] items-center justify-center gap-2 rounded-full bg-[#0f172a] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60",
    );
  });

  test("shows verification-needed messaging when the archive exists but sync has not succeeded yet", () => {
    const markup = renderToStaticMarkup(
      <NotionSyncCard
        notionConfigured
        initialProfile={{
          ...initialProfile,
          parent: {
            ...initialProfile.parent,
            notionWorkspaceId: "workspace-1",
            notionWorkspaceName: "Growth Education",
            notionDatabaseId: "db-1",
            notionDatabaseName: "Daily Sparks",
            notionDataSourceId: "data-source-1",
            notionLastSyncStatus: "idle",
          },
        }}
      />,
    );

    expect(markup).toContain("Verification needed");
  });
});
