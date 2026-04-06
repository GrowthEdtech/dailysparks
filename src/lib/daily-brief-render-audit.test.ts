import { beforeEach, describe, expect, test, vi } from "vitest";

const { countPdfPagesMock } = vi.hoisted(() => ({
  countPdfPagesMock: vi.fn(),
}));

vi.mock("./pdf-page-count", () => ({
  countPdfPages: (...args: unknown[]) => countPdfPagesMock(...args),
}));

import { buildDailyBriefRenderAudit } from "./daily-brief-render-audit";

describe("buildDailyBriefRenderAudit", () => {
  beforeEach(() => {
    countPdfPagesMock.mockReset();
  });

  test("uses a provided page count without touching pdfjs page parsing", async () => {
    const audit = await buildDailyBriefRenderAudit({
      brief: {
        headline: "Students compare coastal cleanup plans",
        scheduledFor: "2026-04-06",
        programme: "PYP",
        editorialCohort: "APAC",
        summary:
          "Students compare two cleanup plans and discuss why communities make different trade-offs.",
        topicTags: ["Environment", "Communities"],
        briefMarkdown: [
          "What’s happening? Students are comparing two cleanup approaches.",
          "Why does this matter? Coastal communities need plans that are fair and practical.",
          "Picture it Imagine choosing between a faster cleanup and a more lasting prevention plan.",
        ].join("\n"),
        sourceReferences: [],
      },
      pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      pageCount: 1,
      renderer: "typst",
      auditedAt: "2026-04-06T02:00:00.000Z",
    });

    expect(countPdfPagesMock).not.toHaveBeenCalled();
    expect(audit).toMatchObject({
      renderer: "typst",
      layoutVariant: "pyp-one-page",
      pageCount: 1,
      onePageCompliant: true,
      pagePolicyCompliant: true,
      auditedAt: "2026-04-06T02:00:00.000Z",
    });
  });
});
