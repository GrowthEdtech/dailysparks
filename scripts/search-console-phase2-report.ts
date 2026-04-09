import { GoogleAuth } from "google-auth-library";

import {
  buildPhase2SearchConsoleReport,
  getPhase2PublicSeoUrls,
  phase2SearchConsoleSiteProperty,
  type SearchConsoleAnalyticsRow,
  type SearchConsoleInspectionSummary,
  type SearchConsoleSitemapSummary,
} from "../src/lib/search-console-phase2-report";
import { siteUrl } from "../src/app/site-config";

const searchConsoleScope =
  "https://www.googleapis.com/auth/webmasters.readonly";
const quotaProjectId =
  process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0586185740";

async function fetchJson<T>(
  auth: GoogleAuth,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
      "x-goog-user-project": quotaProjectId,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Search Console request failed (${response.status}): ${await response.text()}`,
    );
  }

  return (await response.json()) as T;
}

async function fetchAnalyticsRows(auth: GoogleAuth) {
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 27);

  const payload = {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    dimensions: ["page"],
    rowLimit: 250,
  };

  const encodedProperty = encodeURIComponent(phase2SearchConsoleSiteProperty);

  const response = await fetchJson<{ rows?: SearchConsoleAnalyticsRow[] }>(
    auth,
    `https://www.googleapis.com/webmasters/v3/sites/${encodedProperty}/searchAnalytics/query`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return response.rows ?? [];
}

async function fetchInspectionSummaries(auth: GoogleAuth) {
  const urls = getPhase2PublicSeoUrls(siteUrl);

  const inspections = await Promise.all(
    urls.map(async (inspectionUrl) => {
      const response = await fetchJson<{
        inspectionResult?: {
          indexStatusResult?: {
            verdict?: string;
            coverageState?: string;
            lastCrawlTime?: string;
          };
        };
      }>(
        auth,
        "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
        {
          method: "POST",
          body: JSON.stringify({
            inspectionUrl,
            siteUrl: phase2SearchConsoleSiteProperty,
            languageCode: "en-US",
          }),
        },
      );

      const indexStatus = response.inspectionResult?.indexStatusResult;

      return {
        inspectionUrl,
        verdict: indexStatus?.verdict ?? null,
        coverageState: indexStatus?.coverageState ?? null,
        lastCrawlTime: indexStatus?.lastCrawlTime ?? null,
      } satisfies SearchConsoleInspectionSummary;
    }),
  );

  return inspections;
}

async function fetchSitemapSummary(auth: GoogleAuth) {
  const encodedProperty = encodeURIComponent(phase2SearchConsoleSiteProperty);
  const encodedSitemap = encodeURIComponent(`${siteUrl}/sitemap.xml`);

  const response = await fetchJson<{
    sitemap?: {
      contents?: { indexed?: string; submitted?: string }[];
      errors?: string;
      warnings?: string;
    };
  }>(
    auth,
    `https://www.googleapis.com/webmasters/v3/sites/${encodedProperty}/sitemaps/${encodedSitemap}`,
  );

  const content = response.sitemap?.contents?.[0];

  return {
    submitted: content?.submitted ? Number(content.submitted) : null,
    indexed: content?.indexed ? Number(content.indexed) : null,
    warnings: response.sitemap?.warnings ? Number(response.sitemap.warnings) : 0,
    errors: response.sitemap?.errors ? Number(response.sitemap.errors) : 0,
  } satisfies SearchConsoleSitemapSummary;
}

async function main() {
  const auth = new GoogleAuth({
    scopes: [searchConsoleScope],
  });

  const [rows, inspections, sitemap] = await Promise.all([
    fetchAnalyticsRows(auth),
    fetchInspectionSummaries(auth),
    fetchSitemapSummary(auth),
  ]);

  const report = buildPhase2SearchConsoleReport({
    siteUrl,
    rows,
    inspections,
    sitemap,
  });

  process.stdout.write(`${report.markdown}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `Failed to build Search Console Phase 2 report: ${
      error instanceof Error ? error.message : String(error)
    }\n`,
  );
  process.exitCode = 1;
});
