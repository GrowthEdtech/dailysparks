"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import Image from "next/image";

import type { PricingMarket } from "../../lib/pricing-market";
import { getBillingPlanDefinitions } from "../../lib/billing";
import { trackMarketingEvent } from "../../lib/marketing-analytics";

type PricingWizardProps = {
  pricingMarket: PricingMarket;
};

export default function PricingWizard({
  pricingMarket,
}: PricingWizardProps) {
  const [isRedirecting, setIsRedirecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track the arrival at the pricing page
  useEffect(() => {
    trackMarketingEvent("pricing_viewed", {
      location: "conversion_funnel",
    });
  }, []);
  
  const plans = getBillingPlanDefinitions(pricingMarket);

  async function handleSelectPlan(planId: string) {
    setIsRedirecting(planId);
    setError(null);
    
    trackMarketingEvent("pricing_wizard_selection_clicked", {
      plan_id: planId,
      billing_interval: planId === "yearly" ? "yearly" : "monthly",
    });

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionPlan: planId }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.message || "Failed to start checkout session.");
      }
    } catch (err) {
      console.error("Pricing wizard error:", err);
      setError("We could not open the secure checkout. Please try again.");
      setIsRedirecting(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#fbbf24]/30">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-[#fbbf24]/10 to-transparent blur-3xl opacity-60" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-gradient-to-tr from-[#00b5d6]/5 to-transparent blur-3xl opacity-40" />
      </div>

      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <header className="max-w-3xl mx-auto text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#fbbf24]/30 bg-[#fbbf24]/5 px-4 py-1.5 shadow-sm backdrop-blur-sm">
             <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#b45309]">Step 1: Choose Your Plan</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-[#0f172a] leading-[1.05]">
             Unlock your 7-day <span className="text-[#fbbf24] [text-shadow:0_1px_0_rgba(251,191,36,0.2)]">Free Trial</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed">
            Zero commitment for the first week. We only charge your card on day 7 if you love the workflow. Cancel anytime with one click.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-600 animate-in fade-in slide-in-from-top-2 duration-300">
              {error}
            </div>
          )}
        </header>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">
          {plans.map((plan) => {
            const isYearly = plan.id === "yearly";
            const loading = isRedirecting === plan.id;
            
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-[40px] p-8 md:p-10 transition-all duration-300 ${
                  isYearly
                    ? "border-[3px] border-[#fbbf24] bg-white shadow-[0_40px_100px_-40px_rgba(251,191,36,0.3)] md:-translate-y-4 md:scale-[1.03] z-10"
                    : "border-2 border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_30px_80px_-40px_rgba(15,23,42,0.15)] hover:border-slate-300"
                }`}
              >
                {isYearly && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#fbbf24] text-[#0f172a] px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-lg">
                    Best Value
                  </div>
                )}

                <div className="mb-8 items-start justify-between flex gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">{plan.eyebrow}</p>
                    <h3 className="text-3xl font-black text-slate-900">{plan.name}</h3>
                  </div>
                </div>

                <div className="mb-10 flex items-baseline gap-2">
                  <div className="text-5xl font-black text-slate-900 tracking-tighter">
                    {plan.price}
                  </div>
                  <div className="text-slate-400 font-bold text-lg">
                    {plan.cadence}
                  </div>
                </div>

                <ul className="space-y-5 mb-10 flex-1">
                  {plan.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-4">
                      <div className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${isYearly ? "bg-[#fbbf24]/20" : "bg-slate-100"}`}>
                        <CheckCircle2 className={`h-3 w-3 ${isYearly ? "text-[#b45309]" : "text-slate-500"}`} />
                      </div>
                      <span className="text-base font-semibold text-slate-600 leading-tight">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={!!isRedirecting}
                  className={`w-full group relative flex items-center justify-center gap-3 rounded-[24px] py-5 px-8 font-black text-lg transition-all duration-300 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${
                    isYearly
                      ? "bg-[#0f172a] text-white shadow-xl shadow-slate-900/20 hover:bg-slate-800"
                      : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <span>{isYearly ? "Start Yearly Trial" : "Start Monthly Trial"}</span>
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
                
                <p className="mt-5 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Secure Checkout by Stripe
                </p>
              </div>
            );
          })}
        </div>

        {/* trust signals */}
        <div className="mt-20 flex flex-wrap justify-center gap-10 opacity-70">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                 <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Bank-level Security</span>
           </div>
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Cancel with 1-click</span>
           </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-12 text-center border-t border-slate-200/60">
        <p className="text-sm font-medium text-slate-400">
          Daily Sparks &copy; 2026. Academic system for IB Families.
        </p>
      </footer>
    </div>
  );
}
