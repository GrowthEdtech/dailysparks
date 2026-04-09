export const phase2SearchConsoleSiteProperty = "sc-domain:geledtech.com";

export const phase2PublicSeoPaths = [
  "/ib-myp-reading-support",
  "/ib-dp-reading-and-writing-support",
  "/goodnotes-workflow-for-ib-students",
  "/notion-archive-for-ib-families",
  "/myp-vs-dp-reading-model",
] as const;

export type SearchConsoleAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export type SearchConsoleInspectionSummary = {
  inspectionUrl: string;
  verdict?: string | null;
  coverageState?: string | null;
  lastCrawlTime?: string | null;
};

export type SearchConsoleSitemapSummary = {
  submitted?: number | null;
  indexed?: number | null;
  warnings?: number | null;
  errors?: number | null;
};

export type Phase2SearchConsoleReport = {
  generatedAt: string;
  totals: {
    trackedPageCount: number;
    pagesWithImpressions: number;
    totalImpressions: number;
    totalClicks: number;
    indexedPageCount: number;
  };
  sitemap: SearchConsoleSitemapSummary;
  pages: {
    url: string;
    path: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number | null;
    indexed: boolean;
    coverageState: string | null;
    verdict: string | null;
    lastCrawlTime: string | null;
  }[];
  markdown: string;
};

export function getPhase2PublicSeoUrls(siteUrl: string) {
  const normalized = siteUrl.replace(/\/+$/, "");
  return phase2PublicSeoPaths.map((path) => `${normalized}${path}`);
}

export function isIndexedCoverageState(coverageState?: string | null) {
  if (!coverageState) {
    return false;
  }

  const normalized = coverageState.toLowerCase();

  return normalized.includes("indexed") && !normalized.includes("not indexed");
}

export function buildPhase2SearchConsoleReport({
  siteUrl,
  rows,
  inspections,
  sitemap,
  generatedAt = new Date().toISOString(),
}: {
  siteUrl: string;
  rows: SearchConsoleAnalyticsRow[];
  inspections: SearchConsoleInspectionSummary[];
  sitemap: SearchConsoleSitemapSummary;
  generatedAt?: string;
}): Phase2SearchConsoleReport {
  const trackedUrls = getPhase2PublicSeoUrls(siteUrl);
  const rowsByUrl = new Map(
    rows
      .map((row) => [row.keys?.[0] ?? "", row] as const)
      .filter(([url]) => trackedUrls.includes(url)),
  );
  const inspectionByUrl = new Map(
    inspections.map((inspection) => [inspection.inspectionUrl, inspection] as const),
  );

  const pages = trackedUrls
    .map((url) => {
      const row = rowsByUrl.get(url);
      const inspection = inspectionByUrl.get(url);

      return {
        url,
        path: new URL(url).pathname,
        clicks: row?.clicks ?? 0,
        impressions: row?.impressions ?? 0,
        ctr: row?.ctr ?? 0,
        position: row?.position ?? null,
        indexed: isIndexedCoverageState(inspection?.coverageState),
        coverageState: inspection?.coverageState ?? null,
        verdict: inspection?.verdict ?? null,
        lastCrawlTime: inspection?.lastCrawlTime ?? null,
      };
    })
    .sort((left, right) => right.impressions - left.impressions);

  const totals = {
    trackedPageCount: pages.length,
    pagesWithImpressions: pages.filter((page) => page.impressions > 0).length,
    totalImpressions: pages.reduce((sum, page) => sum + page.impressions, 0),
    totalClicks: pages.reduce((sum, page) => sum + page.clicks, 0),
    indexedPageCount: pages.filter((page) => page.indexed).length,
  };

  const markdown = [
    "# Search Console Phase 2 SEO Report",
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Tracked pages: ${totals.trackedPageCount}`,
    `Pages with impressions: ${totals.pagesWithImpressions}`,
    `Total impressions: ${totals.totalImpressions}`,
    `Total clicks: ${totals.totalClicks}`,
    `Indexed pages (URL inspection): ${totals.indexedPageCount}`,
    `Sitemap indexed/submitted: ${sitemap.indexed ?? 0} / ${sitemap.submitted ?? 0}`,
    `Sitemap warnings/errors: ${sitemap.warnings ?? 0} / ${sitemap.errors ?? 0}`,
    "",
    "## Page detail",
    "",
    ...pages.map((page) => {
      const ctrPercent = `${(page.ctr * 100).toFixed(2)}%`;
      const positionText =
        page.position === null ? "n/a" : page.position.toFixed(1);

      return `- ${page.path}: ${page.impressions} impressions, ${page.clicks} clicks, CTR ${ctrPercent}, position ${positionText}, indexed=${page.indexed ? "yes" : "no"}, coverage=${page.coverageState ?? "n/a"}, verdict=${page.verdict ?? "n/a"}`;
    }),
  ].join("\n");

  return {
    generatedAt,
    totals,
    sitemap,
    pages,
    markdown,
  };
}
