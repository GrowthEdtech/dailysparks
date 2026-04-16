"use client";

import { TrendingUp, Flame, Library, Target } from "lucide-react";

type AcademicGrowthVisualProps = {
  briefsCount: number;
  streakDays: number;
  programme: string;
};

export default function AcademicGrowthVisual({
  briefsCount,
  streakDays,
  programme,
}: AcademicGrowthVisualProps) {
  // Simple calculation for "Habit Strength" percentage
  const habitStrength = Math.min(100, (briefsCount / 30) * 100);
  const nextMilestone = briefsCount < 10 ? 10 : briefsCount < 50 ? 50 : 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-1">
      {/* Knowledge Base Size */}
      <div className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-50/50 blur-2xl transition-all group-hover:bg-blue-100/50" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Library size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Knowledge Assets</p>
            <h4 className="text-2xl font-black text-slate-900">{briefsCount}</h4>
          </div>
        </div>
        <div className="mt-4 space-y-2 relative z-10">
          <div className="flex justify-between text-[10px] font-bold text-slate-500">
            <span>Progress to {nextMilestone}</span>
            <span>{Math.round((briefsCount / nextMilestone) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-50 overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-1000 ease-out"
              style={{ width: `${(briefsCount / nextMilestone) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Habit Streak */}
      <div className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-50/50 blur-2xl transition-all group-hover:bg-amber-100/50" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Flame size={24} className={streakDays > 0 ? "animate-pulse" : ""} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Habit Streak</p>
            <h4 className="text-2xl font-black text-slate-900">{streakDays} Days</h4>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 relative z-10">
           <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-600 uppercase tracking-tighter">
             Active Learner
           </span>
           <p className="text-[10px] font-bold text-slate-400">Keep up the rhythm!</p>
        </div>
      </div>

      {/* Syllabus Coverage (Mocked for now based on briefs) */}
      <div className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-50/50 blur-2xl transition-all group-hover:bg-emerald-100/50" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Target size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{programme} Focus</p>
            <h4 className="text-2xl font-black text-slate-900">{Math.round(habitStrength)}%</h4>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 relative z-10">
           <TrendingUp size={12} className="text-emerald-500" />
           <p className="text-[10px] font-bold text-slate-500">Momentum is building</p>
        </div>
      </div>

      {/* Global Competing (Fuzzy logic) */}
      <div className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-slate-900 p-6 shadow-sm transition-all hover:shadow-md">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="flex flex-col h-full justify-between relative z-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Global Ranking</p>
            <h4 className="text-lg font-black text-white mt-1">Top {briefsCount > 5 ? "15%" : "30%"}</h4>
          </div>
          <p className="text-[10px] font-bold text-slate-400 leading-relaxed mt-4">
             You are outperforming {briefsCount > 5 ? "most" : "the average"} IB families in habit consistency.
          </p>
        </div>
      </div>
    </div>
  );
}
