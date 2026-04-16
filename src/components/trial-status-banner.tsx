"use client";

import { CreditCard, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getDerivedAccessState } from "../lib/access-state";
import type { ParentRecord } from "../lib/mvp-types";

type TrialStatusBannerProps = {
  parent: ParentRecord;
};

export default function TrialStatusBanner({ parent }: TrialStatusBannerProps) {
  const accessState = getDerivedAccessState(parent);
  
  if (accessState !== "trial_active") {
    return null;
  }

  const now = new Date();
  const expires = new Date(parent.trialEndsAt);
  const diffInMs = expires.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffInMs / (1000 * 60 * 60 * 24)));
  
  const isEndingSoon = daysRemaining <= 2;

  return (
    <div className={`w-full px-6 py-3 border-b backdrop-blur-md transition-all duration-500 animate-in fade-in slide-in-from-top-4 ${
      isEndingSoon 
        ? "bg-rose-50 border-rose-100 ring-1 ring-rose-200/50 animate-pulse-subtle" 
        : "bg-amber-50/50 border-amber-100/50"
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            isEndingSoon ? "bg-rose-100 text-rose-600 shadow-sm" : "bg-amber-100 text-amber-600"
          }`}>
            {isEndingSoon ? <AlertTriangle size={20} /> : <Clock size={20} />}
          </div>
          <div className="space-y-0.5">
            <p className={`text-sm font-black tracking-tight ${isEndingSoon ? "text-rose-900" : "text-amber-900"}`}>
              {daysRemaining === 0 
                ? "Protect your academic archives - Trial ends today!" 
                : daysRemaining === 1 
                  ? "1 day left to secure your academic archives" 
                  : `${daysRemaining} days left in your free trial`}
            </p>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              {isEndingSoon 
                ? "Maintain your habit and access to all past briefs." 
                : `Billed on ${expires.toLocaleDateString()} unless you cancel.`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href="/billing"
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black transition-all shadow-sm active:scale-95 ${
              isEndingSoon
                ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200"
                : "bg-white border-2 border-slate-100 text-slate-600 hover:border-slate-200"
            }`}
          >
            <CreditCard size={14} />
            {isEndingSoon ? "Secure Subscription" : "Manage Subscription"}
          </Link>
        </div>
      </div>
    </div>
  );
}
