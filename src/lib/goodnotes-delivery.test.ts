import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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

import {
  createGoodnotesBriefPdf,
  createGoodnotesTestBriefPdf,
  isGoodnotesDeliveryConfigured,
  sendBriefToGoodnotes,
  sendTestBriefToGoodnotes,
} from "./goodnotes-delivery";
import type { ParentProfile } from "./mvp-types";
import type { GeneratedDailyBriefDraft } from "./daily-brief-orchestrator";

const ORIGINAL_ENV = { ...process.env };

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

function createGeneratedBrief(
  overrides: Partial<GeneratedDailyBriefDraft> = {},
): GeneratedDailyBriefDraft {
  return {
    scheduledFor: "2026-04-03",
    headline: "PYP ocean mapping brief",
    summary: "A generated summary about how students help scientists map sea turtles.",
    programme: "PYP",
    status: "draft",
    topicTags: ["oceans", "science"],
    sourceReferences: [
      {
        sourceId: "bbc",
        sourceName: "BBC",
        sourceDomain: "bbc.com",
        articleTitle: "Students map sea turtles",
        articleUrl: "https://www.bbc.com/news/world-123",
      },
    ],
    aiConnectionId: "nf-relay",
    aiConnectionName: "NF Relay",
    aiModel: "gpt-5.4",
    promptPolicyId: "policy-1",
    promptVersionLabel: "v1.0.0",
    promptVersion: "v1.0.0",
    repetitionRisk: "low",
    repetitionNotes: "No overlapping briefs in the recent memory window.",
    adminNotes: "",
    briefMarkdown:
      "## Today\nStudents are helping scientists understand turtle migration routes.",
    resolvedPrompt: "Resolved prompt text",
    sourceClusterKey: "students map sea turtles",
    candidateCount: 2,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-03T02:00:00.000Z"));
  process.env = {
    ...ORIGINAL_ENV,
    GOODNOTES_SMTP_URL: "smtps://info%40geledtech.com:testpass@smtp.gmail.com:465",
    GOODNOTES_FROM_EMAIL: "info@geledtech.com",
    GOODNOTES_FROM_NAME: "Growth Education Limited",
  };
  sendMailMock.mockReset();
  createTransportMock.mockClear();
  sendMailMock.mockResolvedValue({
    messageId: "smtp-message-id",
  });
});

afterEach(() => {
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV };
});

describe("goodnotes delivery", () => {
  test("reports when SMTP delivery is configured", () => {
    expect(isGoodnotesDeliveryConfigured()).toBe(true);

    delete process.env.GOODNOTES_SMTP_URL;

    expect(isGoodnotesDeliveryConfigured()).toBe(false);
  });

  test("creates a PDF attachment for the test brief", async () => {
    const pdf = await createGoodnotesTestBriefPdf(createProfile());

    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("sends the test brief to the user's Goodnotes email as a PDF attachment", async () => {
    const profile = createProfile();

    const result = await sendTestBriefToGoodnotes(profile);

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0]?.[0]).toMatchObject({
      to: "katherine@goodnotes.email",
      from: "Growth Education Limited <info@geledtech.com>",
      subject: expect.stringMatching(/Daily Sparks/i),
    });
    expect(sendMailMock.mock.calls[0]?.[0].attachments?.[0]).toMatchObject({
      contentType: "application/pdf",
      filename: "2026-04-03_DailySparks_TestBrief_MYP_delivery-check_test.pdf",
    });
    expect(result).toMatchObject({
      messageId: "smtp-message-id",
      attachmentFileName:
        "2026-04-03_DailySparks_TestBrief_MYP_delivery-check_test.pdf",
    });
  });

  test("creates a PDF attachment for a generated daily brief", async () => {
    const pdf = await createGoodnotesBriefPdf(
      createProfile(),
      createGeneratedBrief(),
    );

    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("sends a generated daily brief to Goodnotes with brief-based metadata", async () => {
    const profile = createProfile();
    const brief = createGeneratedBrief();

    const result = await sendBriefToGoodnotes(profile, brief);

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0]?.[0]).toMatchObject({
      to: "katherine@goodnotes.email",
      from: "Growth Education Limited <info@geledtech.com>",
      subject: "Daily Sparks PYP brief for Katherine",
      text: expect.stringContaining("PYP ocean mapping brief"),
    });
    expect(sendMailMock.mock.calls[0]?.[0].attachments?.[0]).toMatchObject({
      contentType: "application/pdf",
      filename:
        "2026-04-03_DailySparks_DailyBrief_PYP_pyp-ocean-mapping-brief.pdf",
    });
    expect(result).toMatchObject({
      messageId: "smtp-message-id",
      attachmentFileName:
        "2026-04-03_DailySparks_DailyBrief_PYP_pyp-ocean-mapping-brief.pdf",
    });
  });

  test("adds a canary suffix to generated brief attachment file names", async () => {
    const profile = createProfile();
    const brief = createGeneratedBrief({
      headline: "Trump removes US Attorney General Pam Bondi",
      scheduledFor: "2026-04-06",
      programme: "PYP",
    });

    const result = await sendBriefToGoodnotes(profile, brief, {
      attachmentMode: "canary",
    });

    expect(sendMailMock.mock.calls[0]?.[0].attachments?.[0]).toMatchObject({
      contentType: "application/pdf",
      filename:
        "2026-04-06_DailySparks_DailyBrief_PYP_trump-removes-us-attorney-general-pam-bondi_canary.pdf",
    });
    expect(result).toMatchObject({
      messageId: "smtp-message-id",
      attachmentFileName:
        "2026-04-06_DailySparks_DailyBrief_PYP_trump-removes-us-attorney-general-pam-bondi_canary.pdf",
    });
  });
});
