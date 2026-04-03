/* eslint-disable @next/next/no-img-element */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import type { ParentProfile } from "../lib/mvp-types";
import { deliveryPrimaryButtonClassName } from "./delivery-channel-button-styles";
import GoodnotesDeliveryCard from "./goodnotes-delivery-card";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
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
    goodnotesEmail: "katherine@goodnotes.email",
    goodnotesConnected: false,
    goodnotesVerifiedAt: null,
    goodnotesLastTestSentAt: null,
    goodnotesLastDeliveryStatus: "idle",
    goodnotesLastDeliveryMessage:
      "Goodnotes destination saved. Send a welcome note to confirm this destination.",
    notionConnected: false,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
};

describe("GoodnotesDeliveryCard", () => {
  test("uses welcome note wording when the destination is saved but not yet connected", () => {
    const markup = renderToStaticMarkup(
      <GoodnotesDeliveryCard initialProfile={initialProfile} />,
    );

    expect(markup).toContain("Send welcome note");
    expect(markup).toContain(
      "Goodnotes destination saved. Send a welcome note to confirm this destination.",
    );
  });

  test("matches the shared primary CTA width and centered layout used by Notion", () => {
    const markup = renderToStaticMarkup(
      <GoodnotesDeliveryCard initialProfile={initialProfile} />,
    );

    expect(markup).toContain(deliveryPrimaryButtonClassName);
    expect(markup).toContain("flex justify-center");
    expect(markup).not.toContain("sm:col-span-2");
  });
});
