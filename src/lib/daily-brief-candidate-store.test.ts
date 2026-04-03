import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  getDailyBriefCandidateSnapshot,
  listDailyBriefCandidateSnapshots,
  upsertDailyBriefCandidateSnapshot,
} from "./daily-brief-candidate-store";
import type { EditorialSourceCandidate } from "./source-ingestion";

const ORIGINAL_ENV = { ...process.env };

function buildCandidate(
  id: string,
  overrides: Partial<EditorialSourceCandidate> = {},
): EditorialSourceCandidate {
  return {
    id,
    sourceId: `${id}-source`,
    sourceName: `Source ${id}`,
    sourceDomain: `${id}.example.com`,
    feedUrl: `https://${id}.example.com/feed.xml`,
    section: "world",
    title: `Headline ${id}`,
    summary: `Summary ${id}`,
    url: `https://${id}.example.com/articles/${id}`,
    normalizedUrl: `https://${id}.example.com/articles/${id}`,
    normalizedTitle: `headline ${id}`,
    publishedAt: "2026-04-03T00:00:00.000Z",
    ingestionMode: "metadata-only",
    fetchedAt: "2026-04-03T01:00:00.000Z",
    ...overrides,
  };
}

let tempDirectory = "";
let storePath = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-candidate-store-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_DAILY_BRIEF_CANDIDATE_STORE_PATH: path.join(
      tempDirectory,
      "candidate-snapshots.json",
    ),
  };
  storePath = process.env.DAILY_SPARKS_DAILY_BRIEF_CANDIDATE_STORE_PATH;
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("daily brief candidate store", () => {
  test("returns null when no snapshot exists for a run date", async () => {
    expect(await getDailyBriefCandidateSnapshot("2026-04-03")).toBeNull();
  });

  test("creates a candidate snapshot for a run date", async () => {
    const snapshot = await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate("alpha"), buildCandidate("beta")],
    });

    expect(snapshot.scheduledFor).toBe("2026-04-03");
    expect(snapshot.candidateCount).toBe(2);
    expect(snapshot.sourceIds).toEqual(["alpha-source", "beta-source"]);
    expect(snapshot.selectionStatus).toBe("open");
    expect(snapshot.selectionFrozenAt).toBeNull();
  });

  test("overwrites the same run date snapshot idempotently", async () => {
    const createdSnapshot = await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate("alpha")],
    });

    const updatedSnapshot = await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate("beta"), buildCandidate("gamma")],
    });

    const storedSnapshots = await listDailyBriefCandidateSnapshots();

    expect(updatedSnapshot.id).toBe(createdSnapshot.id);
    expect(updatedSnapshot.candidateCount).toBe(2);
    expect(updatedSnapshot.sourceIds).toEqual(["beta-source", "gamma-source"]);
    expect(storedSnapshots).toHaveLength(1);
  });

  test("loads the latest snapshot stored for a run date", async () => {
    await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-02",
      candidates: [buildCandidate("alpha")],
    });
    await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate("beta"), buildCandidate("gamma")],
      selectionStatus: "frozen",
      selectionFrozenAt: "2026-04-03T06:00:00.000Z",
      selectedTopic: {
        clusterKey: "headline beta",
        headline: "Headline beta",
        summary: "Summary beta",
        sourceReferences: [
          {
            sourceId: "beta-source",
            sourceName: "Source beta",
            sourceDomain: "beta.example.com",
            articleTitle: "Headline beta",
            articleUrl: "https://beta.example.com/articles/beta",
          },
        ],
        candidateCount: 2,
        selectedAt: "2026-04-03T06:00:00.000Z",
        selectedByCohort: "APAC",
      },
    });

    const snapshot = await getDailyBriefCandidateSnapshot("2026-04-03");

    expect(snapshot?.candidateCount).toBe(2);
    expect(snapshot?.selectionStatus).toBe("frozen");
    expect(snapshot?.selectionFrozenAt).toBe("2026-04-03T06:00:00.000Z");
    expect(snapshot?.selectedTopic?.selectedByCohort).toBe("APAC");
    expect(snapshot?.selectedTopic?.sourceReferences).toHaveLength(1);
  });

  test("preserves a locked selected topic when a later upsert omits it", async () => {
    await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate("alpha"), buildCandidate("beta")],
      selectionStatus: "frozen",
      selectionFrozenAt: "2026-04-03T02:00:00.000Z",
      selectedTopic: {
        clusterKey: "headline alpha",
        headline: "Headline alpha",
        summary: "Summary alpha",
        sourceReferences: [
          {
            sourceId: "alpha-source",
            sourceName: "Source alpha",
            sourceDomain: "alpha.example.com",
            articleTitle: "Headline alpha",
            articleUrl: "https://alpha.example.com/articles/alpha",
          },
        ],
        candidateCount: 2,
        selectedAt: "2026-04-03T02:00:00.000Z",
        selectedByCohort: "APAC",
      },
    });

    const updatedSnapshot = await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate("beta"), buildCandidate("gamma")],
      selectionStatus: "frozen",
      selectionFrozenAt: "2026-04-03T02:00:00.000Z",
    });

    expect(updatedSnapshot.selectedTopic).toEqual({
      clusterKey: "headline alpha",
      headline: "Headline alpha",
      summary: "Summary alpha",
      sourceReferences: [
        {
          sourceId: "alpha-source",
          sourceName: "Source alpha",
          sourceDomain: "alpha.example.com",
          articleTitle: "Headline alpha",
          articleUrl: "https://alpha.example.com/articles/alpha",
        },
      ],
      candidateCount: 2,
      selectedAt: "2026-04-03T02:00:00.000Z",
      selectedByCohort: "APAC",
    });
  });

  test("persists snapshots to the configured local JSON store", async () => {
    await upsertDailyBriefCandidateSnapshot({
      scheduledFor: "2026-04-03",
      candidates: [buildCandidate("alpha"), buildCandidate("beta")],
    });

    const fileContent = await readFile(storePath, "utf8");

    expect(fileContent).toMatch(/2026-04-03/);
    expect(fileContent).toMatch(/alpha-source/);
    expect(fileContent).toMatch(/candidateCount/);
  });
});
