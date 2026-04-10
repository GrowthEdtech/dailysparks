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
  buildMarketingLeadStarterKitEmail,
  sendMarketingLeadStarterKitEmail,
} from "./marketing-lead-email";
import type { MarketingLeadRecord } from "./marketing-lead-store-types";

const ORIGINAL_ENV = { ...process.env };

function buildLead(
  overrides: Partial<MarketingLeadRecord> = {},
): MarketingLeadRecord {
  return {
    id: "lead-1",
    email: "parent@example.com",
    fullName: "Parent Example",
    childStageInterest: "MYP",
    source: "ib-parent-starter-kit",
    pagePath: "/ib-parent-starter-kit",
    referrerUrl: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    captureCount: 1,
    deliveryStatus: "pending",
    deliveryMessageId: null,
    deliveryErrorMessage: null,
    deliveredAt: null,
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
    messageId: "starter-kit-message-id",
  });
});

describe("marketing lead starter kit email", () => {
  test("builds a stage-aware starter kit email", () => {
    const mypEmail = buildMarketingLeadStarterKitEmail({
      lead: buildLead({
        childStageInterest: "MYP",
      }),
    });
    const dpEmail = buildMarketingLeadStarterKitEmail({
      lead: buildLead({
        childStageInterest: "DP",
      }),
    });

    expect(mypEmail.subject).toBe("Your Daily Sparks IB Parent Starter Kit");
    expect(mypEmail.html).toContain("MYP families building bridge reading habits");
    expect(mypEmail.html).toContain("Open the starter kit");
    expect(dpEmail.html).toContain("DP families building argument and TOK habits");
  });

  test("sends the starter kit email through the transactional notification channel", async () => {
    const result = await sendMarketingLeadStarterKitEmail({
      lead: buildLead(),
    });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0]?.[0]).toMatchObject({
      to: "parent@example.com",
      subject: "Your Daily Sparks IB Parent Starter Kit",
    });
    expect(result).toEqual({
      sent: true,
      skipped: false,
      reason: null,
      messageId: "starter-kit-message-id",
    });
  });
});
