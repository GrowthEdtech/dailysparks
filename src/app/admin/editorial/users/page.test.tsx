import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { listParentProfilesMock } = vi.hoisted(() => ({
  listParentProfilesMock: vi.fn(),
}));

vi.mock("../../../../lib/mvp-store", () => ({
  listParentProfiles: listParentProfilesMock,
}));

import UsersAdminPage from "./page";

describe("UsersAdminPage", () => {
  beforeEach(() => {
    listParentProfilesMock.mockReset();
  });

  test("renders an honest empty state when no families exist", async () => {
    listParentProfilesMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await UsersAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("No families have registered yet");
    expect(markup).toContain("user operations list will appear here");
  });

  test("renders parent registration, user type, programme, and billing context", async () => {
    listParentProfilesMock.mockResolvedValue([
      {
        parent: {
          id: "parent-1",
          email: "parent@example.com",
          fullName: "Parent Example",
          subscriptionStatus: "active",
          subscriptionPlan: "yearly",
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_123",
          trialStartedAt: "2026-04-01T00:00:00.000Z",
          trialEndsAt: "2026-04-08T00:00:00.000Z",
          subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
          subscriptionRenewalAt: "2026-05-02T00:00:00.000Z",
          latestInvoiceId: "in_123",
          latestInvoiceNumber: "DS-2026-0001",
          latestInvoiceStatus: "paid",
          latestInvoiceHostedUrl: "https://example.com/invoice",
          latestInvoicePdfUrl: "https://example.com/invoice.pdf",
          latestInvoiceAmountPaid: 29999,
          latestInvoiceCurrency: "hkd",
          latestInvoicePaidAt: "2026-04-02T01:00:00.000Z",
          latestInvoicePeriodStart: "2026-04-02T00:00:00.000Z",
          latestInvoicePeriodEnd: "2026-05-02T00:00:00.000Z",
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
          programme: "MYP",
          programmeYear: 3,
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
      },
    ]);

    const markup = renderToStaticMarkup(
      await UsersAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Parent Example");
    expect(markup).toContain("parent@example.com");
    expect(markup).toContain("Active family");
    expect(markup).toContain("MYP 3");
    expect(markup).toContain("Yearly plan");
    expect(markup).toContain("Invoice paid");
    expect(markup).toContain("Goodnotes ready");
    expect(markup).toContain("Notion ready");
    expect(markup).toContain("/admin/editorial/users/parent-1");
  });
});
