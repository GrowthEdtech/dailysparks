import GeoCopilotPanel from "./geo-copilot-panel";
import {
  buildGeoOpsSummary,
  buildGeoVisibilitySummary,
} from "./geo-copilot-helpers";
import { listGeoAioEvidence } from "../../../../lib/geo-aio-evidence-store";
import { getGeoMachineReadabilityStatus } from "../../../../lib/geo-machine-readability-store";
import { listGeoMonitoringRuns } from "../../../../lib/geo-monitoring-run-store";
import { listGeoPrompts } from "../../../../lib/geo-prompt-store";
import { listGeoVisibilityLogs } from "../../../../lib/geo-visibility-log-store";

export default async function GeoCopilotAdminPage() {
  const [prompts, logs, runs, machineReadabilityStatus, aioEvidence] = await Promise.all([
    listGeoPrompts(),
    listGeoVisibilityLogs(),
    listGeoMonitoringRuns(),
    getGeoMachineReadabilityStatus(),
    listGeoAioEvidence(),
  ]);
  const summary = buildGeoVisibilitySummary({
    prompts,
    logs,
    machineReadabilityStatus,
  });
  const opsSummary = buildGeoOpsSummary({
    runs,
    logs,
    aioEvidence,
  });

  return (
    <GeoCopilotPanel
      initialPrompts={prompts}
      initialLogs={logs}
      initialRuns={runs}
      initialAioEvidence={aioEvidence}
      initialMachineReadabilityStatus={machineReadabilityStatus}
      initialSummary={summary}
      initialOpsSummary={opsSummary}
    />
  );
}
