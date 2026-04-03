import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { getProfileByParentIdMock, notFoundMock } = vi.hoisted(() => ({
  getProfileByParentIdMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("../../../../../lib/mvp-store", () => ({
  getProfileByParentId: getProfileByParentIdMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import UserDetailAdminPage from "./page";

describe("UserDetailAdminPage", () => {
  beforeEach(() => {
    getProfileByParentIdMock.mockReset();
    notFoundMock.mockClear();
  });

  test("renders overview, billing, and delivery sections", async () => {
    getProfileByParentIdMock.mockResolvedValue({
      parent: {
        id: "parent-1",
        email: "parent@example.com",
        fullName: "Parent Example",
        subscriptionStatus: "trial",
        subscriptionPlan: "monthly",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        trialStartedAt: "2026-04-01T00:00:00.000Z",
        trialEndsAt: "2026-04-08T00:00:00.000Z",
        subscriptionActivatedAt: null,
        subscriptionRenewalAt: null,
        latestInvoiceId: "in_123",
        latestInvoiceNumber: "DS-2026-0001",
        latestInvoiceStatus: "open",
        latestInvoiceHostedUrl: "https://example.com/invoice",
        latestInvoicePdfUrl: "https://example.com/invoice.pdf",
        latestInvoiceAmountPaid: 0,
        latestInvoiceCurrency: "hkd",
        latestInvoicePaidAt: null,
        latestInvoicePeriodStart: "2026-04-01T00:00:00.000Z",
        latestInvoicePeriodEnd: "2026-05-01T00:00:00.000Z",
        notionWorkspaceId: "workspace-1",
        notionWorkspaceName: "Family Workspace",
        notionBotId: "bot-1",
        notionDatabaseId: "db-1",
        notionDatabaseName: "Daily Sparks",
        notionDataSourceId: "data-source-1",
        notionAuthorizedAt: "2026-04-02T00:00:00.000Z",
        notionLastSyncedAt: "2026-04-02T03:00:00.000Z",
        notionLastSyncStatus: "success",
        notionLastSyncMessage: "Synced.",
        notionLastSyncPageId: "page-1",
        notionLastSyncPageUrl: "https://notion.so/page-1",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-02T03:00:00.000Z",
      },
      student: {
        id: "student-1",
        parentId: "parent-1",
        studentName: "Katherine",
        programme: "DP",
        programmeYear: 1,
        goodnotesEmail: "katherine@goodnotes.email",
        goodnotesConnected: true,
        goodnotesVerifiedAt: "2026-04-02T00:00:00.000Z",
        goodnotesLastTestSentAt: "2026-04-02T02:00:00.000Z",
        goodnotesLastDeliveryStatus: "success",
        goodnotesLastDeliveryMessage: "Ready.",
        notionConnected: true,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-02T03:00:00.000Z",
      },
    });

    const markup = renderToStaticMarkup(
      await UserDetailAdminPage({
        params: Promise.resolve({ parentId: "parent-1" }),
      }),
    );

    expect(markup).toContain("Back to Users");
    expect(markup).toContain("Family overview");
    expect(markup).toContain("Student profile");
    expect(markup).toContain("Billing snapshot");
    expect(markup).toContain("Delivery channels");
    expect(markup).toContain("Parent Example");
    expect(markup).toContain("Trial family");
    expect(markup).toContain("DP 1");
    expect(markup).toContain("Monthly plan");
    expect(markup).toContain("Goodnotes healthy");
    expect(markup).toContain("Notion healthy");
    expect(markup).toContain("Goodnotes status");
    expect(markup).toContain("Ready.");
    expect(markup).toContain("Notion status");
    expect(markup).toContain("Synced.");
  });

  test("renders expired trial families with the derived user type", async () => {
    getProfileByParentIdMock.mockResolvedValue({
      parent: {
        id: "parent-2",
        email: "expired@example.com",
        fullName: "Expired Trial Parent",
        subscriptionStatus: "trial",
        subscriptionPlan: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        trialStartedAt: "2026-03-20T00:00:00.000Z",
        trialEndsAt: "2026-03-27T00:00:00.000Z",
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
        createdAt: "2026-03-20T00:00:00.000Z",
        updatedAt: "2026-03-27T00:00:00.000Z",
      },
      student: {
        id: "student-2",
        parentId: "parent-2",
        studentName: "Mia",
        programme: "PYP",
        programmeYear: 5,
        goodnotesEmail: "",
        goodnotesConnected: false,
        goodnotesVerifiedAt: null,
        goodnotesLastTestSentAt: null,
        goodnotesLastDeliveryStatus: null,
        goodnotesLastDeliveryMessage: null,
        notionConnected: false,
        createdAt: "2026-03-20T00:00:00.000Z",
        updatedAt: "2026-03-27T00:00:00.000Z",
      },
    });

    const markup = renderToStaticMarkup(
      await UserDetailAdminPage({
        params: Promise.resolve({ parentId: "parent-2" }),
      }),
    );

    expect(markup).toContain("Trial expired family");
  });

  test("calls notFound when the parent profile does not exist", async () => {
    getProfileByParentIdMock.mockResolvedValue(null);

    await expect(
      UserDetailAdminPage({
        params: Promise.resolve({ parentId: "missing-parent" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
