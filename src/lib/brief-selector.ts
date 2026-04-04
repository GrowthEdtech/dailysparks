import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import type { DailyBriefSelectedTopicRecord } from "./daily-brief-candidate-schema";
import type { DailyBriefSourceReference } from "./daily-brief-history-schema";
import {
  normalizeHeadlineForComparison,
  type DailyBriefSelectionDecision,
} from "./daily-brief-selection-types";
import type { Programme } from "./mvp-types";
import type { EditorialSourceCandidate } from "./source-ingestion";

export type SelectedDailyTopic = {
  clusterKey: string;
  headline: string;
  summary: string;
  latestPublishedAt: string | null;
  topicCandidates: EditorialSourceCandidate[];
  sourceReferences: DailyBriefSourceReference[];
  eligibleProgrammes: Programme[];
};

export function getDailyTopicClusterKey(candidate: EditorialSourceCandidate) {
  return candidate.normalizedTitle || candidate.normalizedUrl || candidate.id;
}

function toTimestamp(value: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortClusterCandidates(candidates: EditorialSourceCandidate[]) {
  return [...candidates].sort((left, right) => {
    const publishedDelta = toTimestamp(right.publishedAt) - toTimestamp(left.publishedAt);

    if (publishedDelta !== 0) {
      return publishedDelta;
    }

    return left.title.localeCompare(right.title);
  });
}

function buildSourceReferences(
  candidates: EditorialSourceCandidate[],
): DailyBriefSourceReference[] {
  const seenUrls = new Set<string>();

  return candidates.flatMap((candidate) => {
    if (seenUrls.has(candidate.normalizedUrl)) {
      return [];
    }

    seenUrls.add(candidate.normalizedUrl);

    return [
      {
        sourceId: candidate.sourceId,
        sourceName: candidate.sourceName,
        sourceDomain: candidate.sourceDomain,
        articleTitle: candidate.title,
        articleUrl: candidate.url,
      },
    ];
  });
}

export function rankDailyTopicClusters(
  candidates: EditorialSourceCandidate[],
  eligibleProgrammes: Programme[],
) {
  if (candidates.length === 0 || eligibleProgrammes.length === 0) {
    return [] as SelectedDailyTopic[];
  }

  const clusters = new Map<string, EditorialSourceCandidate[]>();

  for (const candidate of candidates) {
    const clusterKey = getDailyTopicClusterKey(candidate);
    const current = clusters.get(clusterKey) ?? [];

    current.push(candidate);
    clusters.set(clusterKey, current);
  }

  return Array.from(clusters.entries())
    .map(([clusterKey, clusterCandidates]) => {
      const sortedCandidates = sortClusterCandidates(clusterCandidates);
      const uniqueSources = new Set(
        sortedCandidates.map((candidate) => candidate.sourceId),
      ).size;

      return {
        clusterKey,
        candidates: sortedCandidates,
        uniqueSources,
        latestPublishedAt: toTimestamp(sortedCandidates[0]?.publishedAt ?? null),
      };
    })
    .sort((left, right) => {
      if (left.uniqueSources !== right.uniqueSources) {
        return right.uniqueSources - left.uniqueSources;
      }

      if (left.latestPublishedAt !== right.latestPublishedAt) {
        return right.latestPublishedAt - left.latestPublishedAt;
      }

      return left.candidates[0]!.title.localeCompare(right.candidates[0]!.title);
    })
    .map((selectedCluster) => ({
      clusterKey: selectedCluster.clusterKey,
      headline: selectedCluster.candidates[0]?.title ?? "",
      summary: selectedCluster.candidates[0]?.summary ?? "",
      latestPublishedAt: selectedCluster.candidates[0]?.publishedAt ?? null,
      topicCandidates: selectedCluster.candidates,
      sourceReferences: buildSourceReferences(selectedCluster.candidates),
      eligibleProgrammes: [...eligibleProgrammes],
    }));
}

export function selectDailyTopicCluster(
  candidates: EditorialSourceCandidate[],
  eligibleProgrammes: Programme[],
): SelectedDailyTopic | null {
  return rankDailyTopicClusters(candidates, eligibleProgrammes)[0] ?? null;
}

export function buildSelectedTopicRecord(input: {
  selectedTopic: SelectedDailyTopic;
  selectedAt: string;
  selectedByCohort: DailyBriefEditorialCohort;
  selectionDecision?: DailyBriefSelectionDecision;
  selectionOverrideNote?: string;
}): DailyBriefSelectedTopicRecord {
  return {
    clusterKey: input.selectedTopic.clusterKey,
    headline: input.selectedTopic.headline,
    normalizedHeadline: normalizeHeadlineForComparison(input.selectedTopic.headline),
    summary: input.selectedTopic.summary,
    sourceReferences: input.selectedTopic.sourceReferences.map((reference) => ({
      ...reference,
    })),
    candidateCount: input.selectedTopic.topicCandidates.length,
    latestPublishedAt: input.selectedTopic.latestPublishedAt,
    selectedAt: input.selectedAt,
    selectedByCohort: input.selectedByCohort,
    selectionDecision: input.selectionDecision ?? "new",
    selectionOverrideNote: input.selectionOverrideNote ?? "",
  };
}

export function hydrateSelectedTopicFromRecord(input: {
  record: DailyBriefSelectedTopicRecord;
  candidates: EditorialSourceCandidate[];
  eligibleProgrammes: Programme[];
}): SelectedDailyTopic {
  const matchingCandidates = input.candidates.filter(
    (candidate) => getDailyTopicClusterKey(candidate) === input.record.clusterKey,
  );

  return {
    clusterKey: input.record.clusterKey,
    headline: input.record.headline,
    latestPublishedAt: input.record.latestPublishedAt,
    summary: input.record.summary,
    topicCandidates: matchingCandidates,
    sourceReferences: input.record.sourceReferences.map((reference) => ({
      ...reference,
    })),
    eligibleProgrammes: [...input.eligibleProgrammes],
  };
}
