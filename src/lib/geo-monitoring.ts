import { createGeoMonitoringRun } from "./geo-monitoring-run-store";
import type {
  GeoMonitoringEngineBreakdown,
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
  getEnabledGeoMonitoringEngines,
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
  signal?: AbortSignal;
};

export type RunGeoMonitoringInput = {
  source: GeoMonitoringRunSource;
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

function expandPromptQueries(prompt: GeoPromptRecord) {
  return Array.from(
    new Set([prompt.prompt, ...prompt.fanOutHints].map((item) => item.trim()).filter(Boolean)),
  );
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
      const connection = buildPerplexityConnection();

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
  const runId = crypto.randomUUID();
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
  const notes: string[] = [];
  const engineBreakdownMap = new Map<GeoEngineType, GeoMonitoringEngineBreakdown>();
  let createdLogCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const deferredEnginesSeen = new Set<GeoEngineType>();
  const engineCheckTimeoutMs = getGeoMonitoringEngineTimeoutMs();

  const executeEngineCheck = input.executeEngineCheck ?? executeDefaultEngineCheck;

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

  for (const { prompt, queryVariant } of allExpandedQueries) {
    const enabledEngines = getEnabledGeoMonitoringEngines(prompt);
    const deferredEngines = getDeferredGeoMonitoringEngines(prompt);

    for (const deferredEngine of deferredEngines) {
      deferredEnginesSeen.add(deferredEngine);
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

      const result = await executeEngineCheckWithDeadline({
        executeEngineCheck,
        timeoutMs: engineCheckTimeoutMs,
        input: {
          engine,
          prompt,
          queryVariant,
          baseUrl,
          fetchImpl,
        },
      });

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
      } else if (result.outcome === "skipped") {
        skippedCount += 1;
        currentBreakdown.skippedCount += 1;
        notes.push(`${engine} · ${queryVariant}: ${result.reason}`);
      } else {
        failedCount += 1;
        currentBreakdown.failedCount += 1;
        notes.push(`${engine} · ${queryVariant}: ${result.reason}`);
      }

      engineBreakdownMap.set(engine, currentBreakdown);
    }
  }

  const machineReadabilityReadyCount = countReadyChecks(machineReadabilityStatus);
  const status =
    failedCount > 0 && createdLogCount === 0
      ? "failed"
      : failedCount > 0 || skippedCount > 0
        ? "partial"
        : "completed";

  if (prompts.length === 0) {
    notes.push("No active GEO prompts were configured for this run.");
  }

  if (deferredEnginesSeen.size > 0) {
    notes.push(buildGeoMonitoringPhaseNote());
  }

  const run = await createGeoMonitoringRun({
    id: runId,
    source: input.source,
    status,
    activePromptCount: prompts.length,
    expandedQueryCount: allExpandedQueries.length,
    engineAttemptCount: allExpandedQueries.reduce(
      (total, item) => total + getEnabledGeoMonitoringEngines(item.prompt).length,
      0,
    ),
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
  });

  return {
    run,
    logs: createdLogs,
    machineReadabilityStatus,
  };
}
