"use client";

import { useMemo, useState, type FormEvent } from "react";

import {
  DAILY_BRIEF_RENDERER_OPTIONS,
  formatDailyBriefRendererLabel,
  type AdminDailyBriefRenderer,
} from "./renderer-options";

type TestRunResult = {
  success: boolean;
  runDate: string;
  targetParentEmails: string[];
  renderer?: AdminDailyBriefRenderer;
  failedStage?: string;
  stages?: Record<string, { status: number; body: unknown }>;
  message?: string;
};

function buildDefaultRunDate() {
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 1);

  return nextDay.toISOString().slice(0, 10);
}

const DEFAULT_TEST_RECIPIENT = "admin@geledtech.com";

function formatStageSummary(result: TestRunResult | null) {
  if (!result?.stages) {
    return "No test run has completed yet.";
  }

  return Object.entries(result.stages)
    .map(([stageName, stageResult]) => {
      const summary =
        typeof stageResult.body === "object" && stageResult.body !== null
          ? JSON.stringify(stageResult.body, null, 2)
          : String(stageResult.body);

      return `${stageName.toUpperCase()} (${stageResult.status})\n${summary}`;
    })
    .join("\n\n");
}

export default function ManualTestRunPanel() {
  const [runDate, setRunDate] = useState(buildDefaultRunDate);
  const [targetParentEmail, setTargetParentEmail] = useState(
    DEFAULT_TEST_RECIPIENT,
  );
  const [renderer, setRenderer] = useState<AdminDailyBriefRenderer>("pdf-lib");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<TestRunResult | null>(null);
  const stageSummary = useMemo(() => formatStageSummary(result), [result]);
  const summaryTargetRecipient =
    result?.targetParentEmails?.[0] ?? targetParentEmail;
  const summaryRenderer = formatDailyBriefRendererLabel(
    result?.renderer ?? renderer,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/daily-brief-test-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          runDate,
          parentEmail: targetParentEmail,
          renderer,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | TestRunResult
        | { message?: string }
        | null;

      if (!response.ok) {
        setResult(null);
        setErrorMessage(
          body && typeof body === "object" && "message" in body && body.message
            ? body.message
            : "The staged test run failed before completion.",
        );
        return;
      }

      setResult(body as TestRunResult);
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The staged test run could not be started.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b45309]">
            Manual canary test
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-[#0f172a]">
            Run the staged pipeline now and deliver only to your chosen test recipient.
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            This trigger runs ingest, generate, preflight, and deliver in order.
            It does not change the Cloud Scheduler and it keeps the dispatch
            locked to the one-off canary recipient for this manual run only.
            Use any existing family email as the one-off canary target.
          </p>
        </div>

        <form className="flex w-full max-w-sm flex-col gap-3" onSubmit={handleSubmit}>
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="manual-target-parent-email"
          >
            Test recipient
          </label>
          <input
            id="manual-target-parent-email"
            type="email"
            value={targetParentEmail}
            onChange={(event) => setTargetParentEmail(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400"
            placeholder={DEFAULT_TEST_RECIPIENT}
            autoComplete="email"
            required
          />
          <label className="text-sm font-medium text-slate-700" htmlFor="manual-run-date">
            Test run date
          </label>
          <input
            id="manual-run-date"
            type="date"
            value={runDate}
            onChange={(event) => setRunDate(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400"
          />
          <label className="text-sm font-medium text-slate-700" htmlFor="manual-renderer">
            Renderer
          </label>
          <select
            id="manual-renderer"
            value={renderer}
            onChange={(event) =>
              setRenderer(event.target.value as AdminDailyBriefRenderer)
            }
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-slate-400"
          >
            {DAILY_BRIEF_RENDERER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Running staged test..." : "Run staged test"}
          </button>
        </form>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-[#0f172a]">Latest test summary</p>
        <p className="mt-2 text-sm text-slate-500">
          Target recipient:{" "}
          <span className="font-semibold text-slate-700">
            {summaryTargetRecipient}
          </span>
        </p>
        {result ? (
          <p className="mt-1 text-sm text-slate-500">
            Last run date: <span className="font-semibold text-slate-700">{result.runDate}</span>
          </p>
        ) : null}
        <p className="mt-1 text-sm text-slate-500">
          Renderer:{" "}
          <span className="font-semibold text-slate-700">{summaryRenderer}</span>
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
          {stageSummary}
        </pre>
      </div>
    </div>
  );
}
