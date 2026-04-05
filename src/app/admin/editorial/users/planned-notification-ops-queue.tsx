"use client";

import { useEffect, useMemo, useState } from "react";

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

type FamilyFilter = "all" | PlannedNotificationOpsQueueItem["notificationFamily"];
type QueueFilter = "all" | PlannedNotificationOpsQueueItem["queueLabel"];
type AgingFilter = "all" | PlannedNotificationOpsQueueItem["agingLabel"];
type SortMode =
  | "oldest-unresolved-first"
  | "newest-first"
  | "highest-severity"
  | "parent-a-z";

function formatAge(ageHours: number) {
  if (ageHours >= 72) {
    const days = Math.floor(ageHours / 24);
    return `${days}d open`;
  }

  if (ageHours >= 24) {
    return `${ageHours}h open`;
  }

  return `${Math.max(ageHours, 0)}h open`;
}

export default function PlannedNotificationOpsQueue({
  items,
  summary,
}: PlannedNotificationOpsQueueProps) {
  const [familyFilter, setFamilyFilter] = useState<FamilyFilter>("all");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [agingFilter, setAgingFilter] = useState<AgingFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("oldest-unresolved-first");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<BatchActionResponse | null>(null);

  const filteredItems = useMemo(() => {
    const severityRank = {
      "Manual intervention required": 0,
      "Retry due": 1,
      "Cooling down": 2,
      Pending: 3,
      "Deduped unresolved": 4,
    } satisfies Record<PlannedNotificationOpsQueueItem["queueLabel"], number>;

    const nextItems = items
      .filter((item) =>
        familyFilter === "all" ? true : item.notificationFamily === familyFilter,
      )
      .filter((item) => (queueFilter === "all" ? true : item.queueLabel === queueFilter))
      .filter((item) => (agingFilter === "all" ? true : item.agingLabel === agingFilter));

    nextItems.sort((left, right) => {
      if (sortMode === "newest-first") {
        return (
          left.ageHours - right.ageHours ||
          severityRank[left.queueLabel] - severityRank[right.queueLabel] ||
          left.parentEmail.localeCompare(right.parentEmail)
        );
      }

      if (sortMode === "highest-severity") {
        return (
          severityRank[left.queueLabel] - severityRank[right.queueLabel] ||
          right.ageHours - left.ageHours ||
          left.parentEmail.localeCompare(right.parentEmail)
        );
      }

      if (sortMode === "parent-a-z") {
        return (
          left.parentName.localeCompare(right.parentName) ||
          severityRank[left.queueLabel] - severityRank[right.queueLabel]
        );
      }

      return (
        right.ageHours - left.ageHours ||
        severityRank[left.queueLabel] - severityRank[right.queueLabel] ||
        left.parentEmail.localeCompare(right.parentEmail)
      );
    });

    return nextItems;
  }, [agingFilter, familyFilter, items, queueFilter, sortMode]);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => filteredItems.some((item) => item.id === id)),
    );
  }, [filteredItems]);

  const selectedItems = useMemo(
    () => filteredItems.filter((item) => selectedIds.includes(item.id)),
    [filteredItems, selectedIds],
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
      current.length === filteredItems.length
        ? []
        : filteredItems.map((item) => item.id),
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

  const agingCards = [
    {
      label: "Under 24h",
      count: summary.under24hCount,
    },
    {
      label: "24-72h",
      count: summary.between24hAnd72hCount,
    },
    {
      label: "Older than 72h",
      count: summary.over72hCount,
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

      <div className="mt-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Age / SLA
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Work older unresolved items first. Anything older than 72 hours
              should be treated as a queue breach until ops clears it.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {agingCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-[#0f172a]">
                  {card.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No active notification queue items are waiting for ops right now.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid flex-1 gap-3 lg:grid-cols-4">
              <label className="text-sm text-slate-600">
                <span className="mb-2 block font-semibold text-[#0f172a]">
                  Notification type
                </span>
                <select
                  value={familyFilter}
                  onChange={(event) => setFamilyFilter(event.target.value as FamilyFilter)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <option value="all">All types</option>
                  <option value="trial-ending-reminder">Trial ending</option>
                  <option value="billing-status-update">Billing status</option>
                  <option value="delivery-support-alert">Delivery support</option>
                </select>
              </label>

              <label className="text-sm text-slate-600">
                <span className="mb-2 block font-semibold text-[#0f172a]">
                  Queue state
                </span>
                <select
                  value={queueFilter}
                  onChange={(event) => setQueueFilter(event.target.value as QueueFilter)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <option value="all">All states</option>
                  <option value="Manual intervention required">
                    Manual intervention required
                  </option>
                  <option value="Retry due">Retry due</option>
                  <option value="Cooling down">Cooling down</option>
                  <option value="Pending">Pending</option>
                  <option value="Deduped unresolved">Deduped unresolved</option>
                </select>
              </label>

              <label className="text-sm text-slate-600">
                <span className="mb-2 block font-semibold text-[#0f172a]">Age / SLA</span>
                <select
                  value={agingFilter}
                  onChange={(event) => setAgingFilter(event.target.value as AgingFilter)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <option value="all">All ages</option>
                  <option value="Older than 72h">Older than 72h</option>
                  <option value="24-72h">24-72h</option>
                  <option value="Under 24h">Under 24h</option>
                </select>
              </label>

              <label className="text-sm text-slate-600">
                <span className="mb-2 block font-semibold text-[#0f172a]">Sort by</span>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <option value="oldest-unresolved-first">Oldest unresolved first</option>
                  <option value="highest-severity">Highest severity first</option>
                  <option value="newest-first">Newest first</option>
                  <option value="parent-a-z">Parent A-Z</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={
                  selectedIds.length > 0 &&
                  filteredItems.length > 0 &&
                  selectedIds.length === filteredItems.length
                }
                onChange={toggleSelectAll}
              />
              Select all visible queue items
            </label>

            <div className="flex flex-col gap-2 text-sm text-slate-500 lg:text-right">
              <p>
                Showing{" "}
                <span className="font-semibold text-[#0f172a]">
                  {filteredItems.length}
                </span>{" "}
                of {items.length}
              </p>
              <p>
                Selected{" "}
                <span className="font-semibold text-[#0f172a]">
                  {selectedItems.length}
                </span>
              </p>
            </div>

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
            {filteredItems.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                No queue items match the current notification, state, and SLA filters.
              </div>
            ) : null}

            {filteredItems.map((item) => (
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
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {item.agingLabel}
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

                  <dl className="grid gap-2 text-right text-sm text-slate-500 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-[#0f172a]">Age open</dt>
                      <dd>{formatAge(item.ageHours)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#0f172a]">Open since</dt>
                      <dd>{item.ageStartedAt ?? "Unknown"}</dd>
                    </div>
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
