export const GEO_AIO_EVIDENCE_STATUSES = [
  "not-triggered",
  "triggered-not-cited",
  "cited",
  "inconclusive",
] as const;

export type GeoAioEvidenceStatus =
  (typeof GEO_AIO_EVIDENCE_STATUSES)[number];

export type GeoAioEvidenceRecord = {
  id: string;
  promptId: string;
  promptTextSnapshot: string;
  queryVariant: string;
  aiOverviewStatus: GeoAioEvidenceStatus;
  citationUrls: string[];
  dailySparksCited: boolean;
  evidenceUrl: string;
  screenshotUrl: string;
  observedAt: string;
  notes: string;
  createdAt: string;
};
