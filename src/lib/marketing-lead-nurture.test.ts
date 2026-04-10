import { describe, expect, test } from "vitest";

import { assessMarketingLeadNurture } from "./marketing-lead-nurture";
import type { MarketingLeadRecord } from "./marketing-lead-store-types";

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
    deliveryStatus: "sent",
    deliveryMessageId: "starter-kit-id",
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

describe("marketing lead nurture assessment", () => {
  test("marks the first nurture email due after the 24 hour window", () => {
    const assessment = assessMarketingLeadNurture({
      lead: buildLead(),
      now: new Date("2026-04-11T01:00:00.000Z"),
      hasParentProfile: false,
    });

    expect(assessment.eligible).toBe(true);
    expect(assessment.due).toBe(true);
    expect(assessment.stage).toEqual(
      expect.objectContaining({
        index: 1,
      }),
    );
  });

  test("waits until the next stage delay has elapsed", () => {
    const assessment = assessMarketingLeadNurture({
      lead: buildLead({
        nurtureEmailCount: 1,
        nurtureLastStage: 1,
        nurtureLastStatus: "sent",
        nurtureLastSentAt: "2026-04-11T01:00:00.000Z",
      }),
      now: new Date("2026-04-13T00:00:00.000Z"),
      hasParentProfile: false,
    });

    expect(assessment.eligible).toBe(true);
    expect(assessment.due).toBe(false);
    expect(assessment.reason).toMatch(/not reached/i);
  });

  test("skips leads that have already converted into a parent profile", () => {
    const assessment = assessMarketingLeadNurture({
      lead: buildLead(),
      now: new Date("2026-04-12T00:00:00.000Z"),
      hasParentProfile: true,
    });

    expect(assessment.eligible).toBe(false);
    expect(assessment.due).toBe(false);
    expect(assessment.reason).toMatch(/already converted/i);
  });

  test("stops after all nurture stages have already been attempted", () => {
    const assessment = assessMarketingLeadNurture({
      lead: buildLead({
        nurtureEmailCount: 3,
        nurtureLastStage: 3,
        nurtureLastStatus: "sent",
      }),
      now: new Date("2026-04-20T00:00:00.000Z"),
      hasParentProfile: false,
    });

    expect(assessment.eligible).toBe(false);
    expect(assessment.due).toBe(false);
    expect(assessment.reason).toMatch(/already been attempted/i);
  });
});
