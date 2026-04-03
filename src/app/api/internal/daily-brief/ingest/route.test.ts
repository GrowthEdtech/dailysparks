import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as ingestDailyBriefRoute } from "./route";
import {
  getDailyBriefCandidateSnapshot,
  listDailyBriefCandidateSnapshots,
} from "../../../../../lib/daily-brief-candidate-store";

const ORIGINAL_ENV = { ...process.env };
const fetchMock = vi.fn<typeof fetch>();
const SCHEDULER_HEADER_FIXTURE = ["scheduler", "header", "fixture"].join("-");

function buildRequest(
  schedulerHeaderValue = SCHEDULER_HEADER_FIXTURE,
  body?: Record<string, unknown>,
) {
  return new Request("http://localhost:3000/api/internal/daily-brief/ingest", {
    method: "POST",
    headers: {
      "x-daily-sparks-scheduler-secret": schedulerHeaderValue,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function createFeedResponse(items: Array<{ title: string; slug: string }>) {
  return new Response(
    `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          ${items
            .map(
              (item) => `
                <item>
                  <title>${item.title}</title>
                  <link>https://www.bbc.com/news/${item.slug}?utm_source=rss</link>
                  <pubDate>Thu, 03 Apr 2026 03:00:00 GMT</pubDate>
                  <description>Summary for ${item.title}.</description>
                </item>`,
            )
            .join("")}
        </channel>
      </rss>`,
    { status: 200 },
  );
}

async function seedEditorialSources(storePath: string) {
  const timestamp = "2026-04-03T00:00:00.000Z";

  await writeFile(
    storePath,
    JSON.stringify(
      {
        sources: [
          {
            id: "bbc",
            name: "BBC",
            domain: "bbc.com",
            homepage: "https://www.bbc.com/news",
            roles: ["daily-news"],
            usageTiers: ["primary-selection"],
            recommendedProgrammes: ["PYP", "MYP", "DP"],
            sections: ["world"],
            ingestionMode: "metadata-only",
            active: true,
            notes: "Primary source",
            seededFromPolicy: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          {
            id: "npr",
            name: "NPR",
            domain: "npr.org",
            homepage: "https://www.npr.org/",
            roles: ["daily-news"],
            usageTiers: ["primary-selection"],
            recommendedProgrammes: ["PYP", "MYP", "DP"],
            sections: [],
            ingestionMode: "metadata-only",
            active: false,
            notes: "Inactive source",
            seededFromPolicy: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      },
      null,
      2,
    ),
  );
}

let tempDirectory = "";
let editorialStorePath = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-ingest-route-"),
  );
  editorialStorePath = path.join(tempDirectory, "editorial-sources.json");

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_EDITORIAL_STORE_PATH: editorialStorePath,
    DAILY_SPARKS_DAILY_BRIEF_CANDIDATE_STORE_PATH: path.join(
      tempDirectory,
      "candidate-snapshots.json",
    ),
    DAILY_SPARKS_SCHEDULER_SECRET: SCHEDULER_HEADER_FIXTURE,
  };

  await seedEditorialSources(editorialStorePath);

  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("daily brief ingest route", () => {
  test("returns 503 when scheduler auth is not configured", async () => {
    delete process.env.DAILY_SPARKS_SCHEDULER_SECRET;

    const response = await ingestDailyBriefRoute(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.message).toMatch(/scheduler/i);
  });

  test("rejects requests with an invalid scheduler secret", async () => {
    const response = await ingestDailyBriefRoute(buildRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/scheduler/i);
  });

  test("writes a candidate snapshot for the requested run date", async () => {
    fetchMock.mockResolvedValueOnce(
      createFeedResponse([
        { title: "Students map sea turtles", slug: "sea-turtles" },
        { title: "Coral reef grows again", slug: "coral-reef" },
      ]),
    );

    const response = await ingestDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const snapshot = await getDailyBriefCandidateSnapshot("2026-04-03");

    expect(response.status).toBe(200);
    expect(body.mode).toBe("ingest");
    expect(body.summary.activeSourceCount).toBe(1);
    expect(body.summary.candidateCount).toBe(2);
    expect(snapshot?.candidateCount).toBe(2);
    expect(snapshot?.sourceIds).toEqual(["bbc"]);
  });

  test("reports supported source coverage separately from unsupported active sources", async () => {
    const timestamp = "2026-04-03T00:00:00.000Z";

    await writeFile(
      editorialStorePath,
      JSON.stringify(
        {
          sources: [
            {
              id: "bbc",
              name: "BBC",
              domain: "bbc.com",
              homepage: "https://www.bbc.com/news",
              roles: ["daily-news"],
              usageTiers: ["primary-selection"],
              recommendedProgrammes: ["PYP", "MYP", "DP"],
              sections: ["world"],
              ingestionMode: "metadata-only",
              active: true,
              notes: "Supported source",
              seededFromPolicy: true,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
            {
              id: "ap",
              name: "AP",
              domain: "apnews.com",
              homepage: "https://apnews.com/",
              roles: ["daily-news"],
              usageTiers: ["primary-selection"],
              recommendedProgrammes: ["MYP", "DP"],
              sections: ["world"],
              ingestionMode: "metadata-only",
              active: true,
              notes: "Unsupported feed mapping",
              seededFromPolicy: true,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
        },
        null,
        2,
      ),
    );
    fetchMock.mockResolvedValueOnce(
      createFeedResponse([{ title: "Students map sea turtles", slug: "sea-turtles" }]),
    );

    const response = await ingestDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.activeSourceCount).toBe(2);
    expect(body.summary.supportedSourceCount).toBe(1);
    expect(body.summary.supportedSourceIds).toEqual(["bbc"]);
    expect(body.summary.unsupportedSourceIds).toEqual(["ap"]);
  });

  test("updates the same run date snapshot instead of duplicating it", async () => {
    fetchMock.mockResolvedValueOnce(
      createFeedResponse([{ title: "Students map sea turtles", slug: "sea-turtles" }]),
    );

    await ingestDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );

    fetchMock.mockResolvedValueOnce(
      createFeedResponse([
        { title: "New forest classroom", slug: "forest-classroom" },
        { title: "Students build weather stations", slug: "weather-stations" },
      ]),
    );

    const response = await ingestDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const snapshots = await listDailyBriefCandidateSnapshots();
    const snapshot = await getDailyBriefCandidateSnapshot("2026-04-03");

    expect(response.status).toBe(200);
    expect(body.summary.candidateCount).toBe(2);
    expect(snapshots).toHaveLength(1);
    expect(snapshot?.candidateCount).toBe(2);
    expect(snapshot?.candidates.map((candidate) => candidate.title)).toEqual([
      "New forest classroom",
      "Students build weather stations",
    ]);
  });

  test("defaults omitted runDate to the Hong Kong business date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T17:30:00.000Z"));
    fetchMock.mockResolvedValueOnce(
      createFeedResponse([{ title: "Harbour cleanup begins", slug: "harbour-cleanup" }]),
    );

    const response = await ingestDailyBriefRoute(buildRequest());
    const body = await response.json();
    const snapshot = await getDailyBriefCandidateSnapshot("2026-04-04");

    expect(response.status).toBe(200);
    expect(body.runDate).toBe("2026-04-04");
    expect(snapshot?.scheduledFor).toBe("2026-04-04");
  });
});
