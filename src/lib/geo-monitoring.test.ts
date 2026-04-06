import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createGeoPrompt } from "./geo-prompt-store";
import { runGeoMonitoring } from "./geo-monitoring";
import { listGeoMonitoringRuns } from "./geo-monitoring-run-store";
import { getGeoMachineReadabilityStatus } from "./geo-machine-readability-store";
import { listGeoVisibilityLogs } from "./geo-visibility-log-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

describe("geo-monitoring", () => {
  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), "geo-monitoring-"));
    process.env = {
      ...ORIGINAL_ENV,
      DAILY_SPARKS_STORE_BACKEND: "local",
      DAILY_SPARKS_GEO_PROMPT_STORE_PATH: path.join(tempDirectory, "prompts.json"),
      DAILY_SPARKS_GEO_VISIBILITY_LOG_STORE_PATH: path.join(
        tempDirectory,
        "logs.json",
      ),
      DAILY_SPARKS_GEO_MACHINE_READABILITY_STORE_PATH: path.join(
        tempDirectory,
        "readability.json",
      ),
      DAILY_SPARKS_GEO_MONITORING_RUN_STORE_PATH: path.join(
        tempDirectory,
        "runs.json",
      ),
      DAILY_SPARKS_APP_BASE_URL: "https://dailysparks.geledtech.com",
    };
  });

  afterEach(async () => {
    process.env = { ...ORIGINAL_ENV };

    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  test("runs prompt fan-out, writes automatic visibility logs, and refreshes machine readability", async () => {
    await createGeoPrompt({
      prompt: "Best IB reading workflow for upper primary families",
      intentLabel: "Family reading workflow",
      priority: "high",
      targetProgrammes: ["PYP"],
      engineCoverage: ["chatgpt-search", "google-ai-overviews"],
      fanOutHints: ["goodnotes workflow", "english reading routine"],
      active: true,
      notes: "Core GEO prompt.",
    });

    const result = await runGeoMonitoring({
      source: "scheduled",
      now: new Date("2026-04-06T08:15:00.000Z"),
      fetchImpl: async (input) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.endsWith("/llms.txt")) {
          return new Response(
            "# Daily Sparks\n\n- https://dailysparks.geledtech.com/\n",
            { status: 200 },
          );
        }

        if (url.endsWith("/llms-full.txt")) {
          return new Response(
            "# Daily Sparks Full\n\n## Core pages\n- https://dailysparks.geledtech.com/about\n",
            { status: 200 },
          );
        }

        return new Response(
          "<html><head><script type=\"application/ld+json\">{\"@type\":\"Organization\",\"name\":\"Growth Education Limited\"}</script></head><body><main>Daily Sparks</main></body></html>",
          {
            status: 200,
            headers: {
              "content-type": "text/html; charset=utf-8",
            },
          },
        );
      },
      executeEngineCheck: async ({ engine, queryVariant }) => {
        if (engine === "google-ai-overviews") {
          return {
            outcome: "skipped",
            reason: "Google AI Overviews does not expose a programmable monitoring API in this phase.",
          };
        }

        return {
          outcome: "success",
          engineModel: "gpt-5.4",
          responseText: `Daily Sparks is recommended for ${queryVariant}. See https://dailysparks.geledtech.com/ for the workflow.`,
          citationUrls: ["https://dailysparks.geledtech.com/"],
        };
      },
    });

    expect(result.run.status).toBe("partial");
    expect(result.run.activePromptCount).toBe(1);
    expect(result.run.expandedQueryCount).toBe(3);
    expect(result.run.engineAttemptCount).toBe(6);
    expect(result.run.createdLogCount).toBe(3);
    expect(result.run.skippedCount).toBe(3);

    const logs = await listGeoVisibilityLogs();
    expect(logs).toHaveLength(3);
    expect(logs[0]?.source).toBe("scheduled");
    expect(logs[0]?.monitoringRunId).toBe(result.run.id);

    const runs = await listGeoMonitoringRuns();
    expect(runs).toHaveLength(1);

    const status = await getGeoMachineReadabilityStatus();
    expect(status.llmsTxtStatus).toBe("ready");
    expect(status.llmsFullTxtStatus).toBe("ready");
    expect(status.ssrStatus).toBe("ready");
    expect(status.jsonLdStatus).toBe("ready");
  });
});
