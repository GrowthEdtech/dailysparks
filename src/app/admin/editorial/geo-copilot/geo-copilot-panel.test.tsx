import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import GeoCopilotPanel from "./geo-copilot-panel";

describe("GeoCopilotPanel", () => {
  test("renders the four GEO modules and the audit workspace", () => {
    const markup = renderToStaticMarkup(
      <GeoCopilotPanel
        initialPrompts={[]}
        initialLogs={[]}
        initialMachineReadabilityStatus={{
          llmsTxtStatus: "not-configured",
          llmsFullTxtStatus: "not-configured",
          ssrStatus: "needs-attention",
          jsonLdStatus: "needs-attention",
          notes: "",
          lastCheckedAt: null,
          updatedAt: "2026-04-06T00:00:00.000Z",
        }}
        initialSummary={{
          trackedPromptCount: 0,
          activePromptCount: 0,
          shareOfModelAverage: 0,
          citationShareAverage: 0,
          positiveSentimentRate: 0,
          entityAccuracyRate: 0,
          lastScanAt: null,
          readinessReadyCount: 0,
        }}
      />,
    );

    expect(markup).toContain("Manage AI visibility, prompt coverage");
    expect(markup).toContain("Golden prompts");
    expect(markup).toContain("Visibility logs");
    expect(markup).toContain("Machine-readability layer");
    expect(markup).toContain("Content optimization copilot");
    expect(markup).toContain("Run GEO audit");
  });
});
