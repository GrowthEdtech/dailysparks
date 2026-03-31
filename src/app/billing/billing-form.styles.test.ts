import { describe, expect, test } from "vitest";

import {
  BACK_TO_DASHBOARD_CTA_CLASSNAME,
  BACK_TO_DASHBOARD_CTA_STYLE,
} from "./billing-form.styles";

describe("billing form secondary CTA styles", () => {
  test("uses a darker label color for the dashboard link", () => {
    expect(BACK_TO_DASHBOARD_CTA_CLASSNAME).toContain("bg-slate-50");
    expect(BACK_TO_DASHBOARD_CTA_STYLE.color).toBe("#0f172a");
  });
});
