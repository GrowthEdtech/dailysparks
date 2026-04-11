import {
  createGeoMonitoringRun,
  updateGeoMonitoringRun,
} from "./geo-monitoring-run-store";
import type {
  GeoMonitoringEngineBreakdown,
  GeoMonitoringQueryDiagnostic,
  GeoMonitoringRunRecord,
  GeoMonitoringRunSource,
} from "./geo-monitoring-run-schema";
import {
  updateGeoMachineReadabilityStatus,
} from "./geo-machine-readability-store";
import type { GeoMachineReadabilityStatusRecord } from "./geo-machine-readability-schema";
import { auditGeoContent } from "./geo-content-audit";
import {
  type RuntimeAiConnection,
  type RuntimeAiConnectionWithProvider,
  listActiveAiConnectionsWithSecret,
} from "./ai-connection-store";
import {
  generateOpenAiCompatibleText,
  generateTextWithDefaultAiConnectionPolicy,
} from "./ai-runtime";
import { listGeoPrompts } from "./geo-prompt-store";
import type { GeoEngineType, GeoPromptRecord } from "./geo-prompt-schema";
import { createGeoVisibilityLog } from "./geo-visibility-log-store";
import type { GeoVisibilityLogRecord, GeoVisibilityLogSource } from "./geo-visibility-log-schema";
import {
  buildGeoMonitoringPhaseNote,
  getDeferredGeoMonitoringEngines,
  getPhaseEnabledGeoMonitoringEngines,
} from "./geo-monitoring-engine-policy";
import {
  inferGeoPromptIntentBucketFromPrompt,
  type GeoPromptIntentBucket,
} from "./geo-prompt-intent";

type GeoMonitoringSuccess = {
  outcome: "success";
  engineModel: string;
  responseText: string;
  citationUrls: string[];
};

type GeoMonitoringSkipped = {
  outcome: "skipped";
  reason: string;
};

type GeoMonitoringFailed = {
  outcome: "failed";
  reason: string;
};

export type GeoMonitoringEngineResult =
  | GeoMonitoringSuccess
  | GeoMonitoringSkipped
  | GeoMonitoringFailed;

export type GeoMonitoringEngineInput = {
  engine: GeoEngineType;
  prompt: GeoPromptRecord;
  queryVariant: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
  runtimeConnection?: RuntimeAiConnectionWithProvider | null;
  signal?: AbortSignal;
};

export type RunGeoMonitoringInput = {
  source: GeoMonitoringRunSource;
  runId?: string;
  persistMode?: "create" | "update";
  now?: Date;
  fetchImpl?: typeof fetch;
  executeEngineCheck?: (
    input: GeoMonitoringEngineInput,
  ) => Promise<GeoMonitoringEngineResult>;
};

export type GeoMonitoringResult = {
  run: GeoMonitoringRunRecord;
  logs: GeoVisibilityLogRecord[];
  machineReadabilityStatus: GeoMachineReadabilityStatusRecord;
};

type MachineReadabilityAssessment = {
  llmsTxtStatus: GeoMachineReadabilityStatusRecord["llmsTxtStatus"];
  llmsFullTxtStatus: GeoMachineReadabilityStatusRecord["llmsFullTxtStatus"];
  ssrStatus: GeoMachineReadabilityStatusRecord["ssrStatus"];
  jsonLdStatus: GeoMachineReadabilityStatusRecord["jsonLdStatus"];
  notes: string;
  auditSourceText: string;
};

function getGeoMonitoringBaseUrl() {
  return (
    process.env.DAILY_SPARKS_APP_BASE_URL?.trim().replace(/\/+$/, "") ||
    "https://dailysparks.geledtech.com"
  );
}

function extractUrls(text: string) {
  const matches = text.match(/https?:\/\/[^\s)]+/g);
  return matches ? Array.from(new Set(matches.map((match) => match.trim()))) : [];
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeResponseText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function getGeoMonitoringEngineTimeoutMs() {
  const rawValue = process.env.DAILY_SPARKS_GEO_ENGINE_TIMEOUT_MS?.trim();
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed >= 10) {
    return parsed;
  }

  return 15000;
}

function getGeoMonitoringEngineMaxRetries() {
  const rawValue = process.env.DAILY_SPARKS_GEO_ENGINE_MAX_RETRIES?.trim();
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.min(3, parsed);
  }

  return 1;
}

function getGeoMonitoringEngineRetryBaseDelayMs() {
  const rawValue =
    process.env.DAILY_SPARKS_GEO_ENGINE_RETRY_BASE_DELAY_MS?.trim();
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.min(5000, parsed);
  }

  return 250;
}

function getGeoMonitoringConcurrency() {
  const rawValue = process.env.DAILY_SPARKS_GEO_MONITORING_CONCURRENCY?.trim();
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed >= 1) {
    return Math.min(8, parsed);
  }

  return 4;
}

function getGeoMonitoringPerEngineConcurrency() {
  const rawValue =
    process.env.DAILY_SPARKS_GEO_MONITORING_PER_ENGINE_CONCURRENCY?.trim();
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed >= 1) {
    return Math.min(4, parsed);
  }

  return 2;
}

function expandPromptQueries(prompt: GeoPromptRecord) {
  return Array.from(
    new Set([prompt.prompt, ...prompt.fanOutHints].map((item) => item.trim()).filter(Boolean)),
  );
}

async function mapGeoMonitoringTasksWithConcurrency<R>(
  tasks: GeoMonitoringTask[],
  concurrency: number,
  perEngineConcurrency: number,
  mapper: (task: GeoMonitoringTask) => Promise<R>,
) {
  if (tasks.length === 0) {
    return [] as R[];
  }

  const results = new Array<R>(tasks.length);
  const pendingTasks = tasks.map((task, index) => ({ task, index }));
  const activeByEngine = new Map<GeoEngineType, number>();
  const maxGlobalConcurrency = Math.max(1, concurrency);
  const maxPerEngineConcurrency = Math.max(1, perEngineConcurrency);
  let activeCount = 0;
  let completedCount = 0;
  let rejected = false;

  return await new Promise<R[]>((resolve, reject) => {
    const launchNext = () => {
      if (rejected) {
        return;
      }

      while (activeCount < maxGlobalConcurrency && pendingTasks.length > 0) {
        const nextPendingIndex = pendingTasks.findIndex(
          ({ task }) =>
            (activeByEngine.get(task.engine) ?? 0) < maxPerEngineConcurrency,
        );

        if (nextPendingIndex === -1) {
          break;
        }

        const nextTask = pendingTasks.splice(nextPendingIndex, 1)[0]!;
        activeCount += 1;
        activeByEngine.set(
          nextTask.task.engine,
          (activeByEngine.get(nextTask.task.engine) ?? 0) + 1,
        );

        mapper(nextTask.task)
          .then((result) => {
            results[nextTask.index] = result;
          })
          .catch((error) => {
            rejected = true;
            reject(error);
          })
          .finally(() => {
            activeCount -= 1;
            activeByEngine.set(
              nextTask.task.engine,
              Math.max((activeByEngine.get(nextTask.task.engine) ?? 1) - 1, 0),
            );
            completedCount += 1;

            if (completedCount === tasks.length) {
              resolve(results);
              return;
            }

            launchNext();
          });
      }
    };

    launchNext();
  });
}

function mapRunSourceToLogSource(
  source: GeoMonitoringRunSource,
): GeoVisibilityLogSource {
  return source === "scheduled" ? "scheduled" : "admin-run";
}

function buildEngineBreakdown(entries: GeoMonitoringEngineBreakdown[]) {
  return entries.sort((left, right) => left.engine.localeCompare(right.engine));
}

function countReadyChecks(status: GeoMachineReadabilityStatusRecord) {
  return [
    status.llmsTxtStatus,
    status.llmsFullTxtStatus,
    status.ssrStatus,
    status.jsonLdStatus,
  ].filter((value) => value === "ready").length;
}

function buildMachineReadabilityNotes(checks: Array<[string, boolean, string]>) {
  return checks
    .filter(([, passed]) => !passed)
    .map(([label, , reason]) => `${label}: ${reason}`)
    .join(" | ");
}

function stripHtmlForGeoAudit(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(
  url: string,
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; text: string; status: number }> {
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        accept: "text/plain,text/html,application/xhtml+xml",
      },
    });

    return {
      ok: response.ok,
      text: await response.text(),
      status: response.status,
    };
  } catch {
    return {
      ok: false,
      text: "",
      status: 0,
    };
  }
}

async function assessMachineReadability(
  fetchImpl: typeof fetch,
  baseUrl: string,
): Promise<MachineReadabilityAssessment> {
  const [llmsTxt, llmsFullTxt, home] = await Promise.all([
    fetchText(`${baseUrl}/llms.txt`, fetchImpl),
    fetchText(`${baseUrl}/llms-full.txt`, fetchImpl),
    fetchText(`${baseUrl}/`, fetchImpl),
  ]);

  const llmsTxtReady =
    llmsTxt.ok && /Daily Sparks/i.test(llmsTxt.text);
  const llmsFullTxtReady =
    llmsFullTxt.ok &&
    /Core pages/i.test(llmsFullTxt.text) &&
    new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(
      llmsFullTxt.text,
    );
  const ssrReady = home.ok && /Daily Sparks/i.test(home.text);
  const jsonLdReady =
    home.ok &&
    /application\/ld\+json/i.test(home.text) &&
    /Growth Education Limited/i.test(home.text);

  return {
    llmsTxtStatus: llmsTxtReady
      ? "ready"
      : llmsTxt.status === 404
        ? "not-configured"
        : "needs-attention",
    llmsFullTxtStatus: llmsFullTxtReady
      ? "ready"
      : llmsFullTxt.status === 404
        ? "not-configured"
        : "needs-attention",
    ssrStatus: ssrReady ? "ready" : "needs-attention",
    jsonLdStatus: jsonLdReady
      ? "ready"
      : home.status === 404
        ? "not-configured"
        : "needs-attention",
    notes: buildMachineReadabilityNotes([
      ["/llms.txt", llmsTxtReady, `status ${llmsTxt.status || "fetch error"}`],
      [
        "/llms-full.txt",
        llmsFullTxtReady,
        `status ${llmsFullTxt.status || "fetch error"}`,
      ],
      ["SSR readiness", ssrReady, `status ${home.status || "fetch error"}`],
      [
        "JSON-LD coverage",
        jsonLdReady,
        home.ok ? "Organization JSON-LD missing" : `status ${home.status || "fetch error"}`,
      ],
    ]),
    auditSourceText: [
      "## llms.txt",
      llmsTxt.text,
      "## llms-full.txt",
      llmsFullTxt.text,
      "## Homepage SSR",
      stripHtmlForGeoAudit(home.text),
    ].join("\n\n"),
  };
}

function buildDeveloperPrompt(baseUrl: string) {
  return [
    "You are validating whether Daily Sparks appears in an AI answer.",
    `Daily Sparks base URL: ${baseUrl}.`,
    "Answer in plain text with a short recommendation, and include any relevant citation URLs inline if available.",
  ].join(" ");
}

async function executeOpenAiCompatibleEngine(
  connection: RuntimeAiConnectionWithProvider,
  queryVariant: string,
  baseUrl: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<GeoMonitoringEngineResult> {
  try {
    const result = await generateOpenAiCompatibleText({
      connection,
      developerPrompt: buildDeveloperPrompt(baseUrl),
      userPrompt: `Search query: ${queryVariant}\nDoes Daily Sparks appear as a useful recommendation for this intent?`,
      fetchImpl,
      signal,
    });

    return {
      outcome: "success",
      engineModel: result.model,
      responseText: result.text,
      citationUrls: extractUrls(result.text),
    };
  } catch (error) {
    return {
      outcome: "failed",
      reason:
        error instanceof Error ? error.message : "OpenAI-compatible engine failed.",
    };
  }
}

async function executeClaudeEngine(
  queryVariant: string,
  baseUrl: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<GeoMonitoringEngineResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5";

  if (!apiKey) {
    return {
      outcome: "skipped",
      reason: "ANTHROPIC_API_KEY is not configured.",
    };
  }

  try {
    const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal,
      body: JSON.stringify({
        model,
        max_tokens: 400,
        system: buildDeveloperPrompt(baseUrl),
        messages: [
          {
            role: "user",
            content: `Search query: ${queryVariant}\nDoes Daily Sparks appear as a useful recommendation for this intent?`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        outcome: "failed",
        reason: `Claude request failed with status ${response.status}.`,
      };
    }

    const payload = (await response.json()) as {
      content?: Array<{ text?: string }>;
      model?: string;
    };
    const text = payload.content?.map((entry) => entry.text ?? "").join("").trim();

    if (!text) {
      return {
        outcome: "failed",
        reason: "Claude returned no text content.",
      };
    }

    return {
      outcome: "success",
      engineModel: payload.model ?? model,
      responseText: text,
      citationUrls: extractUrls(text),
    };
  } catch (error) {
    return {
      outcome: "failed",
      reason: error instanceof Error ? error.message : "Claude engine failed.",
    };
  }
}

async function executeGeminiEngine(
  queryVariant: string,
  baseUrl: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<GeoMonitoringEngineResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  if (!apiKey) {
    return {
      outcome: "skipped",
      reason: "GEMINI_API_KEY is not configured.",
    };
  }

  try {
    const response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildDeveloperPrompt(baseUrl) }],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Search query: ${queryVariant}\nDoes Daily Sparks appear as a useful recommendation for this intent?`,
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      return {
        outcome: "failed",
        reason: `Gemini request failed with status ${response.status}.`,
      };
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    if (!text) {
      return {
        outcome: "failed",
        reason: "Gemini returned no text content.",
      };
    }

    return {
      outcome: "success",
      engineModel: model,
      responseText: text,
      citationUrls: extractUrls(text),
    };
  } catch (error) {
    return {
      outcome: "failed",
      reason: error instanceof Error ? error.message : "Gemini engine failed.",
    };
  }
}

function buildPerplexityConnection(): RuntimeAiConnection | null {
  const apiKey = process.env.PERPLEXITY_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return {
    id: "perplexity-env",
    name: "Perplexity",
    providerType: "openai-compatible",
    baseUrl: process.env.PERPLEXITY_BASE_URL?.trim() || "https://api.perplexity.ai",
    defaultModel:
      process.env.PERPLEXITY_MODEL?.trim() || "sonar-pro",
    apiKeyPreview: "env",
    hasApiKey: true,
    active: true,
    isDefault: false,
    notes: "Environment-backed GEO monitoring connection",
    createdAt: "",
    updatedAt: "",
    apiKey,
  };
}

type GeoMonitoringRuntimeCapabilities = {
  activeEngines: Set<GeoEngineType>;
  unavailableReasons: Map<GeoEngineType, string>;
  runtimeConnectionByEngine: Map<GeoEngineType, RuntimeAiConnectionWithProvider>;
};

function getGeminiApiKeyConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getPerplexityApiKeyConfigured() {
  return Boolean(process.env.PERPLEXITY_API_KEY?.trim());
}

function getClaudeApiKeyConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function connectionText(connection: RuntimeAiConnectionWithProvider) {
  return [
    connection.name,
    connection.baseUrl,
    connection.defaultModel,
    connection.notes,
  ]
    .join(" ")
    .toLowerCase();
}

function scoreGeminiMonitoringConnection(
  connection: RuntimeAiConnectionWithProvider,
) {
  const text = connectionText(connection);
  let score = 0;

  if (connection.providerType === "vertex-openai-compatible") {
    score += 100;
  }

  if (text.includes("gemini")) {
    score += 50;
  }

  if (connection.isDefault) {
    score += 10;
  }

  return score;
}

function scorePerplexityMonitoringConnection(
  connection: RuntimeAiConnectionWithProvider,
) {
  const text = connectionText(connection);
  let score = 0;

  if (text.includes("perplexity.ai")) {
    score += 100;
  }

  if (text.includes("perplexity") || text.includes("sonar")) {
    score += 50;
  }

  if (connection.isDefault) {
    score += 10;
  }

  return score;
}

function pickHighestScoringConnection(
  connections: RuntimeAiConnectionWithProvider[],
  scoreConnection: (connection: RuntimeAiConnectionWithProvider) => number,
) {
  return connections
    .map((connection) => ({
      connection,
      score: scoreConnection(connection),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .at(0)?.connection ?? null;
}

async function resolveGeoMonitoringRuntimeCapabilities(): Promise<GeoMonitoringRuntimeCapabilities> {
  const capabilities: GeoMonitoringRuntimeCapabilities = {
    activeEngines: new Set<GeoEngineType>(),
    unavailableReasons: new Map<GeoEngineType, string>(),
    runtimeConnectionByEngine: new Map<
      GeoEngineType,
      RuntimeAiConnectionWithProvider
    >(),
  };
  let activeConnections: RuntimeAiConnectionWithProvider[] = [];

  try {
    activeConnections = await listActiveAiConnectionsWithSecret();
  } catch (error) {
    capabilities.unavailableReasons.set(
      "chatgpt-search",
      error instanceof Error
        ? `AI connection store is unavailable: ${error.message}`
        : "AI connection store is unavailable.",
    );
  }

  const defaultConnection = activeConnections.find(
    (connection) => connection.isDefault,
  );
  const geminiConnection = pickHighestScoringConnection(
    activeConnections,
    scoreGeminiMonitoringConnection,
  );
  const perplexityConnection = pickHighestScoringConnection(
    activeConnections,
    scorePerplexityMonitoringConnection,
  );

  if (defaultConnection) {
    capabilities.activeEngines.add("chatgpt-search");
  } else if (!capabilities.unavailableReasons.has("chatgpt-search")) {
    capabilities.unavailableReasons.set(
      "chatgpt-search",
      "No active default AI connection is configured.",
    );
  }

  if (geminiConnection) {
    capabilities.activeEngines.add("gemini");
    capabilities.runtimeConnectionByEngine.set("gemini", geminiConnection);
  } else if (getGeminiApiKeyConfigured()) {
    capabilities.activeEngines.add("gemini");
  } else {
    capabilities.unavailableReasons.set(
      "gemini",
      "No active Gemini/Vertex monitoring connection or GEMINI_API_KEY is configured.",
    );
  }

  if (perplexityConnection) {
    capabilities.activeEngines.add("perplexity");
    capabilities.runtimeConnectionByEngine.set("perplexity", perplexityConnection);
  } else if (getPerplexityApiKeyConfigured()) {
    capabilities.activeEngines.add("perplexity");
  } else {
    capabilities.unavailableReasons.set(
      "perplexity",
      "No Perplexity monitoring connection or PERPLEXITY_API_KEY is configured.",
    );
  }

  if (getClaudeApiKeyConfigured()) {
    capabilities.activeEngines.add("claude");
  } else {
    capabilities.unavailableReasons.set(
      "claude",
      "ANTHROPIC_API_KEY is not configured.",
    );
  }

  capabilities.unavailableReasons.set(
    "google-ai-overviews",
    "Google AI Overviews uses the manual evidence workflow in this phase.",
  );

  return capabilities;
}

async function executeDefaultEngineCheck(
  input: GeoMonitoringEngineInput,
): Promise<GeoMonitoringEngineResult> {
  const fetchImpl = input.fetchImpl ?? fetch;

  switch (input.engine) {
    case "google-ai-overviews":
      return {
        outcome: "skipped",
        reason:
          "Google AI Overviews does not expose a programmable monitoring API in this phase.",
      };
    case "chatgpt-search": {
      try {
        const result = await generateTextWithDefaultAiConnectionPolicy({
          developerPrompt: buildDeveloperPrompt(input.baseUrl),
          userPrompt: `Search query: ${input.queryVariant}\nDoes Daily Sparks appear as a useful recommendation for this intent?`,
          fetchImpl,
          signal: input.signal,
        });

        return {
          outcome: "success",
          engineModel: result.model,
          responseText: result.text,
          citationUrls: extractUrls(result.text),
        };
      } catch (error) {
        return {
          outcome: "failed",
          reason:
            error instanceof Error
              ? error.message
              : "OpenAI-compatible engine failed.",
        };
      }
    }
    case "perplexity": {
      const connection = input.runtimeConnection ?? buildPerplexityConnection();

      if (!connection) {
        return {
          outcome: "skipped",
          reason: "PERPLEXITY_API_KEY is not configured.",
        };
      }

      return executeOpenAiCompatibleEngine(
        connection,
        input.queryVariant,
        input.baseUrl,
        fetchImpl,
        input.signal,
      );
    }
    case "gemini":
      if (input.runtimeConnection) {
        return executeOpenAiCompatibleEngine(
          input.runtimeConnection,
          input.queryVariant,
          input.baseUrl,
          fetchImpl,
          input.signal,
        );
      }

      return executeGeminiEngine(
        input.queryVariant,
        input.baseUrl,
        fetchImpl,
        input.signal,
      );
    case "claude":
      return executeClaudeEngine(
        input.queryVariant,
        input.baseUrl,
        fetchImpl,
        input.signal,
      );
    default:
      return {
        outcome: "skipped",
        reason: "No monitoring adapter is configured for this engine.",
      };
  }
}

async function executeEngineCheckWithDeadline(options: {
  executeEngineCheck: (
    input: GeoMonitoringEngineInput,
  ) => Promise<GeoMonitoringEngineResult>;
  input: GeoMonitoringEngineInput;
  timeoutMs: number;
}) {
  const abortController =
    typeof AbortController === "undefined" ? null : new AbortController();

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const engineCheckPromise = Promise.resolve()
      .then(() =>
        options.executeEngineCheck({
          ...options.input,
          signal: abortController?.signal,
        }),
      )
      .catch((error) => ({
        outcome: "failed" as const,
        reason:
          error instanceof Error
            ? error.message
            : "GEO monitoring engine check failed.",
      }));

    const timeoutPromise = new Promise<GeoMonitoringEngineResult>((resolve) => {
      timeoutId = setTimeout(() => {
        abortController?.abort();
        resolve({
          outcome: "failed",
          reason: `${options.input.engine} monitoring check timed out after ${options.timeoutMs}ms.`,
        });
      }, options.timeoutMs);
    });

    return await Promise.race([engineCheckPromise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

const GEO_RETRYABLE_ENGINE_FAILURE_PATTERNS = [
  /timed out/i,
  /\b429\b/i,
  /rate limit/i,
  /\b5\d\d\b/i,
  /temporar/i,
  /fetch failed/i,
  /network/i,
  /econnreset/i,
  /etimedout/i,
  /connection/i,
] as const;

function isRetryableGeoMonitoringFailure(result: GeoMonitoringEngineResult) {
  return (
    result.outcome === "failed" &&
    GEO_RETRYABLE_ENGINE_FAILURE_PATTERNS.some((pattern) =>
      pattern.test(result.reason),
    )
  );
}

async function waitForGeoMonitoringRetry(delayMs: number) {
  if (delayMs <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function executeEngineCheckWithRetryPolicy(options: {
  executeEngineCheck: (
    input: GeoMonitoringEngineInput,
  ) => Promise<GeoMonitoringEngineResult>;
  input: GeoMonitoringEngineInput;
  timeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
}) {
  let attemptCount = 0;
  let lastResult: GeoMonitoringEngineResult = {
    outcome: "failed",
    reason: "GEO monitoring engine check did not run.",
  };

  while (attemptCount <= options.maxRetries) {
    attemptCount += 1;
    lastResult = await executeEngineCheckWithDeadline({
      executeEngineCheck: options.executeEngineCheck,
      input: options.input,
      timeoutMs: options.timeoutMs,
    });

    if (
      !isRetryableGeoMonitoringFailure(lastResult) ||
      attemptCount > options.maxRetries
    ) {
      return {
        result: lastResult,
        attemptCount,
      };
    }

    await waitForGeoMonitoringRetry(
      options.retryBaseDelayMs * 2 ** (attemptCount - 1),
    );
  }

  return {
    result: lastResult,
    attemptCount,
  };
}

const GEO_STRONG_NEGATIVE_PATTERNS = [
  /\bprobably not\b/,
  /^\s*no\b/,
  /^\s*not exactly\b/,
  /\bnot the best fit\b/,
  /\bnot (?:a |an )?(?:good fit|fit|match|recommendation)\b/,
  /\bwould not recommend\b/,
  /\bunlikely\b/,
  /\bpoor fit\b/,
  /\bweak fit\b/,
] as const;

const GEO_STRONG_POSITIVE_PATTERNS = [
  /^\s*yes\b/,
  /\bstrong recommendation\b/,
  /\bhighly recommend(?:ed)?\b/,
  /\brecommended for\b/,
  /\bstrong fit\b/,
  /\bgood fit\b/,
  /\bwell-suited\b/,
  /\bexcellent fit\b/,
  /\buseful recommendation\b/,
] as const;

const GEO_WEAK_POSITIVE_PATTERNS = [
  /\bhelpful\b/,
  /\buseful\b/,
  /\brelevant\b/,
  /\bworth considering\b/,
  /\bgood option\b/,
  /\bcan support\b/,
] as const;

const GEO_CAVEAT_PATTERNS = [
  /\bcould\b/,
  /\bmight\b/,
  /\bmay\b/,
  /\bpossibly\b/,
  /\bperhaps\b/,
  /\bonly if\b/,
  /\bdepending on\b/,
  /\bpartial fit\b/,
  /\bpartially relevant\b/,
  /\bsecondary recommendation\b/,
] as const;

const GEO_WORKFLOW_RESPONSE_PATTERNS = [
  /\bgoodnotes\b/,
  /\bnotion\b/,
  /\bworkflow\b/,
  /\bdelivery\b/,
  /\bdeliver\b/,
  /\barchive\b/,
  /\bintegrat(?:e|ion)\b/,
  /\btemplate\b/,
  /\bannotation\b/,
  /\bimport\b/,
  /\bsync\b/,
  /\bpdf\b/,
  /\bbriefs?\b/,
] as const;

const GEO_HABIT_RESPONSE_PATTERNS = [
  /\bhabit\b/,
  /\broutine\b/,
  /\bdaily reading\b/,
  /\breflection\b/,
  /\breading stamina\b/,
  /\bconsisten(?:t|cy)\b/,
  /\bcritical reasoning\b/,
  /\bcritical thinking\b/,
  /\bwriting practice\b/,
  /\bparent support\b/,
  /\bsupport at home\b/,
] as const;

type GeoResponseSignals = {
  hasBrandSignal: boolean;
  strongNegative: boolean;
  strongPositive: boolean;
  weakPositive: boolean;
  caveated: boolean;
  workflowEvidence: boolean;
  habitEvidence: boolean;
};

type GeoMonitoringTask = {
  prompt: GeoPromptRecord;
  queryVariant: string;
  engine: GeoEngineType;
  runtimeConnection?: RuntimeAiConnectionWithProvider | null;
};

type GeoMonitoringTaskResult = {
  task: GeoMonitoringTask;
  result: GeoMonitoringEngineResult;
  durationMs: number;
  attemptCount: number;
};

function matchesAnyPattern(
  responseText: string,
  patterns: readonly RegExp[],
) {
  return patterns.some((pattern) => pattern.test(responseText));
}

function analyzeGeoResponse(
  responseText: string,
  citationUrls: string[],
  baseUrl: string,
): GeoResponseSignals {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedResponseText = normalizeResponseText(responseText);
  const mentionsBrand = /daily sparks/i.test(responseText);
  const citesBrand = citationUrls.some((url) =>
    normalizeBaseUrl(url).startsWith(normalizedBaseUrl),
  );

  return {
    hasBrandSignal: mentionsBrand || citesBrand,
    strongNegative: matchesAnyPattern(
      normalizedResponseText,
      GEO_STRONG_NEGATIVE_PATTERNS,
    ),
    strongPositive: matchesAnyPattern(
      normalizedResponseText,
      GEO_STRONG_POSITIVE_PATTERNS,
    ),
    weakPositive: matchesAnyPattern(
      normalizedResponseText,
      GEO_WEAK_POSITIVE_PATTERNS,
    ),
    caveated: matchesAnyPattern(normalizedResponseText, GEO_CAVEAT_PATTERNS),
    workflowEvidence: matchesAnyPattern(
      normalizedResponseText,
      GEO_WORKFLOW_RESPONSE_PATTERNS,
    ),
    habitEvidence: matchesAnyPattern(
      normalizedResponseText,
      GEO_HABIT_RESPONSE_PATTERNS,
    ),
  };
}

function inferMentionStatus(
  signals: GeoResponseSignals,
  intentBucket: GeoPromptIntentBucket,
) {
  if (!signals.hasBrandSignal) {
    return "not-mentioned" as const;
  }

  const positiveEnoughForRecommendation =
    signals.strongPositive &&
    !signals.strongNegative &&
    !signals.caveated &&
    (intentBucket === "workflow"
      ? signals.workflowEvidence
      : intentBucket === "habit-building"
        ? signals.habitEvidence || signals.workflowEvidence
        : true);

  if (positiveEnoughForRecommendation) {
    return "recommended" as const;
  }

  return "mentioned" as const;
}

function inferSentiment(
  mentionStatus: ReturnType<typeof inferMentionStatus>,
  signals: GeoResponseSignals,
  intentBucket: GeoPromptIntentBucket,
) {
  if (mentionStatus === "not-mentioned") {
    return "negative" as const;
  }

  if (signals.strongNegative) {
    return "negative" as const;
  }

  if (mentionStatus === "recommended") {
    return "positive" as const;
  }

  if (signals.strongPositive || (signals.weakPositive && !signals.caveated)) {
    return "positive" as const;
  }

  if (intentBucket === "habit-building" && signals.caveated && signals.habitEvidence) {
    return "positive" as const;
  }

  if (intentBucket === "workflow" && signals.caveated && !signals.workflowEvidence) {
    return "neutral" as const;
  }

  if (signals.caveated || signals.weakPositive) {
    return "neutral" as const;
  }

  return "neutral" as const;
}

function inferShareOfModelScore(
  mentionStatus: ReturnType<typeof inferMentionStatus>,
  signals: GeoResponseSignals,
  intentBucket: GeoPromptIntentBucket,
) {
  if (mentionStatus === "recommended") {
    return 0.8;
  }

  if (mentionStatus === "not-mentioned") {
    return 0.1;
  }

  if (signals.strongNegative) {
    return 0.25;
  }

  if (
    intentBucket === "workflow" &&
    signals.caveated &&
    !signals.workflowEvidence
  ) {
    return 0.3;
  }

  if (
    intentBucket === "habit-building" &&
    signals.caveated &&
    signals.habitEvidence
  ) {
    return 0.5;
  }

  if (signals.caveated) {
    return 0.4;
  }

  if (signals.weakPositive) {
    return 0.5;
  }

  return 0.45;
}

function inferCitationShareScore(citationUrls: string[], baseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  if (citationUrls.some((url) => normalizeBaseUrl(url).startsWith(normalizedBaseUrl))) {
    return 0.8;
  }

  return citationUrls.length > 0 ? 0.35 : 0;
}

function inferEntityAccuracy(
  mentionStatus: ReturnType<typeof inferMentionStatus>,
) {
  return mentionStatus === "not-mentioned" ? "mixed" : "accurate";
}

export async function runGeoMonitoring(
  input: RunGeoMonitoringInput,
): Promise<GeoMonitoringResult> {
  const now = input.now ?? new Date();
  const startedAt = now.toISOString();
  const runId = input.runId?.trim() || crypto.randomUUID();
  const persistMode = input.persistMode ?? "create";
  const fetchImpl = input.fetchImpl ?? fetch;
  const baseUrl = getGeoMonitoringBaseUrl();
  const prompts = (await listGeoPrompts()).filter((prompt) => prompt.active);
  const allExpandedQueries = prompts.flatMap((prompt) =>
    expandPromptQueries(prompt).map((queryVariant) => ({
      prompt,
      queryVariant,
    })),
  );
  const createdLogs: GeoVisibilityLogRecord[] = [];
  const queryDiagnostics: GeoMonitoringQueryDiagnostic[] = [];
  const notes: string[] = [];
  const engineBreakdownMap = new Map<GeoEngineType, GeoMonitoringEngineBreakdown>();
  let createdLogCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const deferredEnginesSeen = new Set<GeoEngineType>();
  const unavailablePhaseTwoEnginesSeen = new Set<GeoEngineType>();
  const engineCheckTimeoutMs = getGeoMonitoringEngineTimeoutMs();
  const engineCheckMaxRetries = getGeoMonitoringEngineMaxRetries();
  const engineCheckRetryBaseDelayMs =
    getGeoMonitoringEngineRetryBaseDelayMs();
  const engineCheckConcurrency = getGeoMonitoringConcurrency();
  const engineCheckPerEngineConcurrency =
    getGeoMonitoringPerEngineConcurrency();

  const executeEngineCheck = input.executeEngineCheck ?? executeDefaultEngineCheck;
  const runtimeCapabilities = await resolveGeoMonitoringRuntimeCapabilities();

  const machineReadabilityAssessment = await assessMachineReadability(
    fetchImpl,
    baseUrl,
  );
  const machineReadabilityStatus = await updateGeoMachineReadabilityStatus({
    llmsTxtStatus: machineReadabilityAssessment.llmsTxtStatus,
    llmsFullTxtStatus: machineReadabilityAssessment.llmsFullTxtStatus,
    ssrStatus: machineReadabilityAssessment.ssrStatus,
    jsonLdStatus: machineReadabilityAssessment.jsonLdStatus,
    notes: machineReadabilityAssessment.notes,
    lastCheckedAt: startedAt,
  });
  const sourcePackAudit = auditGeoContent({
    title: "Daily Sparks machine-readable GEO source pack",
    headings: "## llms.txt\n## llms-full.txt\n## Homepage SSR",
    body: machineReadabilityAssessment.auditSourceText,
    referenceNotes:
      "Source: live Daily Sparks llms.txt, llms-full.txt, and homepage SSR snapshot.",
  });
  const monitoringTasks: GeoMonitoringTask[] = [];

  for (const { prompt, queryVariant } of allExpandedQueries) {
    const phaseEnabledEngines = getPhaseEnabledGeoMonitoringEngines(prompt);
    const enabledEngines = phaseEnabledEngines.filter((engine) =>
      runtimeCapabilities.activeEngines.has(engine),
    );
    const unavailablePhaseTwoEngines = phaseEnabledEngines.filter(
      (engine) => !runtimeCapabilities.activeEngines.has(engine),
    );
    const deferredEngines = getDeferredGeoMonitoringEngines(prompt);

    for (const deferredEngine of deferredEngines) {
      deferredEnginesSeen.add(deferredEngine);
    }

    for (const unavailableEngine of unavailablePhaseTwoEngines) {
      unavailablePhaseTwoEnginesSeen.add(unavailableEngine);
    }

    for (const engine of enabledEngines) {
      const currentBreakdown = engineBreakdownMap.get(engine) ?? {
        engine,
        attemptedCount: 0,
        createdLogCount: 0,
        skippedCount: 0,
        failedCount: 0,
      };
      currentBreakdown.attemptedCount += 1;
      engineBreakdownMap.set(engine, currentBreakdown);
      monitoringTasks.push({
        prompt,
        queryVariant,
        engine,
        runtimeConnection:
          runtimeCapabilities.runtimeConnectionByEngine.get(engine) ?? null,
      });
    }
  }

  const engineResults = await mapGeoMonitoringTasksWithConcurrency<
    GeoMonitoringTaskResult
  >(
    monitoringTasks,
    engineCheckConcurrency,
    engineCheckPerEngineConcurrency,
    async (task) => {
      const engineCheckStartedAt = Date.now();
      const { result, attemptCount } = await executeEngineCheckWithRetryPolicy({
        executeEngineCheck,
        timeoutMs: engineCheckTimeoutMs,
        maxRetries: engineCheckMaxRetries,
        retryBaseDelayMs: engineCheckRetryBaseDelayMs,
        input: {
          engine: task.engine,
          prompt: task.prompt,
          queryVariant: task.queryVariant,
          baseUrl,
          fetchImpl,
          runtimeConnection: task.runtimeConnection,
        },
      });

      return {
        task,
        result,
        durationMs: Date.now() - engineCheckStartedAt,
        attemptCount,
      };
    },
  );

  for (const { task, result, durationMs, attemptCount } of engineResults) {
    const { prompt, queryVariant, engine } = task;
    const currentBreakdown = engineBreakdownMap.get(engine) ?? {
      engine,
      attemptedCount: 0,
      createdLogCount: 0,
      skippedCount: 0,
      failedCount: 0,
    };

    if (result.outcome === "success") {
      const intentBucket = inferGeoPromptIntentBucketFromPrompt(
        prompt,
        queryVariant,
      );
      const responseSignals = analyzeGeoResponse(
        result.responseText,
        result.citationUrls,
        baseUrl,
      );
      const mentionStatus = inferMentionStatus(responseSignals, intentBucket);
      const createdLog = await createGeoVisibilityLog({
        source: mapRunSourceToLogSource(input.source),
        monitoringRunId: runId,
        promptId: prompt.id,
        promptTextSnapshot: prompt.prompt,
        queryVariant,
        engine,
        engineModel: result.engineModel,
        mentionStatus,
        citationUrls: result.citationUrls,
        shareOfModelScore: inferShareOfModelScore(
          mentionStatus,
          responseSignals,
          intentBucket,
        ),
        citationShareScore: inferCitationShareScore(result.citationUrls, baseUrl),
        sentiment: inferSentiment(
          mentionStatus,
          responseSignals,
          intentBucket,
        ),
        entityAccuracy: inferEntityAccuracy(mentionStatus),
        responseExcerpt: result.responseText,
        notes: `Automated GEO monitoring run for ${prompt.intentLabel} (${intentBucket} intent).`,
      });

      createdLogs.push(createdLog);
      createdLogCount += 1;
      currentBreakdown.createdLogCount += 1;
      queryDiagnostics.push({
        promptId: prompt.id,
        promptIntentLabel: prompt.intentLabel,
        queryVariant,
        engine,
        outcome: "success",
        mentionStatus,
        sentiment: createdLog.sentiment,
        citationUrlCount: result.citationUrls.length,
        durationMs,
        reason:
          attemptCount > 1
            ? `Created visibility log after ${attemptCount - 1} retry${
                attemptCount === 2 ? "" : "ies"
              }.`
            : "Created visibility log.",
        logId: createdLog.id,
      });
    } else if (result.outcome === "skipped") {
      skippedCount += 1;
      currentBreakdown.skippedCount += 1;
      notes.push(`${engine} · ${queryVariant}: ${result.reason}`);
      queryDiagnostics.push({
        promptId: prompt.id,
        promptIntentLabel: prompt.intentLabel,
        queryVariant,
        engine,
        outcome: "skipped",
        mentionStatus: null,
        sentiment: null,
        citationUrlCount: 0,
        durationMs,
        reason: result.reason,
        logId: null,
      });
    } else {
      failedCount += 1;
      currentBreakdown.failedCount += 1;
      const finalFailureReason =
        attemptCount > 1
          ? `${result.reason} Retried ${attemptCount - 1} time${
              attemptCount === 2 ? "" : "s"
            }.`
          : result.reason;
      notes.push(`${engine} · ${queryVariant}: ${finalFailureReason}`);
      queryDiagnostics.push({
        promptId: prompt.id,
        promptIntentLabel: prompt.intentLabel,
        queryVariant,
        engine,
        outcome: "failed",
        mentionStatus: null,
        sentiment: null,
        citationUrlCount: 0,
        durationMs,
        reason: finalFailureReason,
        logId: null,
      });
    }

    engineBreakdownMap.set(engine, currentBreakdown);
  }

  const machineReadabilityReadyCount = countReadyChecks(machineReadabilityStatus);
  const status: GeoMonitoringRunRecord["status"] =
    failedCount > 0 && createdLogCount === 0
      ? "failed"
      : failedCount > 0 || skippedCount > 0
        ? "partial"
        : "completed";

  if (prompts.length === 0) {
    notes.push("No active GEO prompts were configured for this run.");
  }

  const activeEnginesSeen = new Set(
    monitoringTasks.map((task) => task.engine),
  );

  if (
    activeEnginesSeen.size > 0 ||
    unavailablePhaseTwoEnginesSeen.size > 0 ||
    deferredEnginesSeen.size > 0
  ) {
    notes.push(
      buildGeoMonitoringPhaseNote({
        activeEngines: Array.from(activeEnginesSeen),
        unavailablePhaseTwoEngines: Array.from(unavailablePhaseTwoEnginesSeen),
        deferredEngines: Array.from(deferredEnginesSeen),
      }),
    );
  }

  if (unavailablePhaseTwoEnginesSeen.size > 0) {
    notes.push(
      Array.from(unavailablePhaseTwoEnginesSeen)
        .map(
          (engine) =>
            `${engine}: ${
              runtimeCapabilities.unavailableReasons.get(engine) ??
              "Monitoring engine is unavailable."
            }`,
        )
        .join(" | "),
    );
  }

  const nextRun: Parameters<typeof createGeoMonitoringRun>[0] = {
    id: runId,
    source: input.source,
    status,
    activePromptCount: prompts.length,
    expandedQueryCount: allExpandedQueries.length,
    engineAttemptCount: monitoringTasks.length,
    createdLogCount,
    skippedCount,
    failedCount,
    machineReadabilityReadyCount,
    rankabilityScore: sourcePackAudit.rankability.score,
    citationReadinessScore: sourcePackAudit.citationReadiness.score,
    biasResistanceScore: sourcePackAudit.biasResistance.score,
    notes: notes.join(" | "),
    startedAt,
    completedAt: new Date().toISOString(),
    engineBreakdown: buildEngineBreakdown(Array.from(engineBreakdownMap.values())),
    queryDiagnostics,
  };
  const run =
    persistMode === "update"
      ? await updateGeoMonitoringRun(runId, nextRun)
      : await createGeoMonitoringRun(nextRun);

  return {
    run,
    logs: createdLogs,
    machineReadabilityStatus,
  };
}
