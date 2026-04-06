import { GEO_ENGINE_TYPES, type GeoEngineType, type GeoPromptRecord } from "./geo-prompt-schema";

export const GEO_ACTIVE_MONITORING_ENGINES: GeoEngineType[] = ["chatgpt-search"];

export function getEnabledGeoMonitoringEngines(prompt: GeoPromptRecord) {
  return prompt.engineCoverage.filter((engine) =>
    GEO_ACTIVE_MONITORING_ENGINES.includes(engine),
  );
}

export function getDeferredGeoMonitoringEngines(prompt: GeoPromptRecord) {
  return prompt.engineCoverage.filter(
    (engine) => !GEO_ACTIVE_MONITORING_ENGINES.includes(engine),
  );
}

export function getGlobalDeferredGeoMonitoringEngines() {
  return GEO_ENGINE_TYPES.filter(
    (engine) => !GEO_ACTIVE_MONITORING_ENGINES.includes(engine),
  );
}

export function buildGeoMonitoringPhaseNote() {
  const deferredEngines = getGlobalDeferredGeoMonitoringEngines();
  return `ChatGPT monitoring is active via the default AI connection. ${deferredEngines.join(", ")} remain deferred for a later GEO phase.`;
}
