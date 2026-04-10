import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  captureMarketingLead,
  listMarketingLeads,
  recordMarketingLeadDelivery,
} from "./marketing-lead-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-marketing-leads-"),
  );
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_MARKETING_LEAD_STORE_PATH: path.join(
      tempDirectory,
      "marketing-leads.json",
    ),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("marketing lead store", () => {
  test("dedupes repeated starter kit captures by email and source", async () => {
    const firstCapture = await captureMarketingLead({
      email: "Parent@Example.com",
      fullName: "Parent Example",
      childStageInterest: "MYP",
      source: "ib-parent-starter-kit",
      pagePath: "/ib-parent-starter-kit",
      referrerUrl: "https://google.com",
      utmSource: "google",
      utmMedium: "organic",
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
    });

    const secondCapture = await captureMarketingLead({
      email: "parent@example.com",
      fullName: "Parent Example",
      childStageInterest: "DP",
      source: "ib-parent-starter-kit",
      pagePath: "/ib-parent-starter-kit",
      referrerUrl: "https://google.com",
      utmSource: "google",
      utmMedium: "organic",
      utmCampaign: "starter-kit",
      utmContent: null,
      utmTerm: null,
    });

    const leads = await listMarketingLeads();

    expect(firstCapture.isNew).toBe(true);
    expect(secondCapture.isNew).toBe(false);
    expect(secondCapture.lead.id).toBe(firstCapture.lead.id);
    expect(leads).toHaveLength(1);
    expect(leads[0]).toEqual(
      expect.objectContaining({
        email: "parent@example.com",
        captureCount: 2,
        childStageInterest: "DP",
        deliveryStatus: "pending",
      }),
    );
  });

  test("records delivery outcomes against the stored lead", async () => {
    const captured = await captureMarketingLead({
      email: "parent@example.com",
      fullName: "Parent Example",
      childStageInterest: "NOT_SURE",
      source: "ib-parent-starter-kit",
      pagePath: "/ib-parent-starter-kit",
      referrerUrl: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
    });

    await recordMarketingLeadDelivery({
      leadId: captured.lead.id,
      status: "sent",
      messageId: "starter-kit-message-id",
    });

    const [storedLead] = await listMarketingLeads({
      email: "parent@example.com",
      source: "ib-parent-starter-kit",
      limit: 1,
    });

    expect(storedLead).toEqual(
      expect.objectContaining({
        id: captured.lead.id,
        deliveryStatus: "sent",
        deliveryMessageId: "starter-kit-message-id",
      }),
    );
    expect(storedLead.deliveredAt).toBeTruthy();
  });
});
