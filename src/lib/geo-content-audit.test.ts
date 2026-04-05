import { describe, expect, test } from "vitest";

import { auditGeoContent } from "./geo-content-audit";

describe("auditGeoContent", () => {
  test("returns structured GEO checks with atomic answer and CSQAF signals", () => {
    const result = auditGeoContent({
      title: "How do commercial buyers compare LED suppliers?",
      headings: "## What matters most?\n## How should teams compare vendors?",
      body: `## What matters most?\nCommercial buyers compare LED suppliers by reliability, warranty coverage, quoted energy savings, and evidence that products perform consistently across large installations. A direct answer should make the buying criteria clear before the rest of the detail explains technical differences.\n\n## How should teams compare vendors?\nTeams should compare quoted lifespans, measured failure rates, and source-backed case studies before choosing a supplier. According to a 2025 market report, retrofit projects that used verified performance data reduced replacement costs by 18%. "Verified data shortens the buying cycle," one consultant noted.`,
      referenceNotes:
        "Source: 2025 commercial lighting market report. Expert interview with a retrofit consultant.",
    });

    expect(result.atomicAnswerCoverage.coveredSections).toBeGreaterThan(0);
    expect(result.csqaf.citations).toBe(true);
    expect(result.csqaf.statistics).toBe(true);
    expect(result.csqaf.authoritativeness).toBe(true);
    expect(result.summary).toMatch(/draft/i);
  });
});
