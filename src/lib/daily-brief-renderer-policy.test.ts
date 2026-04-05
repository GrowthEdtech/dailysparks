import { afterEach, describe, expect, test } from "vitest";

import {
  getDailyBriefRendererPolicyLabel,
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
});
