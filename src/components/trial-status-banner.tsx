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
        ? "bg-rose-50 border-rose-100" 
        : "bg-amber-50/50 border-amber-100/50"
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
            isEndingSoon ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
          }`}>
            {isEndingSoon ? <AlertTriangle size={16} /> : <Clock size={16} />}
          </div>
          <div>
            <p className={`text-sm font-bold ${isEndingSoon ? "text-rose-900" : "text-amber-900"}`}>
              {daysRemaining === 0 
                ? "Your trial ends today!" 
                : daysRemaining === 1 
                  ? "Only 1 day left in your free trial" 
                  : `${daysRemaining} days left in your free trial`}
            </p>
            <p className="text-xs text-slate-500 font-medium">
              You will be billed {isEndingSoon ? "soon" : `on ${expires.toLocaleDateString()}`} unless you cancel.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href="/billing"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              isEndingSoon
                ? "bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-200"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CreditCard size={14} />
            Manage Subscription
          </Link>
        </div>
      </div>
    </div>
  );
}
