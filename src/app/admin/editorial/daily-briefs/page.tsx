import Link from "next/link";

import { listDailyBriefHistory } from "../../../../lib/daily-brief-history-store";
import {
  DAILY_BRIEF_STATUSES,
  type DailyBriefStatus,
} from "../../../../lib/daily-brief-history-schema";
import {
  IB_PROGRAMMES,
  isProgramme,
  type Programme,
} from "../../../../lib/mvp-types";

type DailyBriefsAdminPageProps = {
  searchParams: Promise<{
    programme?: string;
    status?: string;
  }>;
};

function parseProgramme(value: string | undefined): Programme | undefined {
  return value && isProgramme(value) ? value : undefined;
}

function parseStatus(value: string | undefined): DailyBriefStatus | undefined {
  return value &&
    DAILY_BRIEF_STATUSES.includes(value as DailyBriefStatus)
    ? (value as DailyBriefStatus)
    : undefined;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

function buildFilterHref(filters: {
  programme?: Programme;
  status?: DailyBriefStatus;
}) {
  const nextSearchParams = new URLSearchParams();

  if (filters.programme) {
    nextSearchParams.set("programme", filters.programme);
  }

  if (filters.status) {
    nextSearchParams.set("status", filters.status);
  }

  const query = nextSearchParams.toString();
  return query
    ? `/admin/editorial/daily-briefs?${query}`
    : "/admin/editorial/daily-briefs";
}

export default async function DailyBriefsAdminPage({
  searchParams,
}: DailyBriefsAdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const programme = parseProgramme(resolvedSearchParams.programme);
  const status = parseStatus(resolvedSearchParams.status);
  const history = await listDailyBriefHistory({ programme, status });

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
            Daily briefs
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">
            Review every recorded generation run in one place.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            This history stays read-only for now. Once the generation pipeline
            starts writing real records, this tab becomes the source of truth
            for what was generated, which sources were used, and which model
            produced each brief.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Programme
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={buildFilterHref({ status })}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  !programme
                    ? "border-[#0f172a] bg-[#0f172a] text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                All
              </Link>
              {IB_PROGRAMMES.map((programmeOption) => (
                <Link
                  key={programmeOption}
                  href={buildFilterHref({
                    programme: programmeOption,
                    status,
                  })}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    programme === programmeOption
                      ? "border-[#0f172a] bg-[#0f172a] text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {programmeOption}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Status
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={buildFilterHref({ programme })}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  !status
                    ? "border-[#0f172a] bg-[#0f172a] text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                All
              </Link>
              {DAILY_BRIEF_STATUSES.map((statusOption) => (
                <Link
                  key={statusOption}
                  href={buildFilterHref({
                    programme,
                    status: statusOption,
                  })}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium capitalize ${
                    status === statusOption
                      ? "border-[#0f172a] bg-[#0f172a] text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {statusOption}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
          <h3 className="text-xl font-bold tracking-tight text-[#0f172a]">
            No daily briefs recorded yet
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Generation history will appear here as soon as the brief pipeline
            writes real records into the admin store. Until then, this tab stays
            intentionally empty so the team sees the true operational state.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {history.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {entry.programme}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {entry.status}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {entry.repetitionRisk} repetition risk
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-bold tracking-tight text-[#0f172a]">
                    {entry.headline}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {entry.summary}
                  </p>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  <p className="font-semibold text-[#0f172a]">
                    {formatDate(entry.scheduledFor)}
                  </p>
                  <p className="mt-1">{entry.aiConnectionName}</p>
                  <p>{entry.aiModel}</p>
                  <p>{entry.promptVersionLabel}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-slate-500">
                  <span className="font-semibold text-[#0f172a]">
                    Primary sources:
                  </span>{" "}
                  {entry.sourceReferences.length > 0
                    ? entry.sourceReferences
                        .map((reference) => reference.sourceName)
                        .join(", ")
                    : "No sources recorded"}
                </div>

                <Link
                  href={`/admin/editorial/daily-briefs/${entry.id}`}
                  className="inline-flex items-center justify-center rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
                >
                  Open brief record
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
