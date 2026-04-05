export const GEO_READINESS_STATUSES = [
  "ready",
  "needs-attention",
  "not-configured",
] as const;

export type GeoReadinessStatus = (typeof GEO_READINESS_STATUSES)[number];

export type GeoMachineReadabilityStatusRecord = {
  llmsTxtStatus: GeoReadinessStatus;
  llmsFullTxtStatus: GeoReadinessStatus;
  ssrStatus: GeoReadinessStatus;
  jsonLdStatus: GeoReadinessStatus;
  notes: string;
  lastCheckedAt: string | null;
  updatedAt: string;
};
