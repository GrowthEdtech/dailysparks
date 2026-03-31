"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import PricingMarketToggle from "../components/pricing-market-toggle";
import { getBillingPlanDefinitions } from "../lib/billing";
import type { PricingMarket } from "../lib/pricing-market";
import {
  getPricingMarketLabel,
  getPricingMarketSupportCopy,
} from "../lib/pricing-market";

type HomePricingSectionProps = {
  initialPricingMarket: PricingMarket;
};

async function savePricingMarket(pricingMarket: PricingMarket) {
  const response = await fetch("/api/pricing-market", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ pricingMarket }),
  });

  if (!response.ok) {
    throw new Error("We could not update your pricing market right now.");
  }
}

export default function HomePricingSection({
  initialPricingMarket,
}: HomePricingSectionProps) {
  const [pricingMarket, setPricingMarket] = useState(initialPricingMarket);
  const [pricingMessage, setPricingMessage] = useState("");
  const billingPlans = getBillingPlanDefinitions(pricingMarket);

  async function handleSelectMarket(nextPricingMarket: PricingMarket) {
    setPricingMessage("");

    try {
      await savePricingMarket(nextPricingMarket);
      setPricingMarket(nextPricingMarket);
    } catch {
      setPricingMessage("We could not switch pricing right now. Please try again.");
    }
  }

  return (
    <section className="bg-white text-[#0f172a] py-24 px-6 border-t border-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#fbbf24]">
            Subscription pricing
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold">
            Choose the Daily Sparks rhythm that fits your family.
          </h2>
          <p className="text-slate-500 text-lg">
            {getPricingMarketLabel(pricingMarket)} is shown below. You can switch currencies at
            any time before checkout.
          </p>
          <div className="flex justify-center pt-2">
            <PricingMarketToggle
              currentMarket={pricingMarket}
              onSelectMarket={handleSelectMarket}
            />
          </div>
          <p className="text-sm text-slate-500">{getPricingMarketSupportCopy(pricingMarket)}</p>
          {pricingMessage ? <p className="text-sm text-red-600">{pricingMessage}</p> : null}
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch pt-10">
          {billingPlans.map((plan) => {
            const isYearly = plan.id === "yearly";

            return (
              <div
                key={plan.id}
                className={
                  isYearly
                    ? "bg-gradient-to-br from-white to-slate-50 rounded-[32px] p-10 flex flex-col relative shadow-2xl shadow-[#fbbf24]/10 transform scale-105 border-4 border-[#fbbf24]"
                    : "bg-white/5 border border-white/10 rounded-[32px] p-10 flex flex-col hover:border-white/20 transition-all"
                }
              >
                {isYearly ? (
                  <div className="absolute -top-4 right-8 bg-[#fbbf24] text-[#0f172a] px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                    Most Popular
                  </div>
                ) : null}

                <h3 className={`text-xl font-bold mb-2 ${isYearly ? "text-[#0f172a]" : "text-white"}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-6 ${isYearly ? "text-gray-500" : "text-[#94a3b8]"}`}>
                  {plan.description}
                </p>
                <div className={`text-5xl font-extrabold mb-8 ${isYearly ? "text-[#0f172a]" : "text-white"}`}>
                  {plan.price}
                  <span className={`text-lg font-medium ml-2 ${isYearly ? "text-gray-400" : "text-[#64748b]"}`}>
                    {plan.cadence}
                  </span>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.bullets.map((item) => (
                    <li
                      key={item}
                      className={`flex items-center gap-3 text-sm ${isYearly ? "text-gray-700" : "text-[#cbd5e1]"}`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#fbbf24]" />
                      {isYearly ? <span className="font-medium">{item}</span> : item}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={
                    isYearly
                      ? "w-full py-4 rounded-xl bg-[#0f172a] text-white font-bold hover:bg-slate-800 transition-all shadow-xl shadow-black/20 text-center"
                      : "w-full py-4 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold transition-all text-center"
                  }
                >
                  {isYearly ? "Choose Yearly" : "Choose Monthly"}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
