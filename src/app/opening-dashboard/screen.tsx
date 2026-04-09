"use client";

import { useEffect } from "react";

const openingDashboardHref = "/dashboard";

export default function OpeningDashboardScreen() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.replace(openingDashboardHref);
    }, 140);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-[32px] border border-white/10 bg-white/95 p-8 text-[#0f172a] shadow-2xl shadow-black/30">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#f59e0b]">
            Secure sign-in confirmed
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Opening your dashboard.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We&apos;re loading your notebook, weekly recap, and family reading
            workspace now.
          </p>

          <div className="mt-8 overflow-hidden rounded-full bg-slate-200">
            <div className="h-2 w-2/3 animate-pulse rounded-full bg-[#fbbf24]" />
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            This handoff screen keeps the sign-in flow feeling immediate while
            the dashboard finishes preparing in the background.
          </p>
        </div>
      </div>
    </div>
  );
}
