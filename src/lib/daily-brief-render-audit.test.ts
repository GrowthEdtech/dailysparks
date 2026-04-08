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

  test("applies the MYP bridge page policy label and limit", async () => {
    const audit = await buildDailyBriefRenderAudit({
      brief: {
        headline: "Students compare coastal cleanup plans",
        scheduledFor: "2026-04-06",
        programme: "MYP",
        editorialCohort: "APAC",
        summary:
          "Students compare trade-offs between cleanup plans and community trust.",
        topicTags: ["Environment", "Communities"],
        briefMarkdown: [
          "What’s happening? Students compare two cleanup approaches.",
          "Why does this matter? Communities need plans that are fair and practical.",
          "Global context Local cleanup choices connect to wider questions of public trust and shared responsibility.",
          "Compare or connect Different cities choose speed, fairness, or resilience in different ways.",
          "Inquiry question - Which plan feels fairest?",
          "Notebook prompt Explain which trade-off matters most.",
        ].join("\n"),
        sourceReferences: [],
      },
      pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      pageCount: 2,
      renderer: "typst",
    });

    expect(audit.layoutVariant).toBe("myp-bridge");
    expect(audit.pagePolicyLabel).toBe("MYP bridge 2-page target");
    expect(audit.pagePolicyPageCountLimit).toBe(2);
    expect(audit.pagePolicyCompliant).toBe(true);
  });

  test("applies the DP academic page policy label and limit", async () => {
    const audit = await buildDailyBriefRenderAudit({
      brief: {
        headline: "Governments debate whether AI regulation can keep up",
        scheduledFor: "2026-04-06",
        programme: "DP",
        editorialCohort: "APAC",
        summary:
          "Governments debate how quickly AI regulation can respond to public risk.",
        topicTags: ["AI", "Policy"],
        briefMarkdown: [
          "3-sentence abstract Governments debate AI regulation. Evidence is still developing. Students should weigh precaution and innovation.",
          "Core issue What should happen when institutions move slower than technology?",
          "Claim Stronger guardrails are justified when scale can amplify harm.",
          "Counterpoint or evidence limit The evidence base is still incomplete.",
          "TOK / essay prompt - When evidence is incomplete, how should societies choose?",
          "Notebook capture Note one claim and one evidence limit.",
        ].join("\n"),
        sourceReferences: [],
      },
      pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      pageCount: 2,
      renderer: "typst",
    });

    expect(audit.layoutVariant).toBe("dp-academic");
    expect(audit.pagePolicyLabel).toBe("DP academic 2-page target");
    expect(audit.pagePolicyPageCountLimit).toBe(2);
    expect(audit.pagePolicyCompliant).toBe(true);
  });
});
