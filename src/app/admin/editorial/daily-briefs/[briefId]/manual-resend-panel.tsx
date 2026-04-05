"use client";

import { useState, type FormEvent } from "react";

import {
  DAILY_BRIEF_RENDERER_OPTIONS,
  formatDailyBriefRendererLabel,
  formatDailyBriefRendererModeLabel,
  type AdminDailyBriefRenderer,
} from "../renderer-options";

type ManualResendPanelProps = {
  briefId: string;
  defaultParentEmail: string;
};

type ManualResendResult = {
  success: boolean;
  parentEmail: string;
  rendererMode?: AdminDailyBriefRenderer;
  renderer?: string;
  rendererPolicyLabel?: string;
  message?: string;
  deliverySummary?: {
    deliveryAttemptCount: number;
    deliverySuccessCount: number;
    deliveryFailureCount: number;
  };
};

export default function ManualResendPanel({
  briefId,
  defaultParentEmail,
}: ManualResendPanelProps) {
  const [parentEmail, setParentEmail] = useState(defaultParentEmail);
  const [renderer, setRenderer] = useState<AdminDailyBriefRenderer>("auto");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<ManualResendResult | null>(null);
  const summaryRenderer = formatDailyBriefRendererLabel(
    result?.renderer ?? renderer,
  );
  const summaryRendererMode = formatDailyBriefRendererModeLabel(
    result?.rendererMode ?? renderer,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/daily-brief-resend", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          briefId,
          parentEmail,
          renderer,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | ManualResendResult
        | { message?: string }
        | null;

      if (!response.ok) {
        setResult(null);
        setErrorMessage(
          body && typeof body === "object" && "message" in body && body.message
            ? body.message
            : "The manual resend could not be completed.",
        );
        return;
      }

      setResult(body as ManualResendResult);
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The manual resend could not be started.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b45309]">
          Manual resend / backfill
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-[#0f172a]">
          Send this stored brief to one family without changing the scheduler.
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Use this when a family was intentionally skipped in canary mode or needs
          an operator-triggered resend after a delivery miss.
        </p>
      </div>

      <form className="mt-4 flex flex-col gap-3 md:max-w-md" onSubmit={handleSubmit}>
        <label className="text-sm font-medium text-slate-700" htmlFor="manual-resend-email">
          Parent email
        </label>
        <input
          id="manual-resend-email"
          type="email"
          value={parentEmail}
          onChange={(event) => setParentEmail(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-slate-400"
          placeholder="family@example.com"
        />
        <label className="text-sm font-medium text-slate-700" htmlFor="manual-resend-renderer">
          Renderer
        </label>
        <select
          id="manual-resend-renderer"
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
        <p className="text-xs leading-5 text-slate-500">
          Auto follows the Typst live policy for this brief. Choose manual Typst
          only if you want the resend audit to show an explicit operator override.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending manual resend..." : "Send manual resend"}
        </button>
      </form>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Manual resend processed for{" "}
          <span className="font-semibold">{result.parentEmail}</span>.
          {" "}Renderer mode:{" "}
          <span className="font-semibold">{summaryRendererMode}</span>.
          {" "}Resolved renderer:{" "}
          <span className="font-semibold">{summaryRenderer}</span>.
          {result.rendererPolicyLabel ? ` ${result.rendererPolicyLabel}` : ""}
          {result.deliverySummary ? (
            <>
              {" "}
              Attempts: {result.deliverySummary.deliveryAttemptCount}. Successes:{" "}
              {result.deliverySummary.deliverySuccessCount}. Failures:{" "}
              {result.deliverySummary.deliveryFailureCount}.
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
