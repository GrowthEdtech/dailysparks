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

import {
  buildMarketingLeadNurtureEmail,
  sendMarketingLeadNurtureEmail,
} from "./marketing-lead-nurture-email";
import type { MarketingLeadRecord } from "./marketing-lead-store-types";

const ORIGINAL_ENV = { ...process.env };

function buildLead(
  overrides: Partial<MarketingLeadRecord> = {},
): MarketingLeadRecord {
  return {
    id: "lead-1",
    email: "parent@example.com",
    fullName: "Parent Example",
    childStageInterest: "DP",
    source: "ib-parent-starter-kit",
    pagePath: "/ib-parent-starter-kit",
    referrerUrl: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    captureCount: 1,
    deliveryStatus: "sent",
    deliveryMessageId: "starter-kit-message-id",
    deliveryErrorMessage: null,
    deliveredAt: "2026-04-10T00:00:00.000Z",
    nurtureEmailCount: 0,
    nurtureLastAttemptAt: null,
    nurtureLastSentAt: null,
    nurtureLastStage: null,
    nurtureLastStatus: null,
    nurtureLastMessageId: null,
    nurtureLastError: null,
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    ...overrides,
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
    messageId: "nurture-message-id",
  });
});

describe("marketing lead nurture email", () => {
  test("builds stage-aware nurture content that pushes trial start", () => {
    const stageOneEmail = buildMarketingLeadNurtureEmail({
      lead: buildLead({
        childStageInterest: "MYP",
      }),
      stageIndex: 1,
    });
    const stageThreeEmail = buildMarketingLeadNurtureEmail({
      lead: buildLead(),
      stageIndex: 3,
    });

    expect(stageOneEmail.subject).toMatch(/next step/i);
    expect(stageOneEmail.html).toContain("MYP families building bridge reading habits");
    expect(stageOneEmail.html).toContain("/login");
    expect(stageThreeEmail.subject).toMatch(/last reminder|final reminder/i);
    expect(stageThreeEmail.html).toContain("Start your 7-day trial");
  });

  test("sends the nurture email through the transactional notification channel", async () => {
    const result = await sendMarketingLeadNurtureEmail({
      lead: buildLead(),
      stageIndex: 2,
    });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0]?.[0]).toMatchObject({
      to: "parent@example.com",
    });
    expect(result).toEqual({
      sent: true,
      skipped: false,
      reason: null,
      messageId: "nurture-message-id",
    });
  });
});
