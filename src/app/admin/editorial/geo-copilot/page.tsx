import GeoCopilotPanel from "./geo-copilot-panel";
import { buildGeoVisibilitySummary } from "./geo-copilot-helpers";
import { getGeoMachineReadabilityStatus } from "../../../../lib/geo-machine-readability-store";
import { listGeoPrompts } from "../../../../lib/geo-prompt-store";
import { listGeoVisibilityLogs } from "../../../../lib/geo-visibility-log-store";

export default async function GeoCopilotAdminPage() {
  const [prompts, logs, machineReadabilityStatus] = await Promise.all([
    listGeoPrompts(),
    listGeoVisibilityLogs(),
    getGeoMachineReadabilityStatus(),
  ]);
  const summary = buildGeoVisibilitySummary({
    prompts,
    logs,
    machineReadabilityStatus,
  });

  return (
    <GeoCopilotPanel
      initialPrompts={prompts}
      initialLogs={logs}
      initialMachineReadabilityStatus={machineReadabilityStatus}
      initialSummary={summary}
    />
  );
}
