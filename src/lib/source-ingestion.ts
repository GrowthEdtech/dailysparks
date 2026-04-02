import { listEditorialSources } from "./editorial-source-store";
import {
  resolveEditorialFeedTargets,
  type EditorialFeedTarget,
} from "./editorial-feed-registry";
import type { EditorialIngestionMode, EditorialSourceRecord } from "./editorial-source-store";

export type EditorialSourceCandidate = {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceDomain: string;
  feedUrl: string;
  section: string;
  title: string;
  summary: string;
  url: string;
  normalizedUrl: string;
  normalizedTitle: string;
  publishedAt: string | null;
  ingestionMode: EditorialIngestionMode;
  fetchedAt: string;
};

export type IngestEditorialSourceCandidatesOptions = {
  sources?: EditorialSourceRecord[];
  fetchImpl?: typeof fetch;
  now?: Date;
};

type ParsedFeedItem = {
  title: string;
  summary: string;
  url: string;
  publishedAt: string | null;
};

const XML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
};

function decodeXmlEntities(value: string) {
  return value.replace(/&(#39|amp|lt|gt|quot|apos);/g, (match, entity) => {
    return XML_ENTITY_MAP[entity] ?? match;
  });
}

function stripCdata(value: string) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function sanitizeText(value: string | null) {
  if (!value) {
    return "";
  }

  return decodeXmlEntities(stripHtml(stripCdata(value)))
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagText(block: string, tagName: string) {
  const match = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));

  return match?.[1] ?? null;
}

function extractAtomLink(block: string) {
  const alternateLink =
    block.match(
      /<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i,
    )?.[1] ??
    block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i)?.[1];

  return alternateLink ? decodeXmlEntities(alternateLink.trim()) : "";
}

function parsePublishedAt(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractBlocks(xml: string, tagName: string) {
  return Array.from(
    xml.matchAll(
      new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi"),
    ),
  ).map((match) => match[0]);
}

function parseRssItems(xml: string): ParsedFeedItem[] {
  return extractBlocks(xml, "item")
    .map((item) => ({
      title: sanitizeText(extractTagText(item, "title")),
      summary: sanitizeText(
        extractTagText(item, "description") ?? extractTagText(item, "content:encoded"),
      ),
      url: sanitizeText(extractTagText(item, "link")),
      publishedAt: parsePublishedAt(extractTagText(item, "pubDate")),
    }))
    .filter((item) => item.title && item.url);
}

function parseAtomEntries(xml: string): ParsedFeedItem[] {
  return extractBlocks(xml, "entry")
    .map((entry) => ({
      title: sanitizeText(extractTagText(entry, "title")),
      summary: sanitizeText(
        extractTagText(entry, "summary") ?? extractTagText(entry, "content"),
      ),
      url: extractAtomLink(entry),
      publishedAt: parsePublishedAt(
        extractTagText(entry, "published") ?? extractTagText(entry, "updated"),
      ),
    }))
    .filter((entry) => entry.title && entry.url);
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);

    Array.from(url.searchParams.keys()).forEach((key) => {
      if (key.startsWith("utm_") || key === "ref") {
        url.searchParams.delete(key);
      }
    });
    url.hash = "";

    const normalizedPath = url.pathname.replace(/\/+$/, "");
    url.pathname = normalizedPath || "/";

    const normalized = `${url.origin}${url.pathname}${url.search}`;

    return normalized.endsWith("/") && url.pathname !== "/"
      ? normalized.slice(0, -1)
      : normalized;
  } catch {
    return value.trim();
  }
}

function createCandidate(
  target: EditorialFeedTarget,
  item: ParsedFeedItem,
  fetchedAt: string,
): EditorialSourceCandidate {
  const normalizedUrl = normalizeUrl(item.url);
  const normalizedTitle = normalizeTitle(item.title);

  return {
    id: `${target.sourceId}:${normalizedUrl || normalizedTitle}`,
    sourceId: target.sourceId,
    sourceName: target.sourceName,
    sourceDomain: target.sourceDomain,
    feedUrl: target.url,
    section: target.section,
    title: item.title,
    summary: item.summary,
    url: item.url,
    normalizedUrl,
    normalizedTitle,
    publishedAt: item.publishedAt,
    ingestionMode: target.ingestionMode,
    fetchedAt,
  };
}

function deduplicateCandidates(
  candidates: EditorialSourceCandidate[],
): EditorialSourceCandidate[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  return candidates.filter((candidate) => {
    if (candidate.normalizedUrl && seenUrls.has(candidate.normalizedUrl)) {
      return false;
    }

    if (candidate.normalizedTitle && seenTitles.has(candidate.normalizedTitle)) {
      return false;
    }

    seenUrls.add(candidate.normalizedUrl);
    seenTitles.add(candidate.normalizedTitle);

    return true;
  });
}

function sortCandidates(candidates: EditorialSourceCandidate[]) {
  return [...candidates].sort((left, right) => {
    const leftTime = left.publishedAt ? Date.parse(left.publishedAt) : 0;
    const rightTime = right.publishedAt ? Date.parse(right.publishedAt) : 0;

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return left.title.localeCompare(right.title);
  });
}

async function fetchFeedCandidates(
  target: EditorialFeedTarget,
  fetchImpl: typeof fetch,
  fetchedAt: string,
) {
  try {
    const response = await fetchImpl(target.url, {
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const items =
      target.format === "atom" ? parseAtomEntries(xml) : parseRssItems(xml);

    return items.map((item) => createCandidate(target, item, fetchedAt));
  } catch {
    return [];
  }
}

export async function ingestEditorialSourceCandidates(
  options: IngestEditorialSourceCandidatesOptions = {},
) {
  const sources = options.sources ?? (await listEditorialSources());
  const fetchImpl = options.fetchImpl ?? fetch;
  const fetchedAt = (options.now ?? new Date()).toISOString();
  const targets = resolveEditorialFeedTargets(sources);

  const fetchedCandidates = await Promise.all(
    targets.map((target) => fetchFeedCandidates(target, fetchImpl, fetchedAt)),
  );

  return sortCandidates(deduplicateCandidates(fetchedCandidates.flat()));
}
