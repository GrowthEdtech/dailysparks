"use client";

import { useMemo, useState } from "react";

import type {
  PlannedNotificationOpsQueueItem,
  PlannedNotificationOpsQueueSummary,
} from "../../../../lib/planned-notification-ops";

type PlannedNotificationOpsQueueProps = {
  items: PlannedNotificationOpsQueueItem[];
  summary: PlannedNotificationOpsQueueSummary;
};

type BatchActionResponse = {
  success: boolean;
  action: "resend" | "resolve";
  successCount: number;
  failureCount: number;
  failures: Array<{
    parentEmail: string;
    message: string;
  }>;
  message?: string;
};

export default function PlannedNotificationOpsQueue({
  items,
  summary,
}: PlannedNotificationOpsQueueProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<BatchActionResponse | null>(null);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds],
  );

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id],
    );
  }

  function toggleSelectAll() {
    setSelectedIds((current) =>
      current.length === items.length ? [] : items.map((item) => item.id),
    );
  }

  async function runBatchAction(action: "resend" | "resolve") {
    if (selectedItems.length === 0) {
      setErrorMessage("Choose at least one queue item first.");
      setResult(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/planned-notification-batch-action", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action,
          items: selectedItems.map((item) => ({
            parentEmail: item.parentEmail,
            notificationFamily: item.notificationFamily,
          })),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | BatchActionResponse
        | { message?: string }
        | null;

      if (!response.ok) {
        setResult(null);
        setErrorMessage(
          body && typeof body === "object" && "message" in body && body.message
            ? body.message
            : "The batch notification action could not be completed.",
        );
        return;
      }

      setResult(body as BatchActionResponse);
      setSelectedIds([]);
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The batch notification action could not be started.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const queueCards = [
    {
      label: "Pending",
      count: summary.pendingCount,
    },
    {
      label: "Retry due",
      count: summary.retryDueCount,
    },
    {
      label: "Cooling down",
      count: summary.coolingDownCount,
    },
    {
      label: "Manual intervention required",
      count: summary.escalatedCount,
    },
    {
      label: "Deduped unresolved",
      count: summary.dedupedCount,
    },
  ];

  return (
    <section className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Notification ops queue
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Work the current notification backlog from one place. Automatic
            sends respect retry cooldown and escalation rules; manual batch
            actions can still override when ops needs to intervene.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-[#0f172a]">{summary.totalCount}</span>{" "}
          queue item{summary.totalCount === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        {queueCards.map((card) => (
          <div
            key={card.label}
            className="rounded-[24px] border border-slate-200 bg-white px-4 py-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
              {card.count}
            </p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No active notification queue items are waiting for ops right now.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={selectedIds.length > 0 && selectedIds.length === items.length}
                onChange={toggleSelectAll}
              />
              Select all queue items
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={isSubmitting || selectedItems.length === 0}
                onClick={() => runBatchAction("resend")}
                className="inline-flex items-center justify-center rounded-full bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Working..." : "Send batch resend"}
              </button>
              <button
                type="button"
                disabled={isSubmitting || selectedItems.length === 0}
                onClick={() => runBatchAction("resolve")}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Working..." : "Mark batch resolved"}
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {result ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {result.action === "resolve" ? "Resolved" : "Resent"}{" "}
              <span className="font-semibold">{result.successCount}</span> item
              {result.successCount === 1 ? "" : "s"}.
              {result.failureCount > 0
                ? ` ${result.failureCount} item${result.failureCount === 1 ? "" : "s"} still need attention.`
                : ""}
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-slate-200 bg-white px-4 py-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {item.notificationLabel}
                        </span>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                          {item.queueLabel}
                        </span>
                      </div>
                      <p className="mt-3 text-base font-semibold text-[#0f172a]">
                        {item.parentName} · {item.parentEmail}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.studentName} · {item.programmeLabel}
                      </p>
                      <p className="mt-3 text-sm text-slate-600">{item.detail}</p>
                    </div>
                  </div>

                  <dl className="grid gap-2 text-right text-sm text-slate-500">
                    <div>
                      <dt className="font-semibold text-[#0f172a]">Failures</dt>
                      <dd>{item.failureCount}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#0f172a]">Last failure</dt>
                      <dd>{item.lastFailureAt ?? "None"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#0f172a]">Retry after</dt>
                      <dd>{item.retryAvailableAt ?? "Ready now"}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
