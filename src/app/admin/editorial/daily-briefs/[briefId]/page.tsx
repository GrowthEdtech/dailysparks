import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDailyBriefHistoryEntry } from "../../../../../lib/daily-brief-history-store";
import { buildOutboundDailyBriefPacket } from "../../../../../lib/outbound-daily-brief-packet";
import {
  buildPipelineTimeline,
  formatAdminDateTime,
  formatEditorialCohortLabel,
  formatRecordKindLabel,
  formatPipelineStageLabel,
  getDeliverySummaryLabel,
  getEditorialCohortBadgeClasses,
  getPipelineStageBadgeClasses,
  getRecordKindBadgeClasses,
  getRetryWindowLabel,
} from "../daily-brief-admin-helpers";
import ManualResendPanel from "./manual-resend-panel";

type DailyBriefDetailPageProps = {
  params: Promise<{
    briefId: string;
  }>;
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

function getDefaultManualResendEmail(
  entry: NonNullable<Awaited<ReturnType<typeof getDailyBriefHistoryEntry>>>,
) {
  return (
    entry.failedDeliveryTargets[0]?.parentEmail ??
    entry.skippedProfiles?.[0]?.parentEmail ??
    entry.heldProfiles?.[0]?.parentEmail ??
    entry.pendingFutureProfiles?.[0]?.parentEmail ??
    ""
  );
}

export default async function DailyBriefDetailPage({
  params,
}: DailyBriefDetailPageProps) {
  const { briefId } = await params;
  const entry = await getDailyBriefHistoryEntry(briefId);

  if (!entry) {
    notFound();
  }

  const preview = buildOutboundDailyBriefPacket(entry);

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/admin/editorial/daily-briefs"
              className="text-sm font-semibold text-slate-500 transition hover:text-[#0f172a]"
            >
              Back to Daily Briefs
            </Link>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
              Daily brief record
            </p>
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getRecordKindBadgeClasses(entry.recordKind)}`}
                >
                  {formatRecordKindLabel(entry.recordKind)}
                </span>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getEditorialCohortBadgeClasses(entry.editorialCohort)}`}
                >
                  {formatEditorialCohortLabel(entry.editorialCohort)}
                </span>
              </div>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">
              {entry.headline}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {entry.summary}
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            <p className="font-semibold text-[#0f172a]">
              {formatDate(entry.scheduledFor)}
            </p>
            <p className="mt-2">Programme: {entry.programme}</p>
            <p>Cohort: {formatEditorialCohortLabel(entry.editorialCohort)}</p>
            <p>Status: {entry.status}</p>
            <p className="mt-2">
              Pipeline:{" "}
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getPipelineStageBadgeClasses(entry.pipelineStage)}`}
              >
                {formatPipelineStageLabel(entry.pipelineStage)}
              </span>
            </p>
            <p>Prompt policy: {entry.promptVersionLabel}</p>
            <p>Prompt: {entry.promptVersion}</p>
            <p>
              Model: {entry.aiConnectionName} / {entry.aiModel}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <article className="rounded-[32px] border border-[#d9e4f2] bg-[#fffdfa] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
                Editorial preview
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-[#0f172a]">
                Outbound PDF view
              </h2>
            </div>
            <span className="inline-flex rounded-full border border-[#d9e4f2] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {formatRecordKindLabel(entry.recordKind)}
            </span>
          </div>

          <div className="mt-5 rounded-[28px] border border-[#d4e3f5] bg-[#eef6ff] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
              {preview.eyebrow}
            </p>
            <h3 className="mt-4 text-[2rem] font-bold leading-tight tracking-tight text-[#0f172a]">
              {preview.title}
            </h3>
            <div className="mt-5 flex flex-wrap gap-2">
              {preview.metadataItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex rounded-full border border-[#d4e3f5] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[28px] border border-[#d9e4f2] bg-white shadow-sm">
            <Image
              src={`/api/admin/daily-brief-thumbnail/${entry.id}`}
              alt={`First-page PDF preview for ${entry.headline}`}
              width={595}
              height={842}
              className="block h-auto w-full"
            />
          </div>

          <div className="mt-5 rounded-[24px] border border-[#d9e4f2] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#64748b]">
                  Typst prototype
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Prototype only. Production delivery still uses the live
                  `pdf-lib` renderer while we evaluate a future Typst migration.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`/api/admin/daily-brief-typst/${entry.id}`}
                  className="inline-flex items-center justify-center rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
                >
                  Download Typst prototype PDF
                </a>
                <a
                  href={`/api/admin/daily-brief-typst/${entry.id}?format=source`}
                  className="inline-flex items-center justify-center rounded-full border border-[#d9e4f2] bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-50"
                >
                  View Typst source
                </a>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <section className="rounded-[24px] border border-[#d9e4f2] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#64748b]">
                {preview.summaryTitle}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {preview.summaryBody}
              </p>
            </section>

            {preview.themesTitle && preview.themesBody ? (
              <section className="rounded-[24px] border border-[#f1dfb9] bg-[#fdf7ea] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b45309]">
                  {preview.themesTitle}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {preview.themesBody}
                </p>
              </section>
            ) : null}

            <section className="rounded-[24px] border border-[#d9e4f2] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#64748b]">
                {preview.readingTitle}
              </p>
              <div className="mt-3 space-y-4 text-sm leading-7 text-slate-700">
                {preview.readingSections.map((section) => (
                  <div key={`${section.title ?? "reading"}-${section.body}`}>
                    {section.title ? (
                      <p className="text-sm font-semibold text-[#0f172a]">
                        {section.title}
                      </p>
                    ) : null}
                    <p className={section.title ? "mt-1" : undefined}>
                      {section.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {preview.vocabularyTitle && preview.vocabularyItems.length > 0 ? (
              <section className="rounded-[24px] border border-[#f1dfb9] bg-[#fdf7ea] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b45309]">
                  {preview.vocabularyTitle}
                </p>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
                  {preview.vocabularyItems.map((item) => (
                    <div key={`${item.term}-${item.definition}`}>
                      <p className="font-semibold text-[#0f172a]">{item.term}</p>
                      <p className="mt-1">{item.definition}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[24px] border border-[#d4e3f5] bg-[#eef6ff] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#64748b]">
                {preview.discussionTitle}
              </p>
              <div className="mt-3 space-y-3">
                {preview.discussionPrompts.map((prompt) => (
                  <div
                    key={prompt}
                    className="rounded-[18px] border border-[#d4e3f5] bg-white px-4 py-3 text-sm leading-6 text-slate-700"
                  >
                    {prompt}
                  </div>
                ))}
              </div>
            </section>

            {preview.bigIdeaTitle && preview.bigIdeaBody ? (
              <section className="rounded-[24px] border border-[#d9e4f2] bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#64748b]">
                  {preview.bigIdeaTitle}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {preview.bigIdeaBody}
                </p>
              </section>
            ) : null}

            <section className="rounded-[24px] border border-[#d9e4f2] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#64748b]">
                {preview.sourcesTitle}
              </p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {preview.sourceLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 border-t border-[#d9e4f2] pt-4">
            <p className="text-base font-semibold text-[#0f172a]">
              {preview.footerSignature}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Prompt {entry.promptVersionLabel} · {entry.aiConnectionName} / {entry.aiModel}
            </p>
          </div>
        </article>

        <aside className="space-y-6">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
              Pipeline timeline
            </h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Current stage
                </p>
                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getPipelineStageBadgeClasses(entry.pipelineStage)}`}
                  >
                    {formatPipelineStageLabel(entry.pipelineStage)}
                  </span>
                </div>
              </div>

              {buildPipelineTimeline(entry).map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#0f172a]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
              Selection governance
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>
                <span className="font-semibold text-[#0f172a]">
                  Selection decision:
                </span>{" "}
                {entry.selectionDecision === "follow_up"
                  ? "Follow-up exception"
                  : "New topic"}
              </p>
              <p>
                <span className="font-semibold text-[#0f172a]">
                  Topic cluster key:
                </span>{" "}
                {entry.topicClusterKey}
              </p>
              <p>
                <span className="font-semibold text-[#0f172a]">
                  Normalized headline:
                </span>{" "}
                {entry.normalizedHeadline}
              </p>
              {entry.topicLatestPublishedAt ? (
                <p>
                  <span className="font-semibold text-[#0f172a]">
                    Latest topic source:
                  </span>{" "}
                  {formatAdminDateTime(entry.topicLatestPublishedAt)}
                </p>
              ) : null}
              {entry.selectionOverrideNote ? (
                <p className="rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900">
                  <span className="font-semibold text-sky-950">
                    Override note:
                  </span>{" "}
                  {entry.selectionOverrideNote}
                </p>
              ) : null}
            </div>

            {entry.blockedTopics.length > 0 ? (
              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Blocked alternatives
                </h3>
                {entry.blockedTopics.map((topic) => (
                  <article
                    key={`${topic.clusterKey}-${topic.existingScheduledFor}-${topic.policy}`}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {topic.policy.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#0f172a]">
                      {topic.headline}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {topic.reason}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Existing published brief · {topic.existingEditorialCohort} ·{" "}
                      {formatDate(topic.existingScheduledFor)}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-[32px] border border-[#d9e4f2] bg-[#fffdfa] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
              Dispatch review
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review the live dispatch outcome against the stored outbound asset, receipts, and audience decisions for this brief.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[#d9e4f2] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Attempts
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-[#0f172a]">
                  {entry.deliveryAttemptCount}
                </p>
              </div>
              <div className="rounded-[24px] border border-[#d9e4f2] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Delivered
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
                  {entry.deliverySuccessCount}
                </p>
              </div>
              <div className="rounded-[24px] border border-[#d9e4f2] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Failed
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-rose-700">
                  {entry.deliveryFailureCount}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-[#d4e3f5] bg-[#eef6ff] p-5 text-sm leading-6 text-slate-600">
              <p>
                <span className="font-semibold text-[#0f172a]">
                  Delivery summary:
                </span>{" "}
                {getDeliverySummaryLabel(entry)}
              </p>
              <p>
                <span className="font-semibold text-[#0f172a]">
                  Last delivery attempt:
                </span>{" "}
                {formatAdminDateTime(entry.lastDeliveryAttemptAt)}
              </p>
              <p>
                <span className="font-semibold text-[#0f172a]">
                  Retry eligible until:
                </span>{" "}
                {getRetryWindowLabel(entry)}
              </p>
              {entry.failureReason ? (
                <p className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
                  <span className="font-semibold text-rose-900">
                    Failure reason:
                  </span>{" "}
                  {entry.failureReason}
                </p>
              ) : null}
            </div>

            {entry.failedDeliveryTargets.length > 0 ? (
              <div className="mt-4 space-y-3">
                {entry.failedDeliveryTargets.map((target) => (
                  <article
                    key={`${target.parentId}-${target.channel}`}
                    className="rounded-[24px] border border-rose-200 bg-rose-50/70 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">
                      {target.channel}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-rose-900">
                      {target.parentEmail}
                    </p>
                    <p className="mt-1 text-sm text-rose-700">
                      {target.errorMessage}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}

            {entry.deliveryReceipts.length > 0 ? (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                  Delivery receipts
                </h3>
                {entry.deliveryReceipts.map((receipt) => (
                  <article
                    key={`${receipt.parentId}-${receipt.channel}-${receipt.externalId ?? receipt.attachmentFileName ?? "receipt"}`}
                    className="rounded-[24px] border border-[#d9e4f2] bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {receipt.channel}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#0f172a]">
                          {receipt.parentEmail}
                        </p>
                      </div>
                      {receipt.externalUrl ? (
                        <a
                          href={receipt.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-[#0f172a] underline underline-offset-4"
                        >
                          Open external record
                        </a>
                      ) : null}
                    </div>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                      <p>
                        <span className="font-semibold text-[#0f172a]">
                          Attachment filename:
                        </span>{" "}
                        <span className="font-mono text-[13px] text-slate-700">
                          {receipt.attachmentFileName ?? "Not applicable"}
                        </span>
                      </p>
                      <p>
                        <span className="font-semibold text-[#0f172a]">
                          External id:
                        </span>{" "}
                        {receipt.externalId ?? "Not recorded"}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            <div className="mt-6 rounded-[24px] border border-[#d9e4f2] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#64748b]">
                Dispatch audience
              </h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  <span className="font-semibold text-[#0f172a]">
                    Dispatch mode:
                  </span>{" "}
                  {entry.dispatchMode ?? "Unavailable on this legacy record"}
                </p>
                {entry.dispatchMode === "canary" &&
                (entry.dispatchCanaryParentEmails?.length ?? 0) > 0 ? (
                  <p>
                    <span className="font-semibold text-[#0f172a]">
                      Canary recipients:
                    </span>{" "}
                    {entry.dispatchCanaryParentEmails?.join(", ")}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 space-y-4">
                {[
                  {
                    label: "Targeted families",
                    entries: entry.targetedProfiles ?? [],
                  },
                  {
                    label: "Skipped families",
                    entries: entry.skippedProfiles ?? [],
                  },
                  {
                    label: "Pending future windows",
                    entries: entry.pendingFutureProfiles ?? [],
                  },
                  {
                    label: "Held for channel recovery",
                    entries: entry.heldProfiles ?? [],
                  },
                ].map((group) => (
                  <div
                    key={group.label}
                    className="rounded-[20px] border border-[#d9e4f2] bg-[#f8fbff] p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {group.label}
                    </p>
                    {group.entries.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {group.entries.map((audienceEntry) => (
                          <article
                            key={`${group.label}-${audienceEntry.parentId}-${audienceEntry.reason}`}
                            className="rounded-[18px] border border-[#d9e4f2] bg-white px-4 py-3"
                          >
                            <p className="text-sm font-semibold text-[#0f172a]">
                              {audienceEntry.parentEmail}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {audienceEntry.reason}
                            </p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {audienceEntry.localDeliveryWindow}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        No audience entries recorded for this category.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
              Source references
            </h2>
            <div className="mt-4 space-y-4">
              {entry.sourceReferences.map((reference) => (
                <article
                  key={`${reference.sourceId}-${reference.articleUrl}`}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {reference.sourceName}
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#0f172a]">
                    {reference.articleTitle}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {reference.sourceDomain}
                  </p>
                  <a
                    href={reference.articleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm font-semibold text-[#0f172a] underline underline-offset-4"
                  >
                    Open source article
                  </a>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
              Editorial notes
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
              <p>
                <span className="font-semibold text-[#0f172a]">
                  Repetition check:
                </span>{" "}
                {entry.repetitionRisk} risk
              </p>
              <p>{entry.repetitionNotes || "No repetition notes recorded."}</p>
              <p>
                <span className="font-semibold text-[#0f172a]">
                  Admin notes:
                </span>{" "}
                {entry.adminNotes || "No admin notes recorded."}
              </p>
              <p>
                <span className="font-semibold text-[#0f172a]">
                  Topic tags:
                </span>{" "}
                {entry.topicTags.length > 0
                  ? entry.topicTags.join(", ")
                  : "No topic tags recorded."}
              </p>
            </div>
          </section>
        </aside>
      </div>

      <ManualResendPanel
        briefId={entry.id}
        defaultParentEmail={getDefaultManualResendEmail(entry)}
      />
    </section>
  );
}
