"use client";

import { BarChart3, Clock3, FileSearch, Radar, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import type { GeoMachineReadabilityStatusRecord } from "../../../../lib/geo-machine-readability-schema";
import { GEO_READINESS_STATUSES } from "../../../../lib/geo-machine-readability-schema";
import type { GeoMonitoringRunRecord } from "../../../../lib/geo-monitoring-run-schema";
import {
  GEO_ENGINE_TYPES,
  GEO_PROMPT_PRIORITIES,
  type GeoEngineType,
  type GeoPromptRecord,
} from "../../../../lib/geo-prompt-schema";
import type { GeoVisibilityLogRecord } from "../../../../lib/geo-visibility-log-schema";
import {
  GEO_ENTITY_ACCURACY_LABELS,
  GEO_SENTIMENT_LABELS,
  GEO_VISIBILITY_MENTION_STATUSES,
} from "../../../../lib/geo-visibility-log-schema";
import type { Programme } from "../../../../lib/mvp-types";
import {
  buildGeoVisibilitySummary,
  formatPercent,
  formatTimestamp,
  type GeoVisibilitySummary,
} from "./geo-copilot-helpers";

type GeoCopilotPanelProps = {
  initialPrompts: GeoPromptRecord[];
  initialLogs: GeoVisibilityLogRecord[];
  initialRuns: GeoMonitoringRunRecord[];
  initialMachineReadabilityStatus: GeoMachineReadabilityStatusRecord;
  initialSummary: GeoVisibilitySummary;
};

type PromptFormState = {
  prompt: string;
  intentLabel: string;
  priority: (typeof GEO_PROMPT_PRIORITIES)[number];
  targetProgrammes: Programme[];
  engineCoverage: GeoEngineType[];
  fanOutHintsText: string;
  active: boolean;
  notes: string;
};

type VisibilityLogDraft = {
  promptId: string;
  promptTextSnapshot: string;
  engine: GeoEngineType;
  mentionStatus: (typeof GEO_VISIBILITY_MENTION_STATUSES)[number];
  citationUrlsText: string;
  shareOfModelScore: string;
  citationShareScore: string;
  sentiment: (typeof GEO_SENTIMENT_LABELS)[number];
  entityAccuracy: (typeof GEO_ENTITY_ACCURACY_LABELS)[number];
  responseExcerpt: string;
  notes: string;
};

type ContentAuditDraft = {
  title: string;
  headings: string;
  body: string;
  referenceNotes: string;
};

type ContentAuditResult = {
  score: number;
  summary: string;
  atomicAnswerCoverage: {
    coveredSections: number;
    totalSections: number;
    ratio: number;
  };
  csqaf: {
    citations: boolean;
    statistics: boolean;
    quotations: boolean;
    authoritativeness: boolean;
    fluency: boolean;
  };
  issues: string[];
  suggestions: string[];
};

const PROGRAMMES: Programme[] = ["PYP", "MYP", "DP"];

const DEFAULT_CREATE_PROMPT: PromptFormState = {
  prompt: "",
  intentLabel: "",
  priority: "medium",
  targetProgrammes: ["MYP"],
  engineCoverage: ["chatgpt-search", "gemini"],
  fanOutHintsText: "",
  active: true,
  notes: "",
};

const DEFAULT_VISIBILITY_LOG_DRAFT: VisibilityLogDraft = {
  promptId: "",
  promptTextSnapshot: "",
  engine: "chatgpt-search",
  mentionStatus: "mentioned",
  citationUrlsText: "",
  shareOfModelScore: "0.5",
  citationShareScore: "0.5",
  sentiment: "neutral",
  entityAccuracy: "mixed",
  responseExcerpt: "",
  notes: "",
};

const DEFAULT_AUDIT_DRAFT: ContentAuditDraft = {
  title: "",
  headings: "",
  body: "",
  referenceNotes: "",
};

function parseTextareaList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleValue<T extends string>(values: T[], targetValue: T) {
  return values.includes(targetValue)
    ? values.filter((value) => value !== targetValue)
    : [...values, targetValue];
}

function toPromptFormState(prompt: GeoPromptRecord): PromptFormState {
  return {
    prompt: prompt.prompt,
    intentLabel: prompt.intentLabel,
    priority: prompt.priority,
    targetProgrammes: prompt.targetProgrammes,
    engineCoverage: prompt.engineCoverage,
    fanOutHintsText: prompt.fanOutHints.join(", "),
    active: prompt.active,
    notes: prompt.notes,
  };
}

function buildPromptRequestBody(prompt: PromptFormState) {
  return {
    prompt: prompt.prompt,
    intentLabel: prompt.intentLabel,
    priority: prompt.priority,
    targetProgrammes: prompt.targetProgrammes,
    engineCoverage: prompt.engineCoverage,
    fanOutHints: parseTextareaList(prompt.fanOutHintsText),
    active: prompt.active,
    notes: prompt.notes,
  };
}

export default function GeoCopilotPanel({
  initialPrompts,
  initialLogs,
  initialRuns,
  initialMachineReadabilityStatus,
  initialSummary,
}: GeoCopilotPanelProps) {
  const [prompts, setPrompts] = useState(initialPrompts);
  const [logs, setLogs] = useState(initialLogs);
  const [runs, setRuns] = useState(initialRuns);
  const [machineReadabilityStatus, setMachineReadabilityStatus] = useState(
    initialMachineReadabilityStatus,
  );
  const [summary, setSummary] = useState(initialSummary);
  const [draftsById, setDraftsById] = useState<Record<string, PromptFormState>>(
    () =>
      Object.fromEntries(
        initialPrompts.map((prompt) => [prompt.id, toPromptFormState(prompt)]),
      ),
  );
  const [createDraft, setCreateDraft] =
    useState<PromptFormState>(DEFAULT_CREATE_PROMPT);
  const [visibilityLogDraft, setVisibilityLogDraft] = useState<VisibilityLogDraft>(
    DEFAULT_VISIBILITY_LOG_DRAFT,
  );
  const [auditDraft, setAuditDraft] =
    useState<ContentAuditDraft>(DEFAULT_AUDIT_DRAFT);
  const [auditResult, setAuditResult] = useState<ContentAuditResult | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [savingPromptId, setSavingPromptId] = useState("");
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [isCreatingLog, setIsCreatingLog] = useState(false);
  const [isSavingReadability, setIsSavingReadability] = useState(false);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [isRunningMonitoring, setIsRunningMonitoring] = useState(false);

  const recentLogs = useMemo(() => logs.slice(0, 8), [logs]);
  const recentRuns = useMemo(() => runs.slice(0, 4), [runs]);

  function refreshSummary(nextPrompts: GeoPromptRecord[], nextLogs: GeoVisibilityLogRecord[], nextStatus: GeoMachineReadabilityStatusRecord) {
    setSummary(
      buildGeoVisibilitySummary({
        prompts: nextPrompts,
        logs: nextLogs,
        machineReadabilityStatus: nextStatus,
      }),
    );
  }

  function updatePromptDraft(
    promptId: string,
    updater: (current: PromptFormState) => PromptFormState,
  ) {
    setDraftsById((currentDrafts) => ({
      ...currentDrafts,
      [promptId]: updater(
        currentDrafts[promptId] ??
          toPromptFormState(prompts.find((prompt) => prompt.id === promptId)!),
      ),
    }));
  }

  async function handleCreatePrompt() {
    setErrorMessage("");
    setMessage("");
    setIsCreatingPrompt(true);

    try {
      const response = await fetch("/api/admin/geo-prompts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(buildPromptRequestBody(createDraft)),
      });
      const body = (await response.json().catch(() => null)) as
        | { prompt?: GeoPromptRecord; message?: string }
        | null;

      if (!response.ok || !body?.prompt) {
        setErrorMessage(body?.message ?? "We could not create the GEO prompt.");
        setIsCreatingPrompt(false);
        return;
      }

      const nextPrompt = body.prompt;
      const nextPrompts = [nextPrompt, ...prompts];
      setPrompts(nextPrompts);
      setDraftsById((currentDrafts) => ({
        ...currentDrafts,
        [nextPrompt.id]: toPromptFormState(nextPrompt),
      }));
      setCreateDraft(DEFAULT_CREATE_PROMPT);
      refreshSummary(nextPrompts, logs, machineReadabilityStatus);
      setMessage("Golden prompt added.");
      setIsCreatingPrompt(false);
    } catch {
      setErrorMessage("We could not reach the GEO prompts API.");
      setIsCreatingPrompt(false);
    }
  }

  async function handleSavePrompt(promptId: string) {
    const promptDraft = draftsById[promptId];

    if (!promptDraft) {
      return;
    }

    setErrorMessage("");
    setMessage("");
    setSavingPromptId(promptId);

    try {
      const response = await fetch("/api/admin/geo-prompts", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: promptId,
          ...buildPromptRequestBody(promptDraft),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { prompt?: GeoPromptRecord; message?: string }
        | null;

      if (!response.ok || !body?.prompt) {
        setErrorMessage(body?.message ?? "We could not save this GEO prompt.");
        setSavingPromptId("");
        return;
      }

      const nextPrompt = body.prompt;
      const nextPrompts = prompts.map((prompt) =>
        prompt.id === promptId ? nextPrompt : prompt,
      );
      setPrompts(nextPrompts);
      setDraftsById((currentDrafts) => ({
        ...currentDrafts,
        [promptId]: toPromptFormState(nextPrompt),
      }));
      refreshSummary(nextPrompts, logs, machineReadabilityStatus);
      setMessage(`Saved ${nextPrompt.intentLabel}.`);
      setSavingPromptId("");
    } catch {
      setErrorMessage("We could not save this GEO prompt right now.");
      setSavingPromptId("");
    }
  }

  async function handleCreateVisibilityLog() {
    setErrorMessage("");
    setMessage("");
    setIsCreatingLog(true);

    try {
      const response = await fetch("/api/admin/geo-visibility-logs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...visibilityLogDraft,
          citationUrls: parseTextareaList(visibilityLogDraft.citationUrlsText),
          shareOfModelScore: Number(visibilityLogDraft.shareOfModelScore),
          citationShareScore: Number(visibilityLogDraft.citationShareScore),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { log?: GeoVisibilityLogRecord; message?: string }
        | null;

      if (!response.ok || !body?.log) {
        setErrorMessage(
          body?.message ?? "We could not create this visibility log entry.",
        );
        setIsCreatingLog(false);
        return;
      }

      const nextLog = body.log;
      const nextLogs = [nextLog, ...logs];
      setLogs(nextLogs);
      setVisibilityLogDraft(DEFAULT_VISIBILITY_LOG_DRAFT);
      refreshSummary(prompts, nextLogs, machineReadabilityStatus);
      setMessage("Visibility log recorded.");
      setIsCreatingLog(false);
    } catch {
      setErrorMessage("We could not reach the visibility logs API.");
      setIsCreatingLog(false);
    }
  }

  async function handleSaveMachineReadability() {
    setErrorMessage("");
    setMessage("");
    setIsSavingReadability(true);

    try {
      const response = await fetch("/api/admin/geo-machine-readability", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(machineReadabilityStatus),
      });
      const body = (await response.json().catch(() => null)) as
        | { status?: GeoMachineReadabilityStatusRecord }
        | null;

      if (!response.ok || !body?.status) {
        setErrorMessage("We could not save machine-readability status.");
        setIsSavingReadability(false);
        return;
      }

      const nextStatus = body.status;
      setMachineReadabilityStatus(nextStatus);
      refreshSummary(prompts, logs, nextStatus);
      setMessage("Machine-readability status updated.");
      setIsSavingReadability(false);
    } catch {
      setErrorMessage("We could not save machine-readability status right now.");
      setIsSavingReadability(false);
    }
  }

  async function handleRunAudit() {
    setErrorMessage("");
    setMessage("");
    setIsRunningAudit(true);

    try {
      const response = await fetch("/api/admin/geo-content-audit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(auditDraft),
      });
      const body = (await response.json().catch(() => null)) as
        | { result?: ContentAuditResult; message?: string }
        | null;

      if (!response.ok || !body?.result) {
        setErrorMessage(body?.message ?? "We could not audit this content.");
        setIsRunningAudit(false);
        return;
      }

      const nextResult = body.result;
      setAuditResult(nextResult);
      setMessage("Content audit complete.");
      setIsRunningAudit(false);
    } catch {
      setErrorMessage("We could not reach the GEO audit API.");
      setIsRunningAudit(false);
    }
  }

  async function handleRunMonitoringNow() {
    setErrorMessage("");
    setMessage("");
    setIsRunningMonitoring(true);

    try {
      const response = await fetch("/api/admin/geo-monitoring/run", {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | {
            run?: GeoMonitoringRunRecord;
            logs?: GeoVisibilityLogRecord[];
            machineReadabilityStatus?: GeoMachineReadabilityStatusRecord;
            message?: string;
          }
        | null;

      if (
        !response.ok ||
        !body?.run ||
        !body.machineReadabilityStatus ||
        !Array.isArray(body.logs)
      ) {
        setErrorMessage(body?.message ?? "We could not run GEO monitoring.");
        setIsRunningMonitoring(false);
        return;
      }

      const nextLogs = [
        ...body.logs,
        ...logs.filter(
          (existingLog) => !body.logs?.some((candidate) => candidate.id === existingLog.id),
        ),
      ];
      const nextRuns = [
        body.run,
        ...runs.filter((existingRun) => existingRun.id !== body.run?.id),
      ];

      setLogs(nextLogs);
      setRuns(nextRuns);
      setMachineReadabilityStatus(body.machineReadabilityStatus);
      refreshSummary(prompts, nextLogs, body.machineReadabilityStatus);
      setMessage(
        `Monitoring run complete: ${body.run.createdLogCount} automated logs created.`,
      );
      setIsRunningMonitoring(false);
    } catch {
      setErrorMessage("We could not reach the GEO monitoring API.");
      setIsRunningMonitoring(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
              GEO Copilot
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">
              Manage AI visibility, prompt coverage, content checks, and machine readability in one operator workspace.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              GEO Copilot now combines scheduled monitoring, machine-readability
              checks, Golden Prompt management, and GEO content audits in one
              editorial workspace. Manual log entry remains available for
              operator backfill and notes.
            </p>
          </div>

          <div className="grid gap-3 md:min-w-[280px]">
            <div className="rounded-[24px] border border-[#dbeafe] bg-[#eff6ff] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Share of Model
              </p>
              <p className="mt-2 text-2xl font-bold text-[#0f172a]">
                {formatPercent(summary.shareOfModelAverage)}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Last scan
              </p>
              <p className="mt-2 text-sm font-semibold text-[#0f172a]">
                {formatTimestamp(summary.lastScanAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Radar className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                Golden prompts
              </p>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#0f172a]">
              {summary.activePromptCount}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {summary.trackedPromptCount} tracked in total
            </p>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <BarChart3 className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                Citation share
              </p>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#0f172a]">
              {formatPercent(summary.citationShareAverage)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Positive sentiment {formatPercent(summary.positiveSentimentRate)}
            </p>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                Entity accuracy
              </p>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#0f172a]">
              {formatPercent(summary.entityAccuracyRate)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Based on stored visibility logs
            </p>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <FileSearch className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                Readiness checks
              </p>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#0f172a]">
              {summary.readinessReadyCount}/4
            </p>
            <p className="mt-1 text-sm text-slate-500">
              llms.txt, SSR, and JSON-LD coverage
            </p>
          </article>
        </div>

        {errorMessage ? (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {message ? (
          <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Monitoring automation
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Scheduled GEO monitoring now writes immutable run evidence, refreshes
              machine-readability checks, and auto-creates visibility logs when
              configured engines return usable results.
            </p>
          </div>

          <div className="rounded-[24px] border border-[#dbeafe] bg-[#eff6ff] px-4 py-4 md:min-w-[280px]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              Latest monitoring run
            </p>
            <p className="mt-2 text-sm font-semibold text-[#0f172a]">
              {recentRuns[0] ? formatTimestamp(recentRuns[0].completedAt) : "Not run yet"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {recentRuns[0]
                ? `${recentRuns[0].createdLogCount} logs · ${recentRuns[0].machineReadabilityReadyCount}/4 readiness checks ready`
                : "Run the monitor to generate the first automated GEO evidence."}
            </p>
            <button
              type="button"
              onClick={handleRunMonitoringNow}
              disabled={isRunningMonitoring}
              className="mt-4 rounded-full bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunningMonitoring ? "Running..." : "Run monitoring now"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {recentRuns.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No monitoring runs yet. Scheduled runs and admin-triggered runs will
              appear here as soon as the GEO monitor writes real evidence.
            </div>
          ) : (
            recentRuns.map((run) => (
              <article
                key={run.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {run.source}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {run.status}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatTimestamp(run.completedAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-[#0f172a]">
                  {run.createdLogCount} automated logs · {run.engineAttemptCount} engine checks ·{" "}
                  {run.machineReadabilityReadyCount}/4 readability checks ready
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {run.notes || "No extra monitoring notes were recorded for this run."}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-[#0f172a]">
          Golden prompts
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Manage the high-intent prompts that define your AI visibility baseline.
        </p>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-bold text-[#0f172a]">Add Golden Prompt</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Prompt</span>
              <textarea
                className="min-h-[88px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={createDraft.prompt}
                onChange={(event) =>
                  setCreateDraft((current) => ({
                    ...current,
                    prompt: event.target.value,
                  }))
                }
                placeholder="Best LED tech for commercial lighting"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Intent label
              </span>
              <input
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={createDraft.intentLabel}
                onChange={(event) =>
                  setCreateDraft((current) => ({
                    ...current,
                    intentLabel: event.target.value,
                  }))
                }
                placeholder="Commercial comparison"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Priority</span>
              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={createDraft.priority}
                onChange={(event) =>
                  setCreateDraft((current) => ({
                    ...current,
                    priority: event.target.value as (typeof GEO_PROMPT_PRIORITIES)[number],
                  }))
                }
              >
                {GEO_PROMPT_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="md:col-span-2">
              <legend className="text-sm font-semibold text-slate-700">
                Target programmes
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {PROGRAMMES.map((programme) => {
                  const active = createDraft.targetProgrammes.includes(programme);

                  return (
                    <button
                      key={programme}
                      type="button"
                      onClick={() =>
                        setCreateDraft((current) => ({
                          ...current,
                          targetProgrammes: toggleValue(
                            current.targetProgrammes,
                            programme,
                          ),
                        }))
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-[#0f172a] bg-[#0f172a] text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {programme}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="md:col-span-2">
              <legend className="text-sm font-semibold text-slate-700">
                Engine coverage
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {GEO_ENGINE_TYPES.map((engine) => {
                  const active = createDraft.engineCoverage.includes(engine);

                  return (
                    <button
                      key={engine}
                      type="button"
                      onClick={() =>
                        setCreateDraft((current) => ({
                          ...current,
                          engineCoverage: toggleValue(current.engineCoverage, engine),
                        }))
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-[#0f172a] bg-[#0f172a] text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {engine}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Fan-out hints
              </span>
              <textarea
                className="min-h-[72px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={createDraft.fanOutHintsText}
                onChange={(event) =>
                  setCreateDraft((current) => ({
                    ...current,
                    fanOutHintsText: event.target.value,
                  }))
                }
                placeholder="commercial LED buying guide, top Asian LED suppliers"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Notes</span>
              <textarea
                className="min-h-[72px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={createDraft.notes}
                onChange={(event) =>
                  setCreateDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Used to monitor overseas commercial discovery prompts."
              />
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={createDraft.active}
                onChange={(event) =>
                  setCreateDraft((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
              />
              Active prompt
            </label>

            <button
              type="button"
              onClick={handleCreatePrompt}
              disabled={isCreatingPrompt}
              className="rounded-full bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingPrompt ? "Saving..." : "Add Golden Prompt"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {prompts.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
              <h3 className="text-xl font-bold tracking-tight text-[#0f172a]">
                No Golden Prompts yet
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Add the first high-intent English prompt so the team can start
                building a GEO visibility baseline.
              </p>
            </div>
          ) : (
            prompts.map((prompt) => {
              const draft = draftsById[prompt.id] ?? toPromptFormState(prompt);

              return (
                <article
                  key={prompt.id}
                  className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {prompt.priority}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {prompt.active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <h3 className="mt-3 text-xl font-bold tracking-tight text-[#0f172a]">
                        {prompt.intentLabel}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {prompt.prompt}
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                      <p className="font-semibold text-[#0f172a]">Updated</p>
                      <p>{formatTimestamp(prompt.updatedAt)}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Prompt
                      </span>
                      <textarea
                        className="min-h-[72px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                        value={draft.prompt}
                        onChange={(event) =>
                          updatePromptDraft(prompt.id, (current) => ({
                            ...current,
                            prompt: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Intent label
                      </span>
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                        value={draft.intentLabel}
                        onChange={(event) =>
                          updatePromptDraft(prompt.id, (current) => ({
                            ...current,
                            intentLabel: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Priority
                      </span>
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                        value={draft.priority}
                        onChange={(event) =>
                          updatePromptDraft(prompt.id, (current) => ({
                            ...current,
                            priority: event.target.value as (typeof GEO_PROMPT_PRIORITIES)[number],
                          }))
                        }
                      >
                        {GEO_PROMPT_PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Fan-out hints
                      </span>
                      <textarea
                        className="min-h-[72px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                        value={draft.fanOutHintsText}
                        onChange={(event) =>
                          updatePromptDraft(prompt.id, (current) => ({
                            ...current,
                            fanOutHintsText: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Notes
                      </span>
                      <textarea
                        className="min-h-[72px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                        value={draft.notes}
                        onChange={(event) =>
                          updatePromptDraft(prompt.id, (current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={draft.active}
                        onChange={(event) =>
                          updatePromptDraft(prompt.id, (current) => ({
                            ...current,
                            active: event.target.checked,
                          }))
                        }
                      />
                      Active prompt
                    </label>

                    <button
                      type="button"
                      onClick={() => handleSavePrompt(prompt.id)}
                      disabled={savingPromptId === prompt.id}
                      className="rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingPromptId === prompt.id ? "Saving..." : "Save prompt"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold tracking-tight text-[#0f172a]">
            Visibility logs
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Review automatically ingested GEO evidence and add manual backfill
            entries when an operator needs to document an edge case.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Prompt</span>
              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={visibilityLogDraft.promptId}
                onChange={(event) => {
                  const nextPromptId = event.target.value;
                  const selectedPrompt = prompts.find(
                    (prompt) => prompt.id === nextPromptId,
                  );
                  setVisibilityLogDraft((current) => ({
                    ...current,
                    promptId: nextPromptId,
                    promptTextSnapshot: selectedPrompt?.prompt ?? "",
                  }));
                }}
              >
                <option value="">Select prompt</option>
                {prompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.intentLabel}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Engine</span>
              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={visibilityLogDraft.engine}
                onChange={(event) =>
                  setVisibilityLogDraft((current) => ({
                    ...current,
                    engine: event.target.value as GeoEngineType,
                  }))
                }
              >
                {GEO_ENGINE_TYPES.map((engine) => (
                  <option key={engine} value={engine}>
                    {engine}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Mention status
              </span>
              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={visibilityLogDraft.mentionStatus}
                onChange={(event) =>
                  setVisibilityLogDraft((current) => ({
                    ...current,
                    mentionStatus: event.target.value as (typeof GEO_VISIBILITY_MENTION_STATUSES)[number],
                  }))
                }
              >
                {GEO_VISIBILITY_MENTION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Sentiment
              </span>
              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={visibilityLogDraft.sentiment}
                onChange={(event) =>
                  setVisibilityLogDraft((current) => ({
                    ...current,
                    sentiment: event.target.value as (typeof GEO_SENTIMENT_LABELS)[number],
                  }))
                }
              >
                {GEO_SENTIMENT_LABELS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Share of Model
              </span>
              <input
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={visibilityLogDraft.shareOfModelScore}
                onChange={(event) =>
                  setVisibilityLogDraft((current) => ({
                    ...current,
                    shareOfModelScore: event.target.value,
                  }))
                }
                placeholder="0.6"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Citation share
              </span>
              <input
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={visibilityLogDraft.citationShareScore}
                onChange={(event) =>
                  setVisibilityLogDraft((current) => ({
                    ...current,
                    citationShareScore: event.target.value,
                  }))
                }
                placeholder="0.4"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Entity accuracy
              </span>
              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={visibilityLogDraft.entityAccuracy}
                onChange={(event) =>
                  setVisibilityLogDraft((current) => ({
                    ...current,
                    entityAccuracy: event.target.value as (typeof GEO_ENTITY_ACCURACY_LABELS)[number],
                  }))
                }
              >
                {GEO_ENTITY_ACCURACY_LABELS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Citation URLs
              </span>
              <textarea
                className="min-h-[72px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={visibilityLogDraft.citationUrlsText}
                onChange={(event) =>
                  setVisibilityLogDraft((current) => ({
                    ...current,
                    citationUrlsText: event.target.value,
                  }))
                }
                placeholder="https://dailysparks.geledtech.com/product-brief"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Response excerpt
              </span>
              <textarea
                className="min-h-[88px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                value={visibilityLogDraft.responseExcerpt}
                onChange={(event) =>
                  setVisibilityLogDraft((current) => ({
                    ...current,
                    responseExcerpt: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleCreateVisibilityLog}
              disabled={isCreatingLog}
              className="rounded-full bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingLog ? "Saving..." : "Record visibility log"}
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {recentLogs.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No visibility logs yet. Add the first AI-search result to start
                a GEO baseline.
              </div>
            ) : (
              recentLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {log.engine}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {log.mentionStatus}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {log.sentiment}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#0f172a]">
                    {log.promptTextSnapshot}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {log.responseExcerpt || "No excerpt captured."}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    Logged {formatTimestamp(log.createdAt)} · Citation share{" "}
                    {formatPercent(log.citationShareScore)}
                  </p>
                </article>
              ))
            )}
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Machine-readability layer
            </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Track the live readiness of llms.txt, SSR, and structured data, and
            override the snapshot manually when operations need to annotate an exception.
          </p>

            <div className="mt-5 grid gap-4">
              {(
                [
                  ["llmsTxtStatus", "/llms.txt"],
                  ["llmsFullTxtStatus", "/llms-full.txt"],
                  ["ssrStatus", "SSR readiness"],
                  ["jsonLdStatus", "JSON-LD coverage"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    {label}
                  </span>
                  <select
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={machineReadabilityStatus[field]}
                    onChange={(event) =>
                      setMachineReadabilityStatus((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                  >
                    {GEO_READINESS_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              ))}

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Last checked at
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                  value={machineReadabilityStatus.lastCheckedAt ?? ""}
                  onChange={(event) =>
                    setMachineReadabilityStatus((current) => ({
                      ...current,
                      lastCheckedAt: event.target.value || null,
                    }))
                  }
                  placeholder="2026-04-06T09:00:00.000Z"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Notes</span>
                <textarea
                  className="min-h-[88px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                  value={machineReadabilityStatus.notes}
                  onChange={(event) =>
                    setMachineReadabilityStatus((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveMachineReadability}
                disabled={isSavingReadability}
                className="rounded-full bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingReadability ? "Saving..." : "Save machine-readability"}
              </button>
            </div>
          </article>

          <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Content optimization copilot
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Check direct answers, CSQAF signals, and internal consistency
              cues before a page goes live.
            </p>

            <div className="mt-5 grid gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Title</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                  value={auditDraft.title}
                  onChange={(event) =>
                    setAuditDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Headings
                </span>
                <textarea
                  className="min-h-[72px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                  value={auditDraft.headings}
                  onChange={(event) =>
                    setAuditDraft((current) => ({
                      ...current,
                      headings: event.target.value,
                    }))
                  }
                  placeholder={"## What is it?\n## Why does it matter?"}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Draft body
                </span>
                <textarea
                  className="min-h-[160px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                  value={auditDraft.body}
                  onChange={(event) =>
                    setAuditDraft((current) => ({
                      ...current,
                      body: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Reference notes
                </span>
                <textarea
                  className="min-h-[88px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                  value={auditDraft.referenceNotes}
                  onChange={(event) =>
                    setAuditDraft((current) => ({
                      ...current,
                      referenceNotes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleRunAudit}
                disabled={isRunningAudit}
                className="rounded-full bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRunningAudit ? "Running..." : "Run GEO audit"}
              </button>
            </div>

            {auditResult ? (
              <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Audit score
                    </p>
                    <p className="mt-2 text-3xl font-bold text-[#0f172a]">
                      {formatPercent(auditResult.score)}
                    </p>
                  </div>
                  <p className="max-w-xl text-sm leading-6 text-slate-600">
                    {auditResult.summary}
                  </p>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-[#0f172a]">
                      Atomic answers
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {auditResult.atomicAnswerCoverage.coveredSections} of{" "}
                      {auditResult.atomicAnswerCoverage.totalSections} sections
                      begin with a 40-60 word answer.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-[#0f172a]">
                      CSQAF coverage
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      {Object.entries(auditResult.csqaf).map(([key, passed]) => (
                        <li key={key}>
                          {passed ? "Yes" : "No"} · {key}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-[#0f172a]">Issues</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                      {auditResult.issues.length === 0 ? (
                        <li>No critical issues detected.</li>
                      ) : (
                        auditResult.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))
                      )}
                    </ul>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-[#0f172a]">
                      Suggestions
                    </p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                      {auditResult.suggestions.length === 0 ? (
                        <li>No extra suggestions right now.</li>
                      ) : (
                        auditResult.suggestions.map((suggestion) => (
                          <li key={suggestion}>{suggestion}</li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </article>
        </div>
      </section>
    </div>
  );
}
