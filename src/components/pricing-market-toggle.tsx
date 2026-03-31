"use client";

import { useState } from "react";

import type { PricingMarket } from "../lib/pricing-market";
import { getPricingMarketToggleLabel } from "../lib/pricing-market";

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
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      {PRICING_MARKET_OPTIONS.map((pricingMarket) => {
        const isSelected = pricingMarket === currentMarket;
        const isPending = pendingMarket === pricingMarket;

        return (
          <button
            key={pricingMarket}
            type="button"
            onClick={() => void handleSelectMarket(pricingMarket)}
            disabled={Boolean(pendingMarket)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              isSelected
                ? "bg-[#0f172a] text-white"
                : "text-slate-500 hover:text-[#0f172a]"
            } disabled:cursor-not-allowed disabled:opacity-70`}
          >
            {isPending ? "Updating..." : getPricingMarketToggleLabel(pricingMarket)}
          </button>
        );
      })}
    </div>
  );
}
