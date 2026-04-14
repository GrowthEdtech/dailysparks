import { describe, expect, test } from "vitest";

import {
  PRIMARY_SUCCESS_CTA_CLASSNAME,
  SUCCESS_HEADER_SHELL_CLASSNAME,
  SUCCESS_MAIN_SHELL_CLASSNAME,
  SUCCESS_PRIMARY_PANEL_CLASSNAME,
  SUCCESS_SECONDARY_PANEL_CLASSNAME,
  SECONDARY_SUCCESS_CTA_CLASSNAME,
} from "./success-panel.styles";

describe("success panel layout styles", () => {
  test("uses a desktop-width shell instead of the narrow mobile stack", () => {
    expect(SUCCESS_HEADER_SHELL_CLASSNAME).toContain("max-w-7xl");
    expect(SUCCESS_HEADER_SHELL_CLASSNAME).toContain("xl:items-center");
    expect(SUCCESS_MAIN_SHELL_CLASSNAME).toContain("max-w-7xl");
    expect(SUCCESS_MAIN_SHELL_CLASSNAME).toContain("xl:grid-cols-[");
  });

  test("gives the confirmation and summary cards a desktop-ready panel rhythm", () => {
    expect(SUCCESS_PRIMARY_PANEL_CLASSNAME).toContain("rounded-[32px]");
    expect(SUCCESS_PRIMARY_PANEL_CLASSNAME).toContain("xl:min-h-[420px]");
    expect(SUCCESS_SECONDARY_PANEL_CLASSNAME).toContain("rounded-[32px]");
    expect(SUCCESS_SECONDARY_PANEL_CLASSNAME).toContain("xl:self-start");
  });
});

describe("success panel CTA styles", () => {
  test("uses high-contrast styling for the primary CTA", () => {
    expect(PRIMARY_SUCCESS_CTA_CLASSNAME).toContain("bg-[#fbbf24]");
    expect(PRIMARY_SUCCESS_CTA_CLASSNAME).toContain("text-[#020617]");
  });

  test("uses darker copy for the secondary CTA", () => {
    expect(SECONDARY_SUCCESS_CTA_CLASSNAME).toContain("bg-slate-50");
    expect(SECONDARY_SUCCESS_CTA_CLASSNAME).toContain("text-slate-900");
  });
});
