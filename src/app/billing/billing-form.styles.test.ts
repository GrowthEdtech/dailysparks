import { describe, expect, test } from "vitest";

import {
  BACK_TO_DASHBOARD_CTA_CLASSNAME,
  BACK_TO_DASHBOARD_CTA_STYLE,
  DOWNLOAD_PDF_CTA_CLASSNAME,
  DOWNLOAD_PDF_CTA_STYLE,
} from "./billing-form.styles";

describe("billing form secondary CTA styles", () => {
  test("uses a darker label color for the dashboard link", () => {
    expect(BACK_TO_DASHBOARD_CTA_CLASSNAME).toContain("bg-slate-50");
    expect(BACK_TO_DASHBOARD_CTA_STYLE.color).toBe("#0f172a");
  });

  test("uses a darker label color for the invoice PDF link", () => {
    expect(DOWNLOAD_PDF_CTA_CLASSNAME).toContain("bg-slate-50");
    expect(DOWNLOAD_PDF_CTA_STYLE.color).toBe("#0f172a");
  });
});
