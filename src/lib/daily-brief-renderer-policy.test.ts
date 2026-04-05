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
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/PYP canary/i);
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/Typst/i);
  });

  test("defaults PYP production delivery to typst", () => {
    const policy = resolveDailyBriefRendererPolicy({
      selectedMode: "auto",
      programme: "PYP",
      attachmentMode: "production",
    });

    expect(policy.renderer).toBe("typst");
    expect(policy.selectedMode).toBe("auto");
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/PYP production/i);
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/Typst/i);
  });

  test("allows a rollback flag to push PYP canary back to pdf-lib", () => {
    process.env.DAILY_BRIEF_PYP_CANARY_RENDERER_DEFAULT = "pdf-lib";

    const policy = resolveDailyBriefRendererPolicy({
      selectedMode: "auto",
      programme: "PYP",
      attachmentMode: "canary",
    });

    expect(policy.renderer).toBe("pdf-lib");
    expect(policy.isRollbackActive).toBe(true);
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/rollback/i);
  });

  test("allows a rollback flag to push PYP production back to pdf-lib", () => {
    process.env.DAILY_BRIEF_PYP_PRODUCTION_RENDERER_DEFAULT = "pdf-lib";

    const policy = resolveDailyBriefRendererPolicy({
      selectedMode: "auto",
      programme: "PYP",
      attachmentMode: "production",
    });

    expect(policy.renderer).toBe("pdf-lib");
    expect(policy.isRollbackActive).toBe(true);
    expect(getDailyBriefRendererPolicyLabel(policy)).toMatch(/rollback/i);
  });
});
