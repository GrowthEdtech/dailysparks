"use client";

import { AlertTriangle, RefreshCcw, ShieldCheck, Siren, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

import type { OperationsHealthSnapshot } from "../../../../lib/operations-health";
import type { OperationsHealthRunRecord } from "../../../../lib/operations-health-run-schema";
import { buildOperationsHealthHandoffSummary } from "./operations-health-handoff";
import { OPERATIONS_HEALTH_READINESS_MODULES } from "./operations-health-readiness";

type OperationsHealthPanelProps = {
  initialSnapshot: OperationsHealthSnapshot;
  initialRuns: OperationsHealthRunRecord[];
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not recorded yet";
  }

  return new Intl.DateTimeFormat("en-HK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusBadgeClass(status: OperationsHealthRunRecord["status"]) {
  if (status === "healthy") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function getAlertChannelLabel(alert: OperationsHealthRunRecord["alerts"][number]) {
  const emailLabel = alert.emailUsed
    ? alert.emailDelivered
      ? `Ops email delivered${alert.emailRecipient ? ` to ${alert.emailRecipient}` : ""}`
      : `Ops email failed${alert.emailRecipient ? ` to ${alert.emailRecipient}` : ""}`
    : "Ops email not configured";
  const webhookLabel = alert.webhookUsed
    ? alert.webhookDelivered
      ? "Webhook delivered"
      : "Webhook failed"
    : "Webhook not configured";

  return { emailLabel, webhookLabel };
}

export default function OperationsHealthPanel({
  initialSnapshot,
  initialRuns,
}: OperationsHealthPanelProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [runs, setRuns] = useState(initialRuns);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const latestRun = runs[0] ?? null;
  const recentAlerts = useMemo(
    () => (latestRun?.alerts ?? []).slice(0, 5),
    [latestRun],
  );
  const recentActions = useMemo(
    () => (latestRun?.remediationActions ?? []).slice(0, 5),
    [latestRun],
  );
  const handoffSummary = useMemo(
    () =>
      buildOperationsHealthHandoffSummary({
        snapshot,
        latestRun,
      }),
    [latestRun, snapshot],
  );
  const [handoffMessage, setHandoffMessage] = useState("");
  const [handoffError, setHandoffError] = useState("");

  async function runHealthCheckNow() {
    setIsRunning(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/operations-health/run", {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | {
            message?: string;
            run?: OperationsHealthRunRecord;
            snapshot?: OperationsHealthSnapshot;
          }
        | null;

      if (!response.ok || !body?.run || !body.snapshot) {
        throw new Error(
          body?.message || "Operations health run could not be completed.",
        );
      }

      setRuns((currentRuns) => [body.run!, ...currentRuns].slice(0, 8));
      setSnapshot(body.snapshot);
      setMessage("Operations health run completed.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Operations health run failed.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  async function copyHandoffSummary() {
    setHandoffMessage("");
    setHandoffError("");

    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard copy is not available in this browser.");
      }

      await navigator.clipboard.writeText(handoffSummary);
      setHandoffMessage("Shift handoff summary copied.");
    } catch (error) {
      setHandoffError(
        error instanceof Error
          ? error.message
          : "Shift handoff summary could not be copied.",
      );
    }
  }

  function downloadHandoffSummary() {
    setHandoffMessage("");
    setHandoffError("");

    try {
      const blob = new Blob([handoffSummary], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `operations-health-handoff-${snapshot.runDate}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setHandoffMessage("Shift handoff summary downloaded.");
    } catch (error) {
      setHandoffError(
        error instanceof Error
          ? error.message
          : "Shift handoff summary could not be downloaded.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Reliability control plane
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
              Operations health
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Monitor today&apos;s Daily Brief production, notification backlog,
              GEO monitoring, and billing backstops in one place. This page also
              shows which self-healing actions the system just attempted.
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm xl:min-w-[20rem]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Current status
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(snapshot.status)}`}
                >
                  {snapshot.status}
                </span>
              </div>

              <button
                type="button"
                onClick={runHealthCheckNow}
                disabled={isRunning}
                className="inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" />
                {isRunning ? "Running..." : "Run health check now"}
              </button>
            </div>

            {message ? (
              <p className="mt-3 text-sm text-emerald-700">{message}</p>
            ) : null}
            {errorMessage ? (
              <p className="mt-3 text-sm text-rose-700">{errorMessage}</p>
            ) : null}
            <p className="mt-3 text-sm text-slate-500">
              Latest immutable run: {formatTimestamp(latestRun?.completedAt ?? null)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center gap-2 text-[#0f172a]">
            <ShieldCheck className="h-5 w-5" />
            <h3 className="font-semibold">Daily Brief</h3>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {snapshot.dailyBrief.generatedCount} / {snapshot.dailyBrief.expectedProductionCount} generated
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {snapshot.dailyBrief.retryCandidateCount} retry candidate
            {snapshot.dailyBrief.retryCandidateCount === 1 ? "" : "s"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {snapshot.dailyBrief.blockedCanaryCount} blocked by canary
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center gap-2 text-[#0f172a]">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Alerting / SLA policy</h3>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {snapshot.alerts.length} active alert
            {snapshot.alerts.length === 1 ? "" : "s"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {snapshot.notifications.over72hCount} notification SLA breach
            {snapshot.notifications.over72hCount === 1 ? "" : "es"}
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center gap-2 text-[#0f172a]">
            <Wrench className="h-5 w-5" />
            <h3 className="font-semibold">Auto-remediation workflows</h3>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {recentActions.length} recent action
            {recentActions.length === 1 ? "" : "s"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            GEO latest: {snapshot.geo.latestRunStatus ?? "not recorded"}
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center gap-2 text-[#0f172a]">
            <Siren className="h-5 w-5" />
            <h3 className="font-semibold">Billing / notifications</h3>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {snapshot.billing.actionableCount} billing item
            {snapshot.billing.actionableCount === 1 ? "" : "s"} active
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {snapshot.notifications.escalatedCount} escalated notification
            {snapshot.notifications.escalatedCount === 1 ? "" : "s"}
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Ops readiness
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#0f172a]">
            Stabilization checks, drills, and incident playbooks
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Keep the fast path for on-call response inside the same page as live
            health evidence. Use these cards to scan the morning checks, rehearse
            failure drills, and follow the smallest safe intervention during an
            incident.
          </p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {OPERATIONS_HEALTH_READINESS_MODULES.map((module) => (
            <article
              key={module.title}
              className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm"
            >
              <h4 className="text-lg font-semibold text-[#0f172a]">
                {module.title}
              </h4>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {module.summary}
              </p>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                {module.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                {module.evidence.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Canonical doc
                </p>
                <p className="mt-2 break-all text-xs text-slate-500">
                  {module.canonicalDocPath}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Recent alerts
          </p>
          <div className="mt-4 space-y-3">
            {recentAlerts.length === 0 ? (
              <p className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No active alerts in the latest operations-health run.
              </p>
            ) : (
              recentAlerts.map((alert, index) => (
                <article
                  key={`${alert.area}:${alert.title}:${index}`}
                  className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {alert.area}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                        alert.severity === "critical"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-semibold text-[#0f172a]">
                    {alert.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {alert.detail}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(() => {
                      const { emailLabel, webhookLabel } =
                        getAlertChannelLabel(alert);

                      return (
                        <>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-500">
                            {emailLabel}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-500">
                            {webhookLabel}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Auto-remediation workflows
          </p>
          <div className="mt-4 space-y-3">
            {recentActions.length === 0 ? (
              <p className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No remediation actions have been recorded yet.
              </p>
            ) : (
              recentActions.map((action, index) => (
                <article
                  key={`${action.action}:${action.startedAt}:${index}`}
                  className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {action.action}
                    </p>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {action.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {action.detail}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Shift handoff summary
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#0f172a]">
              Copy or download the latest ops memo for the next shift
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              This summary packages the current health state, top alerts,
              remediation evidence, and a recommended handoff note into a compact
              Markdown/TXT memo for fast operator handoff.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={copyHandoffSummary}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-50"
            >
              Copy Markdown
            </button>
            <button
              type="button"
              onClick={downloadHandoffSummary}
              className="inline-flex items-center justify-center rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Download TXT
            </button>
          </div>
        </div>

        {handoffMessage ? (
          <p className="mt-4 text-sm text-emerald-700">{handoffMessage}</p>
        ) : null}
        {handoffError ? (
          <p className="mt-4 text-sm text-rose-700">{handoffError}</p>
        ) : null}

        <pre className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600 whitespace-pre-wrap">
          {handoffSummary}
        </pre>
      </section>
    </div>
  );
}
