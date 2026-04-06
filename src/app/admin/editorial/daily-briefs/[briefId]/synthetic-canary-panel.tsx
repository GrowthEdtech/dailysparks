"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { DailyBriefSyntheticCanaryState } from "../../../../../lib/daily-brief-history-schema";
import { formatDailyBriefRendererLabel } from "../renderer-options";

type SyntheticCanaryPanelProps = {
  briefId: string;
  syntheticCanary: DailyBriefSyntheticCanaryState | null;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Hong_Kong",
      }).format(date);
}

function getStatusLabel(status: DailyBriefSyntheticCanaryState["status"] | null) {
  if (status === "passed") {
    return "Passed";
  }

  if (status === "blocked") {
    return "Blocked by canary";
  }

  if (status === "released") {
    return "Released by ops";
  }

  return "Pending first canary";
}

function getStatusClasses(status: DailyBriefSyntheticCanaryState["status"] | null) {
  if (status === "passed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "blocked") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (status === "released") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

export default function SyntheticCanaryPanel({
  briefId,
  syntheticCanary,
}: SyntheticCanaryPanelProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [releaseReason, setReleaseReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function runAction(action: "release" | "rerun") {
    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch("/api/admin/daily-brief-synthetic-canary-action", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          briefId,
          action,
          releaseReason: action === "release" ? releaseReason : undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { message?: string; syntheticCanaryStatus?: string }
        | null;

      if (!response.ok) {
        setErrorMessage(
          body?.message ?? "The synthetic canary action could not be completed.",
        );
        return;
      }

      setStatusMessage(
        action === "release"
          ? "Synthetic canary gate released. The next production deliver run can proceed."
          : `Synthetic canary rerun completed with status: ${body?.syntheticCanaryStatus ?? "unknown"}.`,
      );
      if (action === "release") {
        setReleaseReason("");
      }
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The synthetic canary action could not be completed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Synthetic canary gate
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Every production wave now runs a real pre-delivery canary before the
            brief is released to live families.
          </p>
        </div>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusClasses(syntheticCanary?.status ?? null)}`}
        >
          {getStatusLabel(syntheticCanary?.status ?? null)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Canary recipients
          </p>
          <p className="mt-2 text-sm font-semibold text-[#0f172a]">
            {syntheticCanary?.targetParentEmails?.length
              ? syntheticCanary.targetParentEmails.join(", ")
              : "Not configured yet"}
          </p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Attempts
          </p>
          <p className="mt-2 text-sm font-semibold text-[#0f172a]">
            {syntheticCanary?.attemptCount ?? 0} attempts ·{" "}
            {syntheticCanary?.autoRetryCount ?? 0} auto-retries
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <p>
            <span className="font-semibold text-[#0f172a]">Last attempt:</span>{" "}
            {formatDateTime(syntheticCanary?.lastAttemptAt ?? null)}
          </p>
          <p>
            <span className="font-semibold text-[#0f172a]">Last passed:</span>{" "}
            {formatDateTime(syntheticCanary?.lastPassedAt ?? null)}
          </p>
          <p>
            <span className="font-semibold text-[#0f172a]">Blocked at:</span>{" "}
            {formatDateTime(syntheticCanary?.blockedAt ?? null)}
          </p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <p>
            <span className="font-semibold text-[#0f172a]">Released at:</span>{" "}
            {formatDateTime(syntheticCanary?.releasedAt ?? null)}
          </p>
          <p>
            <span className="font-semibold text-[#0f172a]">Released by:</span>{" "}
            {syntheticCanary?.releasedBy ?? "Not recorded"}
          </p>
          <p>
            <span className="font-semibold text-[#0f172a]">Render audit:</span>{" "}
            {syntheticCanary?.renderAudit
              ? `${formatDailyBriefRendererLabel(syntheticCanary.renderAudit.renderer)} · ${syntheticCanary.renderAudit.pageCount} page(s)`
              : "Not recorded"}
          </p>
        </div>
      </div>

      {syntheticCanary?.lastFailureReason ? (
        <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-800">
          <p className="font-semibold text-rose-900">Current block reason</p>
          <p className="mt-2">{syntheticCanary.lastFailureReason}</p>
        </div>
      ) : null}

      {syntheticCanary?.lastFailedTargets.length ? (
        <div className="mt-4 space-y-3">
          {syntheticCanary.lastFailedTargets.map((target) => (
            <article
              key={`${target.parentId}-${target.channel}`}
              className="rounded-[20px] border border-rose-200 bg-rose-50/70 p-4 text-sm leading-6 text-rose-800"
            >
              <p className="font-semibold text-rose-900">{target.parentEmail}</p>
              <p className="mt-1">
                {target.channel} · {target.errorMessage}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      {syntheticCanary?.releaseReason ? (
        <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Release note</p>
          <p className="mt-2">{syntheticCanary.releaseReason}</p>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Release note
          <textarea
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-slate-400"
            placeholder="Why are you releasing this blocked brief?"
            value={releaseReason}
            onChange={(event) => setReleaseReason(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => runAction("rerun")}
            disabled={isSubmitting}
          >
            Rerun canary
          </button>
          {syntheticCanary?.status === "blocked" ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => runAction("release")}
              disabled={isSubmitting}
            >
              Release blocked brief
            </button>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="mt-4 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
