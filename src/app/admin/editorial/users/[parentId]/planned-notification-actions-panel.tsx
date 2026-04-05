"use client";

import { useState } from "react";

import type { PlannedNotificationFamily } from "../../../../../lib/planned-notification-state";

type PlannedNotificationActionsPanelProps = {
  parentEmail: string;
};

type PlannedNotificationActionResult = {
  success: boolean;
  parentEmail: string;
  notificationFamily: PlannedNotificationFamily;
  action: "resend" | "resolve";
  messageId?: string | null;
  reason?: string | null;
  message?: string;
};

const FAMILY_OPTIONS: Array<{
  value: PlannedNotificationFamily;
  label: string;
}> = [
  {
    value: "trial-ending-reminder",
    label: "Trial ending",
  },
  {
    value: "billing-status-update",
    label: "Billing status",
  },
  {
    value: "delivery-support-alert",
    label: "Delivery support",
  },
];

export default function PlannedNotificationActionsPanel({
  parentEmail,
}: PlannedNotificationActionsPanelProps) {
  const [notificationFamily, setNotificationFamily] =
    useState<PlannedNotificationFamily>("trial-ending-reminder");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<PlannedNotificationActionResult | null>(null);

  async function runAction(action: "resend" | "resolve") {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/planned-notification-action", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          parentEmail,
          notificationFamily,
          action,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | PlannedNotificationActionResult
        | { message?: string }
        | null;

      if (!response.ok) {
        setResult(null);
        setErrorMessage(
          body && typeof body === "object" && "message" in body && body.message
            ? body.message
            : "The notification action could not be completed.",
        );
        return;
      }

      setResult(body as PlannedNotificationActionResult);
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The notification action could not be started.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedFamilyLabel =
    FAMILY_OPTIONS.find((option) => option.value === (result?.notificationFamily ?? notificationFamily))
      ?.label ?? "Notification";

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b45309]">
          Manual resend / resolve
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-[#0f172a]">
          Trigger a current notification again or mark the current state resolved.
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Use resend when the parent still needs the current trial, billing, or
          delivery-support email. Use resolve when ops has already handled the
          current state outside of email and wants the queue to clear.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:max-w-md">
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="planned-notification-family"
        >
          Notification family
        </label>
        <select
          id="planned-notification-family"
          value={notificationFamily}
          onChange={(event) =>
            setNotificationFamily(event.target.value as PlannedNotificationFamily)
          }
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-slate-400"
        >
          {FAMILY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => runAction("resend")}
            className="inline-flex items-center justify-center rounded-full bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Working..." : "Send manual resend"}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => runAction("resolve")}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Working..." : "Mark current state resolved"}
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
          {result.action === "resolve" ? "Resolved" : "Processed resend for"}{" "}
          <span className="font-semibold">{selectedFamilyLabel}</span>
          {" "}on{" "}
          <span className="font-semibold">{result.parentEmail}</span>.
          {result.messageId ? ` Message id: ${result.messageId}.` : ""}
          {result.reason ? ` ${result.reason}` : ""}
        </div>
      ) : null}
    </section>
  );
}
