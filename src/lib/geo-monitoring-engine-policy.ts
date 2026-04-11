import { GEO_ENGINE_TYPES, type GeoEngineType, type GeoPromptRecord } from "./geo-prompt-schema";

export const GEO_PHASE_TWO_MONITORING_ENGINES: GeoEngineType[] = [
  "chatgpt-search",
  "perplexity",
  "gemini",
  "claude",
];

export const GEO_DEFERRED_MONITORING_ENGINES: GeoEngineType[] = [
  "google-ai-overviews",
];

function sortGeoEngines(engines: GeoEngineType[]) {
  return engines.sort(
    (left, right) =>
      GEO_ENGINE_TYPES.indexOf(left) - GEO_ENGINE_TYPES.indexOf(right),
  );
}

export function getPhaseEnabledGeoMonitoringEngines(prompt: GeoPromptRecord) {
  return prompt.engineCoverage.filter((engine) =>
    GEO_PHASE_TWO_MONITORING_ENGINES.includes(engine),
  );
}

export function getDeferredGeoMonitoringEngines(prompt: GeoPromptRecord) {
  return prompt.engineCoverage.filter(
    (engine) => GEO_DEFERRED_MONITORING_ENGINES.includes(engine),
  );
}

export function getGlobalDeferredGeoMonitoringEngines() {
  return GEO_ENGINE_TYPES.filter(
    (engine) => GEO_DEFERRED_MONITORING_ENGINES.includes(engine),
  );
}

export function buildGeoMonitoringPhaseNote(input: {
  activeEngines: GeoEngineType[];
  unavailablePhaseTwoEngines: GeoEngineType[];
  deferredEngines: GeoEngineType[];
}) {
  const notes: string[] = [];
  const activeEngines = sortGeoEngines([...new Set(input.activeEngines)]);
  const unavailablePhaseTwoEngines = sortGeoEngines([
    ...new Set(input.unavailablePhaseTwoEngines),
  ]);
  const deferredEngines = sortGeoEngines([...new Set(input.deferredEngines)]);

  if (activeEngines.length > 0) {
    notes.push(`Active GEO monitoring engines: ${activeEngines.join(", ")}.`);
  }

  if (unavailablePhaseTwoEngines.length > 0) {
    notes.push(
      `Phase-two monitoring will activate when credentials or connections are configured for: ${unavailablePhaseTwoEngines.join(", ")}.`,
    );
  }

  if (deferredEngines.length > 0) {
    notes.push(
      `Deferred GEO monitoring engines: ${deferredEngines.join(", ")}.`,
    );
  }

  return notes.join(" ");
}
