import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import type { DailyBriefSelectedTopicRecord } from "./daily-brief-candidate-schema";
import type { DailyBriefSourceReference } from "./daily-brief-history-schema";
import type { Programme } from "./mvp-types";
import type { EditorialSourceCandidate } from "./source-ingestion";

export type SelectedDailyTopic = {
  clusterKey: string;
  headline: string;
  summary: string;
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

export function selectDailyTopicCluster(
  candidates: EditorialSourceCandidate[],
  eligibleProgrammes: Programme[],
): SelectedDailyTopic | null {
  if (candidates.length === 0 || eligibleProgrammes.length === 0) {
    return null;
  }

  const clusters = new Map<string, EditorialSourceCandidate[]>();

  for (const candidate of candidates) {
    const clusterKey = getDailyTopicClusterKey(candidate);
    const current = clusters.get(clusterKey) ?? [];

    current.push(candidate);
    clusters.set(clusterKey, current);
  }

  const selectedCluster = Array.from(clusters.entries())
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
    })[0];

  if (!selectedCluster) {
    return null;
  }

  return {
    clusterKey: selectedCluster.clusterKey,
    headline: selectedCluster.candidates[0]?.title ?? "",
    summary: selectedCluster.candidates[0]?.summary ?? "",
    topicCandidates: selectedCluster.candidates,
    sourceReferences: buildSourceReferences(selectedCluster.candidates),
    eligibleProgrammes: [...eligibleProgrammes],
  };
}

export function buildSelectedTopicRecord(input: {
  selectedTopic: SelectedDailyTopic;
  selectedAt: string;
  selectedByCohort: DailyBriefEditorialCohort;
}): DailyBriefSelectedTopicRecord {
  return {
    clusterKey: input.selectedTopic.clusterKey,
    headline: input.selectedTopic.headline,
    summary: input.selectedTopic.summary,
    sourceReferences: input.selectedTopic.sourceReferences.map((reference) => ({
      ...reference,
    })),
    candidateCount: input.selectedTopic.topicCandidates.length,
    selectedAt: input.selectedAt,
    selectedByCohort: input.selectedByCohort,
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
    summary: input.record.summary,
    topicCandidates: matchingCandidates,
    sourceReferences: input.record.sourceReferences.map((reference) => ({
      ...reference,
    })),
    eligibleProgrammes: [...input.eligibleProgrammes],
  };
}
