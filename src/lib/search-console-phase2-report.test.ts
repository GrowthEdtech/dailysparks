import { describe, expect, test } from "vitest";

import {
  buildPhase2SearchConsoleReport,
  getPhase2PublicSeoUrls,
  isIndexedCoverageState,
} from "./search-console-phase2-report";

describe("search console phase 2 report", () => {
  test("detects indexed coverage states conservatively", () => {
    expect(isIndexedCoverageState("Submitted and indexed")).toBe(true);
    expect(isIndexedCoverageState("Indexed, not submitted in sitemap")).toBe(
      true,
    );
    expect(isIndexedCoverageState("Submitted URL not indexed")).toBe(false);
    expect(isIndexedCoverageState("Crawled - currently not indexed")).toBe(
      false,
    );
    expect(isIndexedCoverageState(undefined)).toBe(false);
  });

  test("builds a summary for the five public SEO pages", () => {
    const urls = getPhase2PublicSeoUrls("https://dailysparks.geledtech.com");

    const report = buildPhase2SearchConsoleReport({
      siteUrl: "https://dailysparks.geledtech.com",
      rows: [
        {
          keys: [urls[0]],
          clicks: 4,
          impressions: 120,
          ctr: 0.033,
          position: 12.4,
        },
        {
          keys: [urls[1]],
          clicks: 2,
          impressions: 75,
          ctr: 0.026,
          position: 16.1,
        },
      ],
      inspections: [
        {
          inspectionUrl: urls[0],
          coverageState: "Submitted and indexed",
          verdict: "PASS",
          lastCrawlTime: "2026-04-08T12:00:00Z",
        },
        {
          inspectionUrl: urls[1],
          coverageState: "Submitted URL not indexed",
          verdict: "FAIL",
          lastCrawlTime: "2026-04-07T12:00:00Z",
        },
      ],
      sitemap: {
        submitted: 10,
        indexed: 7,
        errors: 0,
        warnings: 0,
      },
    });

    expect(report.totals.trackedPageCount).toBe(5);
    expect(report.totals.pagesWithImpressions).toBe(2);
    expect(report.totals.totalImpressions).toBe(195);
    expect(report.totals.totalClicks).toBe(6);
    expect(report.totals.indexedPageCount).toBe(1);
    expect(report.pages[0]?.url).toBe(urls[0]);
    expect(report.pages[0]?.impressions).toBe(120);
    expect(report.markdown).toContain("Search Console Phase 2 SEO Report");
    expect(report.markdown).toContain("/ib-myp-reading-support");
    expect(report.markdown).toContain("Submitted and indexed");
    expect(report.markdown).toContain("7 / 10");
  });
});
