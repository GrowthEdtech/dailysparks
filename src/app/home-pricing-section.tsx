"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { getBillingPlanDefinitions } from "../lib/billing";
import { trackMarketingEvent } from "../lib/marketing-analytics";
import type { PricingMarket } from "../lib/pricing-market";

type HomePricingSectionProps = {
  initialPricingMarket: PricingMarket;
};

export default function HomePricingSection({
  initialPricingMarket,
}: HomePricingSectionProps) {
  const billingPlans = getBillingPlanDefinitions(initialPricingMarket);

  return (
    <section className="bg-white text-[#0f172a] py-24 px-6 border-t border-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#fbbf24]">
            Subscription pricing
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold">
            Choose the rhythm that fits your family.
          </h2>
          <p className="text-slate-500 text-lg">
            Start with a 7-day trial, connect the delivery setup you want, and
            keep the routine only if it becomes useful in real family life.
          </p>
          <p className="text-sm text-slate-400">
            All subscriptions, checkout, and invoices are billed in USD.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 xl:gap-10 items-stretch pt-12">
          {billingPlans.map((plan) => {
            const isYearly = plan.id === "yearly";

            return (
              <div
                key={plan.id}
                className={
                  isYearly
                    ? "relative flex flex-col rounded-[32px] border-[3px] border-[#fbbf24] bg-gradient-to-br from-[#fffdf7] via-white to-[#fffef2] p-8 md:p-10 shadow-[0_30px_90px_-45px_rgba(251,191,36,0.55)] md:-translate-y-2 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_40px_100px_-40px_rgba(251,191,36,0.6)]"
                    : "flex flex-col rounded-[32px] border border-slate-200 bg-white p-8 md:p-10 shadow-[0_28px_80px_-45px_rgba(15,23,42,0.4)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_32px_90px_-50px_rgba(15,23,42,0.45)] hover:border-slate-300"
                }
              >
                {isYearly ? (
                  <div className="absolute -top-4 right-8 bg-[#fbbf24] text-[#0f172a] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_4px_15px_-4px_rgba(251,191,36,0.8)] animate-pulse">
                    Best Value
                  </div>
                ) : null}

                <p className="mb-5 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                  {plan.eyebrow}
                </p>

                <h3 className="text-[2rem] font-extrabold leading-tight text-[#0f172a]">
                  {plan.name}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-500">
                  {plan.description}
                </p>

                <div className="mt-8 mb-8 flex items-end gap-3 text-[#0f172a]">
                  <div className="text-5xl font-extrabold tracking-tight">
                    {plan.price}
                  </div>
                  <span className="pb-1 text-lg font-semibold text-slate-400">
                    {plan.cadence}
                  </span>
                </div>

                <ul className="mb-10 flex-1 space-y-4">
                  {plan.bullets.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-base leading-7 text-slate-600"
                    >
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#fbbf24]" />
                      <span className={isYearly ? "font-medium text-slate-700" : ""}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  onClick={() =>
                    trackMarketingEvent("pricing_cta_clicked", {
                      plan_id: plan.id,
                      billing_interval: isYearly ? "yearly" : "monthly",
                    })
                  }
                  className={
                    isYearly
                      ? "group flex w-full items-center justify-center gap-3 rounded-2xl bg-[#0f172a] px-6 py-4 text-center text-lg font-bold text-[#f8fafc] shadow-[0_20px_40px_-24px_rgba(15,23,42,0.55)] transition-all duration-300 hover:bg-slate-800 hover:shadow-[0_25px_50px_-12px_rgba(15,23,42,0.6)] active:scale-95"
                      : "group flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-center text-lg font-bold text-[#0f172a] shadow-sm transition-all duration-300 hover:bg-slate-100 hover:border-slate-300 active:scale-95"
                  }
                >
                  <span
                    className={
                      isYearly
                        ? "text-[#f8fafc] opacity-100 [text-shadow:0_1px_0_rgba(15,23,42,0.18)]"
                        : "text-[#0f172a] opacity-100"
                    }
                  >
                    {plan.cta}
                  </span>
                  <ArrowRight
                    className={
                      isYearly
                        ? "h-4 w-4 shrink-0 text-[#f8fafc] transition-transform group-hover:translate-x-0.5"
                        : "h-4 w-4 shrink-0 text-[#0f172a] transition-transform group-hover:translate-x-0.5"
                    }
                  />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
