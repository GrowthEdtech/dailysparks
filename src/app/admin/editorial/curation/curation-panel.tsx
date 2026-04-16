"use client";

import { useState } from "react";

import type { DailyBriefHistoryRecord } from "../../../../lib/daily-brief-history-schema";
import { approveDraft, rejectDraft } from "./curation-actions";
import { formatEditorialCohortLabel } from "../daily-briefs/daily-brief-admin-helpers";

type CurationPanelProps = {
  drafts: DailyBriefHistoryRecord[];
};

export default function CurationPanel({ drafts: initialDrafts }: CurationPanelProps) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});

  function handleMarkdownChange(id: string, content: string) {
    setEditingContent((prev) => ({ ...prev, [id]: content }));
  }

  function handleRejectReasonChange(id: string, reason: string) {
    setRejectReason((prev) => ({ ...prev, [id]: reason }));
  }

  async function handleApprove(id: string) {
    setIsSubmitting((prev) => ({ ...prev, [id]: true }));
    try {
      const draft = drafts.find((d) => d.id === id);
      if (!draft) return;
      const markdown = editingContent[id] ?? draft.briefMarkdown;
      await approveDraft(id, markdown);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Failed to approve draft", error);
      alert("Failed to approve draft. See console for details.");
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleReject(id: string) {
    const reason = rejectReason[id];
    if (!reason?.trim()) {
      alert("Please provide a reason for rejecting this draft.");
      return;
    }

    setIsSubmitting((prev) => ({ ...prev, [id]: true }));
    try {
      await rejectDraft(id, reason);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Failed to reject draft", error);
      alert("Failed to reject draft. See console for details.");
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  }

  if (drafts.length === 0) {
    return (
      <div className="mt-8 flex min-h-[300px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
        <div className="text-center">
          <h3 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Inbox Zero
          </h3>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
            There are currently no AI-generated drafts awaiting human curation. 
            All generated content has been approved or rejected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      {drafts.map((draft) => {
        const isProcessing = isSubmitting[draft.id];
        const content = editingContent[draft.id] ?? draft.briefMarkdown;

        return (
          <article
            key={draft.id}
            className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm xl:flex xl:gap-8"
          >
            {/* Left Column: Metadata & Sources */}
            <div className="flex-[0.4] xl:border-r xl:border-slate-100 xl:pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {draft.programme}
                </span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {formatEditorialCohortLabel(draft.editorialCohort)}
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Needs review
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-[#0f172a]">
                {draft.headline}
              </h3>
              
              <div className="mt-4 space-y-4">
                <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-[#0f172a]">Target Date</p>
                  <p className="mt-1">{draft.scheduledFor}</p>
                </div>

                <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-[#0f172a]">Primary Sources</p>
                  {draft.sourceReferences.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {draft.sourceReferences.map((src) => (
                        <li key={src.sourceId}>
                          <a 
                            href={src.articleUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[#b45309] hover:underline"
                          >
                            {src.articleTitle || src.sourceName}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 italic">No sources referenced.</p>
                  )}
                </div>

                <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-[#0f172a]">Generation Details</p>
                  <p className="mt-1">Model: {draft.aiConnectionName}</p>
                  <p>Policy: {draft.promptVersionLabel}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Markdown Editor & Actions */}
            <div className="mt-6 flex-[0.6] xl:mt-0 flex flex-col h-full">
              <label 
                htmlFor={`markdown-${draft.id}`}
                className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
              >
                Generated Markdown
              </label>
              <textarea
                id={`markdown-${draft.id}`}
                value={content}
                onChange={(e) => handleMarkdownChange(draft.id, e.target.value)}
                disabled={isProcessing}
                className="mt-3 flex-1 min-h-[400px] w-full rounded-2xl border border-slate-200 bg-white p-4 text-[13px] font-mono leading-relaxed text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
                placeholder="Draft markdown is empty..."
              />
              
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-100 pt-6">
                <div className="flex-1">
                  <input
                    type="text"
                    value={rejectReason[draft.id] || ""}
                    onChange={(e) => handleRejectReasonChange(draft.id, e.target.value)}
                    disabled={isProcessing}
                    placeholder="Reason for rejection (required if rejecting)"
                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => handleReject(draft.id)}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : "Reject Draft"}
                  </button>
                  <button
                    onClick={() => handleApprove(draft.id)}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : "Approve & Schedule"}
                  </button>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
