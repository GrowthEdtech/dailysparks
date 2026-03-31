import { describe, expect, test } from "vitest";

import {
  PRIMARY_SUCCESS_CTA_CLASSNAME,
  SECONDARY_SUCCESS_CTA_CLASSNAME,
} from "./success-panel.styles";

describe("success panel CTA styles", () => {
  test("uses high-contrast styling for the primary CTA", () => {
    expect(PRIMARY_SUCCESS_CTA_CLASSNAME).toContain("bg-[#fbbf24]");
    expect(PRIMARY_SUCCESS_CTA_CLASSNAME).toContain("text-[#020617]");
  });

  test("uses darker copy for the secondary CTA", () => {
    expect(SECONDARY_SUCCESS_CTA_CLASSNAME).toContain("bg-slate-50");
    expect(SECONDARY_SUCCESS_CTA_CLASSNAME).toContain("text-[#0f172a]");
  });
});
