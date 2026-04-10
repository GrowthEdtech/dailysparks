import { describe, expect, test } from "vitest";

import {
  BILLING_CONTENT_GRID_CLASSNAME,
  BILLING_HEADER_SHELL_CLASSNAME,
  BILLING_MAIN_SHELL_CLASSNAME,
  BILLING_PLAN_GRID_CLASSNAME,
  BILLING_SUMMARY_COLUMN_CLASSNAME,
  BACK_TO_DASHBOARD_CTA_CLASSNAME,
  BACK_TO_DASHBOARD_CTA_STYLE,
  DOWNLOAD_PDF_CTA_CLASSNAME,
  DOWNLOAD_PDF_CTA_STYLE,
} from "./billing-form.styles";

describe("billing layout styles", () => {
  test("expands the page shell for desktop billing layouts", () => {
    expect(BILLING_HEADER_SHELL_CLASSNAME).toContain("max-w-6xl");
    expect(BILLING_MAIN_SHELL_CLASSNAME).toContain("max-w-6xl");
    expect(BILLING_CONTENT_GRID_CLASSNAME).toContain(
      "xl:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)]",
    );
    expect(BILLING_SUMMARY_COLUMN_CLASSNAME).toContain("xl:sticky");
    expect(BILLING_PLAN_GRID_CLASSNAME).toContain("xl:grid-cols-2");
  });
});

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
