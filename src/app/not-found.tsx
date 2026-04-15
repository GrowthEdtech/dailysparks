import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-[#fbbf24]/10 to-transparent blur-3xl opacity-60" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-gradient-to-tr from-[#00b5d6]/5 to-transparent blur-3xl opacity-40" />
      </div>

      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative inline-flex mb-4">
          <div className="absolute inset-0 bg-[#fbbf24]/20 blur-2xl rounded-full" />
          <h1 className="relative text-9xl font-black text-[#0f172a] tracking-tighter">
            404
          </h1>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Oops! This page is playing hide and seek.
          </h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            We couldn't find the page you're looking for. It might have been moved or doesn't exist anymore.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-8 py-4 text-sm font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:-translate-y-1 active:translate-y-0"
          >
            <Home size={18} />
            Back to Dashboard
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-8 py-4 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300"
          >
            <ArrowLeft size={18} />
            Go Home
          </Link>
        </div>

        <div className="pt-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
          Daily Sparks IB Growth Engine
        </div>
      </div>
    </div>
  );
}
