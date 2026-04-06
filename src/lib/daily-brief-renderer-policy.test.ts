import { afterEach, describe, expect, test } from "vitest";

import {
  getDailyBriefRendererPolicyLabel,
  resolveDailyBriefRendererFromHistory,
  resolveDailyBriefRendererPolicy,
} from "./daily-brief-renderer-policy";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("daily brief renderer policy", () => {
  test("defaults PYP canary delivery to typst", () => {
    const policy = resolveDailyBriefRendererPolicy({
      selectedMode: "auto",
      programme: "PYP",
      attachmentMode: "canary",
    });

    expect(policy.renderer).toBe("typst");
    expect(policy.selectedMode).toBe("auto");
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/canary/i);
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/Typst live/i);
  });

  test("defaults PYP production delivery to typst", () => {
    const policy = resolveDailyBriefRendererPolicy({
      selectedMode: "auto",
      programme: "PYP",
      attachmentMode: "production",
    });

    expect(policy.renderer).toBe("typst");
    expect(policy.selectedMode).toBe("auto");
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/production/i);
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/Typst live/i);
  });

  test("defaults MYP canary delivery to typst", () => {
    const policy = resolveDailyBriefRendererPolicy({
      selectedMode: "auto",
      programme: "MYP",
      attachmentMode: "canary",
    });

    expect(policy.renderer).toBe("typst");
    expect(policy.selectedMode).toBe("auto");
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/canary/i);
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/Typst live/i);
  });

  test("defaults MYP production delivery to typst", () => {
    const policy = resolveDailyBriefRendererPolicy({
      selectedMode: "auto",
      programme: "MYP",
      attachmentMode: "production",
    });

    expect(policy.renderer).toBe("typst");
    expect(policy.selectedMode).toBe("auto");
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/production/i);
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/Typst live/i);
  });

  test("defaults DP production delivery to typst", () => {
    const policy = resolveDailyBriefRendererPolicy({
      selectedMode: "auto",
      programme: "DP",
      attachmentMode: "production",
    });

    expect(policy.renderer).toBe("typst");
    expect(policy.selectedMode).toBe("auto");
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/production/i);
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/Typst live/i);
  });

  test("prefers the renderer already recorded on delivery receipts when retrying", () => {
    const resolution = resolveDailyBriefRendererFromHistory({
      brief: {
        programme: "PYP",
        renderAudit: null,
        deliveryReceipts: [
          {
            parentId: "parent-1",
            parentEmail: "family@example.com",
            channel: "goodnotes",
            renderer: "typst",
            attachmentFileName: "brief.pdf",
            externalId: "smtp-1",
            externalUrl: null,
          },
        ],
      },
      attachmentMode: "production",
    });

    expect(resolution.renderer).toBe("typst");
    expect(resolution.source).toBe("delivery-receipt");
  });

  test("falls back to render audit when no delivery receipt renderer is recorded", () => {
    const resolution = resolveDailyBriefRendererFromHistory({
      brief: {
        programme: "MYP",
        renderAudit: {
          renderer: "typst",
          layoutVariant: "myp-compare",
          pageCount: 2,
          onePageCompliant: null,
          pagePolicyLabel: "MYP two-page target",
          pagePolicyPageCountLimit: 2,
          pagePolicyCompliant: true,
          auditedAt: "2026-04-06T08:00:00.000Z",
        },
        deliveryReceipts: [],
      },
      attachmentMode: "canary",
    });

    expect(resolution.renderer).toBe("typst");
    expect(resolution.source).toBe("render-audit");
  });

  test("falls back to the current policy when no renderer snapshot exists", () => {
    const resolution = resolveDailyBriefRendererFromHistory({
      brief: {
        programme: "DP",
        renderAudit: null,
        deliveryReceipts: [],
      },
      attachmentMode: "production",
    });

    expect(resolution.renderer).toBe("typst");
    expect(resolution.source).toBe("current-policy");
  });
});
