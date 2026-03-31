"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, CreditCard } from "lucide-react";

import { BILLING_PLAN_DEFINITIONS, getBillingSummary } from "../../lib/billing";
import type { ParentProfile } from "../../lib/mvp-types";

type BillingFormProps = {
  initialProfile: ParentProfile;
};

type BillingRouteMessage = {
  message?: string;
  parent?: ParentProfile["parent"];
};

export default function BillingForm({ initialProfile }: BillingFormProps) {
  const router = useRouter();
  const [parent, setParent] = useState(initialProfile.parent);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingPlan, setPendingPlan] = useState<"monthly" | "yearly" | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const billingSummary = getBillingSummary(parent);

  async function handleSelectPlan(subscriptionPlan: "monthly" | "yearly") {
    setErrorMessage("");
    setSuccessMessage("");
    setPendingPlan(subscriptionPlan);

    try {
      const response = await fetch("/api/billing", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          subscriptionPlan,
        }),
      });

      const body = (await response.json().catch(() => null)) as BillingRouteMessage | null;

      if (!response.ok || !body?.parent) {
        setErrorMessage(body?.message ?? "We could not save your billing choice.");
        setPendingPlan(null);
        return;
      }

      setParent(body.parent);
      setSuccessMessage(
        `${subscriptionPlan === "yearly" ? "Yearly" : "Monthly"} billing has been selected.`,
      );
      setPendingPlan(null);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErrorMessage("We could not reach billing right now. Please try again.");
      setPendingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <header className="w-full rounded-b-[32px] bg-[#0f172a] px-6 py-6 text-white shadow-md">
        <div className="mx-auto flex w-full max-w-md items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#fbbf24]">
              Billing
            </p>
            <h1 className="mt-2 text-2xl font-bold">Choose your payment rhythm</h1>
            <p className="mt-1 text-sm text-slate-300">
              Save the monthly or yearly cadence you want Daily Sparks to use at checkout.
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
            Current billing
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
            {parent.subscriptionPlan ? (
              <span className="rounded-full bg-[#fff7dd] px-3 py-1 text-xs font-semibold text-[#b45309]">
                {parent.subscriptionPlan === "yearly" ? "Yearly selected" : "Monthly selected"}
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            We are saving your billing choice now. Live card checkout will connect next.
          </p>
        </section>

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
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={Boolean(pendingPlan) || isPending}
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-bold transition ${
                    isSelected
                      ? "bg-[#0f172a] text-white"
                      : "bg-[#fbbf24] text-[#0f172a] shadow-lg shadow-[#fbbf24]/20 hover:bg-[#f59e0b]"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isSaving ? "Saving..." : isSelected ? "Keep this plan" : plan.cta}
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

        {successMessage ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </main>
    </div>
  );
}
