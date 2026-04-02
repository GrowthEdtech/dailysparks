import Link from "next/link";
import { notFound } from "next/navigation";

import { getDailyBriefHistoryEntry } from "../../../../../lib/daily-brief-history-store";

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

export default async function DailyBriefDetailPage({
  params,
}: DailyBriefDetailPageProps) {
  const { briefId } = await params;
  const entry = await getDailyBriefHistoryEntry(briefId);

  if (!entry) {
    notFound();
  }

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
            <p>Status: {entry.status}</p>
            <p>Prompt: {entry.promptVersion}</p>
            <p>
              Model: {entry.aiConnectionName} / {entry.aiModel}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Generated brief
          </h2>
          <pre className="mt-4 whitespace-pre-wrap break-words rounded-[24px] bg-slate-50 p-5 text-sm leading-7 text-slate-700">
            {entry.briefMarkdown}
          </pre>
        </article>

        <aside className="space-y-6">
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
    </section>
  );
}
