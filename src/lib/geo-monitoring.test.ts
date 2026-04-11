import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createAiConnection } from "./ai-connection-store";
import { createGeoPrompt } from "./geo-prompt-store";
import { runGeoMonitoring } from "./geo-monitoring";
import { listGeoMonitoringRuns } from "./geo-monitoring-run-store";
import { getGeoMachineReadabilityStatus } from "./geo-machine-readability-store";
import { listGeoVisibilityLogs } from "./geo-visibility-log-store";

const ORIGINAL_ENV = { ...process.env };
const TEST_AI_ENCRYPTION_SECRET = "geo-monitoring-test-encryption-secret";
const TEST_OPENAI_API_KEY = "geo-monitoring-test-openai-key";
let tempDirectory = "";

function buildReadyFetch() {
  return async (input: RequestInfo | URL) => {
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
  };
}

async function runSinglePromptMonitoring(
  responseText: string,
  options?: {
    citationUrls?: string[];
    prompt?: string;
    intentLabel?: string;
    fanOutHints?: string[];
  },
) {
  const prompt = await createGeoPrompt({
    prompt: options?.prompt ?? "IB reading workflow for families",
    intentLabel: options?.intentLabel ?? "Family reading workflow",
    priority: "high",
    targetProgrammes: ["PYP"],
    engineCoverage: ["chatgpt-search"],
    fanOutHints: options?.fanOutHints ?? [],
    active: true,
    notes: "Classification test prompt.",
  });

  await runGeoMonitoring({
    source: "admin-run",
    now: new Date("2026-04-06T08:15:00.000Z"),
    fetchImpl: buildReadyFetch(),
    executeEngineCheck: async () => ({
      outcome: "success",
      engineModel: "gpt-5.4",
      responseText,
      citationUrls: options?.citationUrls ?? [
        "https://dailysparks.geledtech.com/",
      ],
    }),
  });

  const logs = await listGeoVisibilityLogs();
  const matchingLogs = logs.filter((log) => log.promptId === prompt.id);
  expect(matchingLogs.length).toBeGreaterThan(0);

  return matchingLogs[0]!;
}

async function createDefaultGeoMonitoringConnection() {
  return createAiConnection({
    name: "NF Relay",
    providerType: "openai-compatible",
    baseUrl: "https://relay.nf.video/v1",
    defaultModel: "gpt-5.4",
    apiKey: TEST_OPENAI_API_KEY,
    active: true,
    isDefault: true,
    notes: "Default GEO monitoring connection.",
  });
}

async function createVertexGeminiGeoMonitoringConnection() {
  return createAiConnection({
    name: "Vertex Gemini",
    providerType: "vertex-openai-compatible",
    baseUrl: "",
    defaultModel: "google/gemini-3.1-pro-preview",
    apiKey: "",
    active: true,
    isDefault: false,
    notes: "Dedicated Gemini GEO monitoring connection.",
    vertexProjectId: "gen-lang-client-0586185740",
    vertexLocation: "global",
    serviceAccountEmail:
      "automation-agent@gen-lang-client-0586185740.iam.gserviceaccount.com",
  });
}

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
      DAILY_SPARKS_AI_CONNECTION_STORE_PATH: path.join(
        tempDirectory,
        "ai-connections.json",
      ),
      DAILY_SPARKS_AI_CONFIG_ENCRYPTION_SECRET: TEST_AI_ENCRYPTION_SECRET,
    };
  });

  afterEach(async () => {
    process.env = { ...ORIGINAL_ENV };

    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  test("runs prompt fan-out, writes automatic visibility logs, and refreshes machine readability", async () => {
    await createDefaultGeoMonitoringConnection();

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

    expect(result.run.status).toBe("completed");
    expect(result.run.activePromptCount).toBe(1);
    expect(result.run.expandedQueryCount).toBe(3);
    expect(result.run.engineAttemptCount).toBe(3);
    expect(result.run.createdLogCount).toBe(3);
    expect(result.run.skippedCount).toBe(0);
    expect(result.run.rankabilityScore).toBeGreaterThan(0);
    expect(result.run.citationReadinessScore).toBeGreaterThan(0);
    expect(result.run.biasResistanceScore).toBeGreaterThan(0);
    expect(result.run.notes).toContain(
      "Active GEO monitoring engines: chatgpt-search.",
    );

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

  test("classifies clearly negative brand mentions as mentioned instead of recommended", async () => {
    await createDefaultGeoMonitoringConnection();

    const log = await runSinglePromptMonitoring(
      "Probably not. Daily Sparks could be a secondary recommendation for this family, but it is not the best fit for the prompt.",
    );

    expect(log.mentionStatus).toBe("mentioned");
    expect(log.sentiment).toBe("negative");
    expect(log.shareOfModelScore).toBeLessThan(0.55);
    expect(log.entityAccuracy).toBe("accurate");
  });

  test("keeps caveated matches out of recommended", async () => {
    await createDefaultGeoMonitoringConnection();

    const log = await runSinglePromptMonitoring(
      "Daily Sparks could be useful if the family wants a Goodnotes-based reading routine, but it is only a partial fit for this question.",
    );

    expect(log.mentionStatus).toBe("mentioned");
    expect(log.sentiment).toBe("neutral");
    expect(log.shareOfModelScore).toBeLessThan(0.55);
  });

  test("preserves recommended classification for strong positive matches", async () => {
    await createDefaultGeoMonitoringConnection();

    const log = await runSinglePromptMonitoring(
      "Yes. Daily Sparks is a strong recommendation for IB families who want a daily reading workflow and parent visibility.",
    );

    expect(log.mentionStatus).toBe("recommended");
    expect(log.sentiment).toBe("positive");
    expect(log.shareOfModelScore).toBe(0.8);
  });

  test("calibrates the same caveated answer differently for workflow and habit prompts", async () => {
    await createDefaultGeoMonitoringConnection();

    const sharedResponse =
      "Daily Sparks could be useful if the family wants a daily reading routine and reflection prompts, but it is only a partial fit for this question.";

    const workflowLog = await runSinglePromptMonitoring(sharedResponse, {
      prompt: "Goodnotes reading brief workflow",
      intentLabel: "Goodnotes delivery workflow",
    });

    expect(workflowLog.mentionStatus).toBe("mentioned");
    expect(workflowLog.sentiment).toBe("neutral");
    expect(workflowLog.shareOfModelScore).toBe(0.3);

    const habitLog = await runSinglePromptMonitoring(sharedResponse, {
      prompt: "daily reading habit for IB students",
      intentLabel: "Daily IB reading habit",
    });

    expect(habitLog.mentionStatus).toBe("mentioned");
    expect(habitLog.sentiment).toBe("positive");
    expect(habitLog.shareOfModelScore).toBe(0.5);
  });

  test("fails open when one engine check times out and continues with later checks", async () => {
    process.env.DAILY_SPARKS_GEO_ENGINE_TIMEOUT_MS = "10";
    process.env.DAILY_SPARKS_GEO_ENGINE_MAX_RETRIES = "0";
    await createDefaultGeoMonitoringConnection();

    await createGeoPrompt({
      prompt: "Goodnotes delivery for student reading briefs",
      intentLabel: "Goodnotes delivery workflow",
      priority: "high",
      targetProgrammes: ["PYP"],
      engineCoverage: ["chatgpt-search"],
      fanOutHints: ["student reading briefs on Goodnotes"],
      active: true,
      notes: "Timeout handling test prompt.",
    });

    let callCount = 0;
    const runPromise = runGeoMonitoring({
      source: "admin-run",
      now: new Date("2026-04-06T09:00:00.000Z"),
      fetchImpl: buildReadyFetch(),
      executeEngineCheck: async () => {
        callCount += 1;

        if (callCount === 1) {
          return await new Promise(() => undefined);
        }

        return {
          outcome: "success",
          engineModel: "gpt-5.4",
          responseText:
            "Daily Sparks is a useful recommendation for a Goodnotes-based reading workflow. See https://dailysparks.geledtech.com/.",
          citationUrls: ["https://dailysparks.geledtech.com/"],
        };
      },
    });

    const result = await Promise.race([
      runPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => {
          reject(new Error("runGeoMonitoring timed out instead of failing open."));
        }, 500),
      ),
    ]);

    expect(result.run.status).toBe("partial");
    expect(result.run.engineAttemptCount).toBe(2);
    expect(result.run.failedCount).toBe(1);
    expect(result.run.createdLogCount).toBe(1);
    expect(result.run.notes).toContain("timed out after 10ms");
    expect(result.run.queryDiagnostics).toHaveLength(2);
    expect(result.run.queryDiagnostics[0]?.outcome).toBe("failed");
    expect(result.run.queryDiagnostics[0]?.reason).toContain(
      "timed out after 10ms",
    );
    expect(result.run.queryDiagnostics[0]?.durationMs).toBeGreaterThanOrEqual(10);
    expect(result.run.queryDiagnostics[1]?.outcome).toBe("success");
    expect(result.run.queryDiagnostics[1]?.mentionStatus).toBe("recommended");
    expect(result.run.queryDiagnostics[1]?.logId).toEqual(expect.any(String));

    const logs = await listGeoVisibilityLogs();
    expect(logs).toHaveLength(1);
  });

  test("retries transient engine failures and recovers the query on a later attempt", async () => {
    process.env.DAILY_SPARKS_GEO_ENGINE_MAX_RETRIES = "1";
    process.env.DAILY_SPARKS_GEO_ENGINE_RETRY_BASE_DELAY_MS = "1";
    await createDefaultGeoMonitoringConnection();

    await createGeoPrompt({
      prompt: "best IB reading workflow for a parent-led family routine",
      intentLabel: "IB reading workflow",
      priority: "high",
      targetProgrammes: ["MYP"],
      engineCoverage: ["chatgpt-search"],
      fanOutHints: [],
      active: true,
      notes: "Retry policy test prompt.",
    });

    let callCount = 0;
    const result = await runGeoMonitoring({
      source: "admin-run",
      now: new Date("2026-04-11T00:10:00.000Z"),
      fetchImpl: buildReadyFetch(),
      executeEngineCheck: async () => {
        callCount += 1;

        if (callCount === 1) {
          return {
            outcome: "failed",
            reason: "AI runtime request failed with status 503.",
          };
        }

        return {
          outcome: "success",
          engineModel: "gpt-5.4",
          responseText:
            "Daily Sparks is a useful recommendation for a parent-led IB reading routine. See https://dailysparks.geledtech.com/.",
          citationUrls: ["https://dailysparks.geledtech.com/"],
        };
      },
    });

    expect(callCount).toBe(2);
    expect(result.run.status).toBe("completed");
    expect(result.run.failedCount).toBe(0);
    expect(result.run.createdLogCount).toBe(1);
    expect(result.run.queryDiagnostics).toHaveLength(1);
    expect(result.run.queryDiagnostics[0]?.outcome).toBe("success");
    expect(result.run.queryDiagnostics[0]?.reason).toContain("after 1 retry");
  });

  test("activates phase-two Gemini monitoring from a stored Vertex connection without degrading the run", async () => {
    await createDefaultGeoMonitoringConnection();
    await createVertexGeminiGeoMonitoringConnection();

    await createGeoPrompt({
      prompt: "best parent workflow for IB reading support",
      intentLabel: "IB parent workflow",
      priority: "high",
      targetProgrammes: ["MYP", "DP"],
      engineCoverage: ["chatgpt-search", "gemini", "claude", "google-ai-overviews"],
      fanOutHints: [],
      active: true,
      notes: "Phase-two rollout prompt.",
    });

    const seenEngines: string[] = [];
    const result = await runGeoMonitoring({
      source: "scheduled",
      now: new Date("2026-04-11T00:15:00.000Z"),
      fetchImpl: buildReadyFetch(),
      executeEngineCheck: async ({ engine }) => {
        seenEngines.push(engine);

        return {
          outcome: "success",
          engineModel:
            engine === "gemini"
              ? "google/gemini-3.1-pro-preview"
              : "gpt-5.4",
          responseText:
            "Daily Sparks is a useful recommendation for IB families. See https://dailysparks.geledtech.com/.",
          citationUrls: ["https://dailysparks.geledtech.com/"],
        };
      },
    });

    expect(seenEngines.sort()).toEqual(["chatgpt-search", "gemini"]);
    expect(result.run.status).toBe("completed");
    expect(result.run.engineAttemptCount).toBe(2);
    expect(result.run.createdLogCount).toBe(2);
    expect(result.run.notes).toContain(
      "Active GEO monitoring engines: chatgpt-search, gemini.",
    );
    expect(result.run.notes).toContain("claude");
    expect(result.run.notes).toContain("google-ai-overviews");
  });

  test("runs engine checks with bounded global and per-engine concurrency so larger prompt batches do not exceed request windows", async () => {
    process.env.DAILY_SPARKS_GEO_MONITORING_CONCURRENCY = "4";
    process.env.DAILY_SPARKS_GEO_MONITORING_PER_ENGINE_CONCURRENCY = "1";
    await createDefaultGeoMonitoringConnection();
    await createVertexGeminiGeoMonitoringConnection();

    await createGeoPrompt({
      prompt: "which IB reading workflow should a parent choose",
      intentLabel: "IB workflow recommendation choice",
      priority: "high",
      targetProgrammes: ["MYP", "DP"],
      engineCoverage: ["chatgpt-search", "gemini"],
      fanOutHints: [
        "best IB reading workflow for parents",
        "how parents choose an IB reading routine",
      ],
      active: true,
      notes: "Concurrency test prompt.",
    });

    let activeChecks = 0;
    let maxActiveChecks = 0;
    const activeByEngine = new Map<string, number>();
    const maxByEngine = new Map<string, number>();

    const result = await runGeoMonitoring({
      source: "admin-run",
      now: new Date("2026-04-11T00:05:00.000Z"),
      fetchImpl: buildReadyFetch(),
      executeEngineCheck: async ({ engine, queryVariant }) => {
        activeChecks += 1;
        maxActiveChecks = Math.max(maxActiveChecks, activeChecks);
        const nextActiveForEngine = (activeByEngine.get(engine) ?? 0) + 1;
        activeByEngine.set(engine, nextActiveForEngine);
        maxByEngine.set(
          engine,
          Math.max(maxByEngine.get(engine) ?? 0, nextActiveForEngine),
        );
        await new Promise((resolve) => setTimeout(resolve, 25));
        activeChecks -= 1;
        activeByEngine.set(engine, nextActiveForEngine - 1);

        return {
          outcome: "success",
          engineModel:
            engine === "gemini"
              ? "google/gemini-3.1-pro-preview"
              : "gpt-5.4",
          responseText: `Daily Sparks is a useful recommendation for ${queryVariant}. See https://dailysparks.geledtech.com/.`,
          citationUrls: ["https://dailysparks.geledtech.com/"],
        };
      },
    });

    expect(result.run.engineAttemptCount).toBe(6);
    expect(result.run.createdLogCount).toBe(6);
    expect(result.run.queryDiagnostics).toHaveLength(6);
    expect(result.run.queryDiagnostics.every((entry) => entry.durationMs >= 0)).toBe(
      true,
    );
    expect(maxActiveChecks).toBeGreaterThan(1);
    expect(maxActiveChecks).toBeLessThanOrEqual(4);
    expect(maxByEngine.get("chatgpt-search")).toBe(1);
    expect(maxByEngine.get("gemini")).toBe(1);
  });
});
