import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { EditorialSourceRecord } from "./editorial-source-store";
import { resolveEditorialFeedTargets } from "./editorial-feed-registry";
import { ingestEditorialSourceCandidates } from "./source-ingestion";

const fetchMock = vi.fn<typeof fetch>();

function createSource(
  overrides: Partial<EditorialSourceRecord>,
): EditorialSourceRecord {
  const timestamp = "2026-04-02T00:00:00.000Z";

  return {
    id: "bbc",
    name: "BBC",
    domain: "bbc.com",
    homepage: "https://www.bbc.com/news",
    roles: ["daily-news"],
    usageTiers: ["primary-selection"],
    recommendedProgrammes: ["PYP", "MYP", "DP"],
    sections: [],
    ingestionMode: "metadata-only",
    active: true,
    notes: "Test source",
    seededFromPolicy: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("editorial feed registry", () => {
  test("resolves supported sources into feed targets", () => {
    const targets = resolveEditorialFeedTargets([
      createSource({
        id: "bbc",
        name: "BBC",
        sections: ["world", "science"],
      }),
      createSource({
        id: "npr",
        name: "NPR",
        domain: "npr.org",
        homepage: "https://www.npr.org/",
      }),
      createSource({
        id: "reuters",
        name: "Reuters",
        domain: "reuters.com",
        homepage: "https://www.reuters.com/",
      }),
    ]);

    expect(targets).toEqual([
      expect.objectContaining({
        sourceId: "bbc",
        section: "world",
        url: "https://feeds.bbci.co.uk/news/world/rss.xml",
      }),
      expect.objectContaining({
        sourceId: "bbc",
        section: "science",
        url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
      }),
      expect.objectContaining({
        sourceId: "npr",
        section: "top-stories",
        url: "https://feeds.npr.org/1001/rss.xml",
      }),
    ]);
  });
});

describe("source ingestion", () => {
  test("ingests metadata-only candidates and normalizes candidate items", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>BBC World</title>
            <item>
              <title><![CDATA[ New coral reef discovered ]]></title>
              <link>https://www.bbc.com/news/science-environment-12345?utm_source=rss</link>
              <pubDate>Wed, 02 Apr 2026 08:30:00 GMT</pubDate>
              <description><![CDATA[<p>Researchers found a <strong>new reef</strong> near the coast.</p>]]></description>
            </item>
          </channel>
        </rss>`,
        { status: 200 },
      ),
    );

    const candidates = await ingestEditorialSourceCandidates({
      sources: [
        createSource({
          id: "bbc",
          name: "BBC",
          sections: ["world"],
        }),
      ],
      fetchImpl: fetchMock,
      now: new Date("2026-04-02T09:00:00.000Z"),
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        sourceId: "bbc",
        sourceName: "BBC",
        section: "world",
        title: "New coral reef discovered",
        summary: "Researchers found a new reef near the coast.",
        url: "https://www.bbc.com/news/science-environment-12345?utm_source=rss",
        normalizedUrl: "https://www.bbc.com/news/science-environment-12345",
        normalizedTitle: "new coral reef discovered",
        publishedAt: "2026-04-02T08:30:00.000Z",
        fetchedAt: "2026-04-02T09:00:00.000Z",
      }),
    ]);
  });

  test("deduplicates candidate URLs and normalized titles across feeds", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <item>
                <title>Students map sea turtles</title>
                <link>https://example.com/story?utm_source=bbc</link>
                <pubDate>Wed, 02 Apr 2026 08:30:00 GMT</pubDate>
                <description>Version one</description>
              </item>
            </channel>
          </rss>`,
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <item>
                <title>students map sea turtles</title>
                <link>https://example.com/story?utm_source=npr</link>
                <pubDate>Wed, 02 Apr 2026 08:35:00 GMT</pubDate>
                <description>Version two</description>
              </item>
              <item>
                <title>Students map sea turtles again</title>
                <link>https://example.com/story?utm_source=npr&amp;ref=homepage</link>
                <pubDate>Wed, 02 Apr 2026 08:36:00 GMT</pubDate>
                <description>Version three</description>
              </item>
            </channel>
          </rss>`,
          { status: 200 },
        ),
      );

    const candidates = await ingestEditorialSourceCandidates({
      sources: [
        createSource({
          id: "bbc",
          name: "BBC",
          sections: ["world"],
        }),
        createSource({
          id: "npr",
          name: "NPR",
          domain: "npr.org",
          homepage: "https://www.npr.org/",
        }),
      ],
      fetchImpl: fetchMock,
      now: new Date("2026-04-02T09:00:00.000Z"),
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      title: "Students map sea turtles",
      normalizedUrl: "https://example.com/story",
    });
  });

  test("ignores inactive sources before fetching feeds", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel></channel>
        </rss>`,
        { status: 200 },
      ),
    );

    await ingestEditorialSourceCandidates({
      sources: [
        createSource({
          id: "bbc",
          name: "BBC",
          sections: ["world"],
          active: false,
        }),
        createSource({
          id: "npr",
          name: "NPR",
          domain: "npr.org",
          homepage: "https://www.npr.org/",
        }),
      ],
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://feeds.npr.org/1001/rss.xml",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: expect.stringContaining("application/rss+xml"),
        }),
      }),
    );
  });
});
