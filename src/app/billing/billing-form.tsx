"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, CreditCard } from "lucide-react";

import {
  BILLING_PLAN_DEFINITIONS,
  getBillingSummary,
  getLatestInvoiceSummary,
  getSubscriptionPlanBadgeLabel,
} from "../../lib/billing";
import type { ParentProfile } from "../../lib/mvp-types";
import {
  BACK_TO_DASHBOARD_CTA_CLASSNAME,
  BACK_TO_DASHBOARD_CTA_STYLE,
  DOWNLOAD_PDF_CTA_CLASSNAME,
  DOWNLOAD_PDF_CTA_STYLE,
} from "./billing-form.styles";

type BillingFormProps = {
  initialProfile: ParentProfile;
};

type BillingRouteMessage = {
  message?: string;
  url?: string;
  parent?: ParentProfile["parent"];
};

export default function BillingForm({ initialProfile }: BillingFormProps) {
  const searchParams = useSearchParams();
  const [parent] = useState(initialProfile.parent);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingPlan, setPendingPlan] = useState<"monthly" | "yearly" | null>(
    null,
  );

  const billingSummary = getBillingSummary(parent);
  const latestInvoiceSummary = getLatestInvoiceSummary(parent);
  const subscriptionPlanBadgeLabel = getSubscriptionPlanBadgeLabel(parent);
  const isStripeSandbox =
    (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").startsWith("pk_test_");
  const hasActiveStripeSubscription =
    parent.subscriptionStatus === "active" && Boolean(parent.stripeCustomerId);
  const canceledCheckout = searchParams.get("canceled") === "1";

  async function handleSelectPlan(subscriptionPlan: "monthly" | "yearly") {
    setErrorMessage("");
    setPendingPlan(subscriptionPlan);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          subscriptionPlan,
        }),
      });

      const body = (await response.json().catch(() => null)) as BillingRouteMessage | null;

      if (!response.ok || !body?.url) {
        setErrorMessage(body?.message ?? "We could not open Stripe checkout.");
        setPendingPlan(null);
        return;
      }

      window.location.assign(body.url);
    } catch {
      setErrorMessage("We could not reach Stripe checkout right now. Please try again.");
      setPendingPlan(null);
    }
  }

  async function handleOpenPortal() {
    setErrorMessage("");

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });

      const body = (await response.json().catch(() => null)) as BillingRouteMessage | null;

      if (!response.ok || !body?.url) {
        setErrorMessage(body?.message ?? "We could not open the Stripe billing portal.");
        return;
      }

      window.location.assign(body.url);
    } catch {
      setErrorMessage("We could not reach the Stripe billing portal right now.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <header className="w-full rounded-b-[32px] bg-[#0f172a] px-6 py-6 text-white shadow-md">
        <div className="mx-auto flex w-full max-w-md items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#fbbf24]">
              Subscription
            </p>
            <h1 className="mt-2 text-2xl font-bold">Choose your payment rhythm</h1>
            <p className="mt-1 text-sm text-slate-300">
              Choose the Daily Sparks subscription you want Stripe to activate for your family.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fbbf24] text-[#0f172a]">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 flex w-full max-w-md flex-col gap-6 px-4">
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Current subscription
          </p>
          <h2 className="mt-2 text-xl font-bold text-[#0f172a]">
            {billingSummary.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {billingSummary.subtitle}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-slate-600">
              {billingSummary.statusLabel}
            </span>
            {subscriptionPlanBadgeLabel ? (
              <span className="rounded-full bg-[#fff7dd] px-3 py-1 text-xs font-semibold text-[#b45309]">
                {subscriptionPlanBadgeLabel}
              </span>
            ) : null}
            {isStripeSandbox ? (
              <span className="rounded-full bg-[#fff7dd] px-3 py-1 text-xs font-semibold text-[#b45309]">
                Stripe sandbox
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            {hasActiveStripeSubscription
              ? "Your Stripe subscription is active. Use the portal below to change or cancel it."
              : "Stripe handles the hosted checkout and card collection. Daily Sparks only stores the resulting subscription state."}
          </p>
          {!hasActiveStripeSubscription ? (
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Trial timing starts on first sign-in, not when you connect Goodnotes or
              Notion.
            </p>
          ) : null}
          {billingSummary.summaryRows.length > 0 ? (
            <dl className="mt-4 grid gap-2 rounded-2xl bg-slate-50 px-4 py-3">
              {billingSummary.summaryRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <dt className="text-slate-500">{row.label}</dt>
                  <dd className="text-right font-semibold text-[#0f172a]">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {hasActiveStripeSubscription ? (
            <button
              type="button"
              onClick={handleOpenPortal}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[#0f172a] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#1e293b]"
            >
              Open Stripe billing portal
            </button>
          ) : null}
        </section>

        {hasActiveStripeSubscription || latestInvoiceSummary ? (
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Invoice delivery
            </p>
            <h2 className="mt-2 text-xl font-bold text-[#0f172a]">
              {latestInvoiceSummary?.title ?? "Stripe invoice email"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {latestInvoiceSummary?.subtitle ??
                `Stripe will send each paid invoice to ${parent.email} after payment is confirmed.`}
            </p>

            {latestInvoiceSummary ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#fff7dd] px-3 py-1 text-xs font-semibold text-[#b45309]">
                    {latestInvoiceSummary.statusLabel}
                  </span>
                </div>

                <dl className="mt-4 grid gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                  {latestInvoiceSummary.rows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <dt className="text-slate-500">{row.label}</dt>
                      <dd className="text-right font-semibold text-[#0f172a]">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-5 flex flex-col gap-3">
                  {latestInvoiceSummary.hostedInvoiceUrl ? (
                    <a
                      href={latestInvoiceSummary.hostedInvoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0f172a] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#1e293b]"
                    >
                      View invoice
                    </a>
                  ) : null}
                  {latestInvoiceSummary.invoicePdfUrl ? (
                    <a
                      href={latestInvoiceSummary.invoicePdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={DOWNLOAD_PDF_CTA_CLASSNAME}
                      style={DOWNLOAD_PDF_CTA_STYLE}
                    >
                      Download PDF
                    </a>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
                The first paid invoice will appear here once Stripe finishes the charge cycle.
              </p>
            )}
          </section>
        ) : null}

        {canceledCheckout ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Stripe checkout was canceled. Your Daily Sparks subscription was not changed.
          </p>
        ) : null}

        <div className="space-y-4">
          {BILLING_PLAN_DEFINITIONS.map((plan) => {
            const isSelected = parent.subscriptionPlan === plan.id;
            const isSaving = pendingPlan === plan.id;

            return (
              <section
                key={plan.id}
                className={`rounded-3xl border p-6 shadow-sm transition ${
                  isSelected
                    ? "border-[#fbbf24] bg-[#fffaf0] shadow-[#fbbf24]/10"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {plan.eyebrow}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-[#0f172a]">
                      {plan.name}
                    </h3>
                  </div>
                  {isSelected ? (
                    <span className="rounded-full bg-[#0f172a] px-3 py-1 text-xs font-semibold text-white">
                      Selected
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 text-[#0f172a]">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="ml-2 text-sm font-medium text-slate-500">
                    {plan.cadence}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {plan.description}
                </p>

                <ul className="mt-5 space-y-3">
                  {plan.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#fbbf24]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => {
                    if (hasActiveStripeSubscription) {
                      void handleOpenPortal();
                      return;
                    }

                    void handleSelectPlan(plan.id);
                  }}
                  disabled={Boolean(pendingPlan)}
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-bold transition ${
                    hasActiveStripeSubscription
                      ? "bg-slate-100 text-slate-500 hover:bg-slate-100"
                      : isSelected
                      ? "bg-[#0f172a] text-white"
                      : "bg-[#fbbf24] text-[#0f172a] shadow-lg shadow-[#fbbf24]/20 hover:bg-[#f59e0b]"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isSaving
                    ? "Opening Stripe..."
                    : hasActiveStripeSubscription
                      ? "Manage in Stripe portal"
                      : isSelected
                        ? "Continue with selected plan"
                        : "Continue to Stripe"}
                </button>
              </section>
            );
          })}
        </div>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <Link
          href="/dashboard"
          className={BACK_TO_DASHBOARD_CTA_CLASSNAME}
          style={BACK_TO_DASHBOARD_CTA_STYLE}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </main>
    </div>
  );
}
