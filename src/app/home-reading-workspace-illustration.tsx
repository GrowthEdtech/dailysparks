import { BookOpen, Brain, PenTool, ShieldCheck } from "lucide-react";

export default function HomeReadingWorkspaceIllustration() {
  return (
    <div className="bg-[#0f172a] rounded-[42px] w-full aspect-square md:aspect-[4/5] overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_36%)]" />
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="absolute left-[16%] top-[27%] h-px w-[24%] bg-gradient-to-r from-[#38bdf8]/0 via-[#38bdf8]/80 to-[#38bdf8]/0" />
      <div className="absolute right-[16%] top-[27%] h-px w-[24%] bg-gradient-to-r from-[#fbbf24]/0 via-[#fbbf24]/90 to-[#fbbf24]/0" />
      <div className="absolute left-[22%] bottom-[29%] h-px w-[20%] bg-gradient-to-r from-[#38bdf8]/0 via-[#38bdf8]/70 to-[#38bdf8]/0" />
      <div className="absolute right-[20%] bottom-[29%] h-px w-[18%] bg-gradient-to-r from-[#fbbf24]/0 via-[#fbbf24]/70 to-[#fbbf24]/0" />

      <div className="relative h-full w-full p-6 md:p-8">
        <div className="absolute left-6 top-6 rounded-[22px] border border-[#67e8f9]/30 bg-[#082f49]/70 px-4 py-3 text-white shadow-[0_18px_40px_-28px_rgba(103,232,249,0.55)] backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#67e8f9]">
            <Brain className="h-4 w-4" />
            MYP inquiry lens
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-200">
            Context, compare-connect, and inquiry prompts for bridge reading.
          </p>
        </div>

        <div className="absolute right-6 top-10 rounded-[22px] border border-[#fbbf24]/30 bg-[#3f2a04]/70 px-4 py-3 text-white shadow-[0_18px_40px_-28px_rgba(251,191,36,0.5)] backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#fcd34d]">
            <PenTool className="h-4 w-4" />
            DP claim builder
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-200">
            Abstract, claim, and counterpoint signals for academic framing.
          </p>
        </div>

        <div className="absolute left-1/2 top-1/2 w-[72%] max-w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(15,23,42,0.72))] p-5 shadow-[0_36px_90px_-52px_rgba(15,23,42,0.88)] backdrop-blur-sm">
          <div className="rounded-[26px] border border-white/10 bg-white/95 p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Daily brief
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[#0f172a]">
                  Read, reflect, and save in one calm loop.
                </h3>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                IB MYP · DP
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {[
                "Structured brief with stage-aware prompts",
                "Student reads in Goodnotes without dashboard noise",
                "Notebook entries and recap stay reusable later",
              ].map((line) => (
                <div
                  key={line}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <span className="h-2 w-2 rounded-full bg-[#fbbf24]" />
                  <span className="text-sm text-slate-600">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute left-8 bottom-10 rounded-[22px] border border-white/10 bg-white/90 px-4 py-3 text-[#0f172a] shadow-[0_20px_50px_-32px_rgba(15,23,42,0.6)]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <PenTool className="h-4 w-4 text-[#0ea5e9]" />
            Goodnotes delivery
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            Direct student reading flow, ready for handwriting and focus.
          </p>
        </div>

        <div className="absolute right-8 bottom-12 rounded-[22px] border border-white/12 bg-white/10 px-4 py-3 text-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.72)] backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-200">
            <BookOpen className="h-4 w-4 text-[#f8fafc]" />
            Notion archive
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            Family record for briefs, reflections, and saved notebook thinking.
          </p>
        </div>

        <div className="absolute bottom-6 left-1/2 w-[56%] max-w-[17rem] -translate-x-1/2 rounded-[20px] border border-[#fbbf24]/25 bg-[#111827]/75 px-4 py-3 text-white shadow-[0_18px_40px_-30px_rgba(251,191,36,0.42)] backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#fcd34d]">
            <ShieldCheck className="h-4 w-4" />
            Weekly recap
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            Retrieval prompts turn saved notes into reusable academic memory.
          </p>
        </div>
      </div>
    </div>
  );
}
