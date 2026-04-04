import { beforeEach, describe, expect, test, vi } from "vitest";

const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({
    sendMail,
  }));

  return {
    sendMailMock: sendMail,
    createTransportMock: createTransport,
  };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

import type { ParentProfile } from "./mvp-types";
import {
  buildOnboardingReminderEmail,
  isOnboardingReminderEmailConfigured,
  sendOnboardingReminderEmail,
} from "./onboarding-reminder-email";

const ORIGINAL_ENV = { ...process.env };

function buildProfile(
  overrides: Partial<ParentProfile> & {
    parent?: Partial<ParentProfile["parent"]>;
    student?: Partial<ParentProfile["student"]>;
  } = {},
): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "parent@example.com",
      fullName: "Parent Example",
      countryCode: "HK",
      deliveryTimeZone: "Asia/Hong_Kong",
      preferredDeliveryLocalTime: "09:00",
      onboardingReminderCount: 0,
      onboardingReminderLastAttemptAt: null,
      onboardingReminderLastSentAt: null,
      onboardingReminderLastStage: null,
      onboardingReminderLastStatus: null,
      onboardingReminderLastMessageId: null,
      onboardingReminderLastError: null,
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
      ...overrides.parent,
    },
    student: {
      id: "student-1",
      parentId: "parent-1",
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
      ...overrides.student,
    },
  };
}

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    GOODNOTES_SMTP_URL: "smtps://info%40geledtech.com:testpass@smtp.gmail.com:465",
    GOODNOTES_FROM_EMAIL: "info@geledtech.com",
    GOODNOTES_FROM_NAME: "Growth Education",
  };
  createTransportMock.mockClear();
  sendMailMock.mockReset();
  sendMailMock.mockResolvedValue({
    messageId: "onboarding-message-id",
  });
});

describe("onboarding reminder email", () => {
  test("builds reminder copy that leads with Goodnotes and keeps Notion secondary", () => {
    const email = buildOnboardingReminderEmail({
      profile: buildProfile(),
      stageIndex: 1,
    });

    expect(email.subject).toMatch(/connect goodnotes/i);
    expect(email.html).toContain("Connect Goodnotes");
    expect(email.html).toContain("Notion is optional");
    expect(email.text).toContain("Connect Goodnotes");
    expect(email.text).toContain("https://dailysparks.geledtech.com/dashboard");
  });

  test("reuses the transactional SMTP configuration to send reminder mail", async () => {
    const result = await sendOnboardingReminderEmail({
      profile: buildProfile(),
      stageIndex: 1,
    });

    expect(isOnboardingReminderEmailConfigured()).toBe(true);
    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0]?.[0]).toMatchObject({
      to: "parent@example.com",
    });
    expect(result).toEqual({
      messageId: "onboarding-message-id",
      subject: expect.stringMatching(/connect goodnotes/i),
    });
  });
});
