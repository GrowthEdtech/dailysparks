"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an analytics service
    console.error("Global runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-rose-100 to-transparent blur-3xl opacity-60" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-gradient-to-tr from-[#fbbf24]/5 to-transparent blur-3xl opacity-40" />
      </div>

      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative inline-flex mb-4">
          <div className="absolute inset-0 bg-rose-200/50 blur-2xl rounded-full" />
          <div className="relative h-24 w-24 rounded-full bg-white shadow-xl flex items-center justify-center border border-rose-100">
            <AlertCircle className="text-rose-500" size={48} />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black text-[#0f172a] tracking-tight">
            Something went <span className="text-rose-500">spark-less</span>.
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            We encountered a technical glitch while loading this page. Our engine team has been notified.
          </p>
          {error.digest && (
            <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-400 font-bold bg-slate-100 inline-block px-2 py-1 rounded">
              Ref: {error.digest}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-8 py-4 text-sm font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:-translate-y-1 active:translate-y-0"
          >
            <RefreshCcw size={18} />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-8 py-4 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300"
          >
            <Home size={18} />
            Back to Safety
          </Link>
        </div>

        <div className="pt-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
          Daily Sparks IB Growth Engine
        </div>
      </div>
    </div>
  );
}
