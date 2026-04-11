import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  listGeoPromptsMock,
  listGeoVisibilityLogsMock,
  getGeoMachineReadabilityStatusMock,
  listGeoMonitoringRunsMock,
  listGeoAioEvidenceMock,
} = vi.hoisted(() => ({
  listGeoPromptsMock: vi.fn(),
  listGeoVisibilityLogsMock: vi.fn(),
  getGeoMachineReadabilityStatusMock: vi.fn(),
  listGeoMonitoringRunsMock: vi.fn(),
  listGeoAioEvidenceMock: vi.fn(),
}));

vi.mock("../../../../lib/geo-prompt-store", () => ({
  listGeoPrompts: listGeoPromptsMock,
}));

vi.mock("../../../../lib/geo-visibility-log-store", () => ({
  listGeoVisibilityLogs: listGeoVisibilityLogsMock,
}));

vi.mock("../../../../lib/geo-machine-readability-store", () => ({
  getGeoMachineReadabilityStatus: getGeoMachineReadabilityStatusMock,
}));

vi.mock("../../../../lib/geo-monitoring-run-store", () => ({
  listGeoMonitoringRuns: listGeoMonitoringRunsMock,
}));

vi.mock("../../../../lib/geo-aio-evidence-store", () => ({
  listGeoAioEvidence: listGeoAioEvidenceMock,
}));

import GeoCopilotAdminPage from "./page";

describe("GeoCopilotAdminPage", () => {
  beforeEach(() => {
    listGeoPromptsMock.mockReset();
    listGeoVisibilityLogsMock.mockReset();
    getGeoMachineReadabilityStatusMock.mockReset();
    listGeoMonitoringRunsMock.mockReset();
    listGeoAioEvidenceMock.mockReset();
  });

  test("renders the GEO Copilot workspace and empty-state language", async () => {
    listGeoPromptsMock.mockResolvedValue([]);
    listGeoVisibilityLogsMock.mockResolvedValue([]);
    listGeoMonitoringRunsMock.mockResolvedValue([]);
    listGeoAioEvidenceMock.mockResolvedValue([]);
    getGeoMachineReadabilityStatusMock.mockResolvedValue({
      llmsTxtStatus: "not-configured",
      llmsFullTxtStatus: "not-configured",
      ssrStatus: "needs-attention",
      jsonLdStatus: "needs-attention",
      notes: "",
      lastCheckedAt: null,
      updatedAt: "2026-04-06T00:00:00.000Z",
    });

    const markup = renderToStaticMarkup(await GeoCopilotAdminPage());

    expect(markup).toContain("GEO Copilot");
    expect(markup).toContain("Golden prompts");
    expect(markup).toContain("Visibility logs");
    expect(markup).toContain("Google AI Overviews evidence");
    expect(markup).toContain("Monitoring automation");
    expect(markup).toContain("Intent calibration");
    expect(markup).toContain("Workflow intent");
    expect(markup).toContain("Website-derived GEO starters");
    expect(markup).toContain("Machine-readability layer");
    expect(markup).toContain("Content optimization copilot");
    expect(markup).toContain("Content page structure suggestions");
    expect(markup).toContain("No Golden Prompts yet");
  });
});
