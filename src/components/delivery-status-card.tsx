"use client";

import { CheckCircle2, XCircle, Clock, RefreshCcw, AlertCircle } from "lucide-react";
import type { ParentProfile } from "../lib/mvp-types";

type DeliveryStatusCardProps = {
  profile: ParentProfile;
};

export default function DeliveryStatusCard({ profile }: DeliveryStatusCardProps) {
  const { student, parent } = profile;

  const gnStatus = student.goodnotesLastDeliveryStatus;
  const notionStatus = parent.notionLastSyncStatus;
  
  const hasGoodnotes = student.goodnotesConnected && student.goodnotesEmail;
  const hasNotion = parent.notionConnected && parent.notionDatabaseId;

  if (!hasGoodnotes && !hasNotion) return null;

  return (
    <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#0f172a]">
           Fulfillment Health
        </h3>
        <div className="flex items-center gap-2">
           <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
           </span>
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Live Monitor</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Goodnotes Status */}
        {hasGoodnotes && (
          <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl ${
                gnStatus === "success" ? "bg-emerald-100 text-emerald-600" : 
                gnStatus === "failed" ? "bg-rose-100 text-rose-600" : "bg-slate-200 text-slate-500"
              }`}>
                {gnStatus === "success" ? <CheckCircle2 size={18} /> : 
                 gnStatus === "failed" ? <XCircle size={18} /> : <Clock size={18} />}
              </div>
              <div>
                <p className="text-xs font-black text-[#0f172a]">Goodnotes Destination</p>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed mt-1">
                  {student.goodnotesLastDeliveryMessage || "Awaiting first automated delivery."}
                </p>
              </div>
            </div>
            {gnStatus === "failed" && (
                <div className="flex shrink-0 items-center justify-center rounded-lg bg-rose-600 p-2 text-white shadow-lg shadow-rose-200">
                   <AlertCircle size={14} />
                </div>
            )}
          </div>
        )}

        {/* Notion Status */}
        {hasNotion && (
          <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl ${
                notionStatus === "success" ? "bg-emerald-100 text-emerald-600" : 
                notionStatus === "failed" ? "bg-rose-100 text-rose-600" : "bg-slate-200 text-slate-500"
              }`}>
                {notionStatus === "success" ? <CheckCircle2 size={18} /> : 
                 notionStatus === "failed" ? <XCircle size={18} /> : <Clock size={18} />}
              </div>
              <div>
                <p className="text-xs font-black text-[#0f172a]">Notion Archive</p>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed mt-1">
                  {parent.notionLastSyncMessage || "Sync pending next editorial run."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center border-t border-slate-100 pt-5">
         <p className="text-[10px] font-bold text-slate-400 text-center leading-relaxed">
            Automatic retries enabled. If a sync fails, our engine will attempt remediation 3 times before alerting the ops team.
         </p>
      </div>
    </div>
  );
}
