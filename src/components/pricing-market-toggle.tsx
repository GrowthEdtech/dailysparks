"use client";

import { useState } from "react";

import type { PricingMarket } from "../lib/pricing-market";
import {
  getPricingMarketToggleCaption,
  getPricingMarketToggleTitle,
} from "../lib/pricing-market";

type PricingMarketToggleProps = {
  currentMarket: PricingMarket;
  onSelectMarket: (pricingMarket: PricingMarket) => Promise<void>;
};

const PRICING_MARKET_OPTIONS: PricingMarket[] = ["hk", "intl"];

export default function PricingMarketToggle({
  currentMarket,
  onSelectMarket,
}: PricingMarketToggleProps) {
  const [pendingMarket, setPendingMarket] = useState<PricingMarket | null>(null);

  async function handleSelectMarket(pricingMarket: PricingMarket) {
    if (pricingMarket === currentMarket || pendingMarket) {
      return;
    }

    setPendingMarket(pricingMarket);

    try {
      await onSelectMarket(pricingMarket);
    } finally {
      setPendingMarket(null);
    }
  }

  return (
    <div className="inline-flex w-full max-w-[360px] items-center gap-0.5 rounded-[22px] border border-slate-200 bg-slate-50/90 p-1 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      {PRICING_MARKET_OPTIONS.map((pricingMarket) => {
        const isSelected = pricingMarket === currentMarket;
        const isPending = pendingMarket === pricingMarket;

        return (
          <button
            key={pricingMarket}
            type="button"
            onClick={() => void handleSelectMarket(pricingMarket)}
            disabled={Boolean(pendingMarket)}
            className={`flex min-h-[54px] flex-1 flex-col items-center justify-center rounded-[18px] px-3 py-2 text-center transition ${
              isSelected
                ? "bg-[#0f172a] text-white shadow-[0_10px_20px_rgba(15,23,42,0.12)]"
                : "bg-transparent text-slate-700 hover:bg-white/80 hover:text-[#0f172a]"
            } disabled:cursor-not-allowed disabled:opacity-70`}
          >
            <span className="text-[13px] font-semibold leading-none">
              {isPending ? "Updating..." : getPricingMarketToggleTitle(pricingMarket)}
            </span>
            {!isPending ? (
              <span
                className={`mt-1 text-[10px] font-medium uppercase tracking-[0.14em] leading-none ${
                  isSelected ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {getPricingMarketToggleCaption(pricingMarket)}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
