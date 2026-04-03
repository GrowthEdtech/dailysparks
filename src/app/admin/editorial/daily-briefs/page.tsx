import Link from "next/link";

import {
  DAILY_BRIEF_EDITORIAL_COHORTS,
  isDailyBriefEditorialCohort,
  type DailyBriefEditorialCohort,
} from "../../../../lib/daily-brief-cohorts";
import { listDailyBriefHistory } from "../../../../lib/daily-brief-history-store";
import { getDailyBriefBusinessDate } from "../../../../lib/daily-brief-run-date";
import {
  DAILY_BRIEF_RECORD_KINDS,
  DAILY_BRIEF_STATUSES,
  type DailyBriefRecordKind,
  type DailyBriefStatus,
} from "../../../../lib/daily-brief-history-schema";
import { listParentProfiles } from "../../../../lib/mvp-store";
import {
  IB_PROGRAMMES,
  isProgramme,
  type Programme,
} from "../../../../lib/mvp-types";
import {
  formatEditorialCohortLabel,
  formatRecordKindLabel,
  formatPipelineStageLabel,
  getDeliverySummaryLabel,
  getEditorialCohortBadgeClasses,
  getPipelineStageBadgeClasses,
  getRecordKindBadgeClasses,
  getRetryWindowLabel,
} from "./daily-brief-admin-helpers";
import { buildDailyBriefOpsSummary } from "./daily-brief-ops-summary";
import ManualTestRunPanel from "./manual-test-run-panel";

type DailyBriefsAdminPageProps = {
  searchParams: Promise<{
    kind?: string;
    programme?: string;
    status?: string;
    cohort?: string;
  }>;
};

const ACTIVE_FILTER_CHIP_CLASSES =
  "border-[#0f172a] bg-[#0f172a] text-white";
const INACTIVE_FILTER_CHIP_CLASSES =
  "border-slate-200 bg-white text-slate-800 hover:bg-slate-100";

function parseProgramme(value: string | undefined): Programme | undefined {
  return value && isProgramme(value) ? value : undefined;
}

function parseStatus(value: string | undefined): DailyBriefStatus | undefined {
  return value &&
    DAILY_BRIEF_STATUSES.includes(value as DailyBriefStatus)
    ? (value as DailyBriefStatus)
    : undefined;
}

function parseRecordKind(
  value: string | undefined,
): DailyBriefRecordKind | undefined {
  return value &&
    DAILY_BRIEF_RECORD_KINDS.includes(value as DailyBriefRecordKind)
    ? (value as DailyBriefRecordKind)
    : undefined;
}

function parseEditorialCohort(
  value: string | undefined,
): DailyBriefEditorialCohort | undefined {
  return value && isDailyBriefEditorialCohort(value) ? value : undefined;
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
  kind?: DailyBriefRecordKind;
  programme?: Programme;
  status?: DailyBriefStatus;
  cohort?: DailyBriefEditorialCohort;
}) {
  const nextSearchParams = new URLSearchParams();

  if (filters.kind) {
    nextSearchParams.set("kind", filters.kind);
  }

  if (filters.programme) {
    nextSearchParams.set("programme", filters.programme);
  }

  if (filters.status) {
    nextSearchParams.set("status", filters.status);
  }

  if (filters.cohort) {
    nextSearchParams.set("cohort", filters.cohort);
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
  const recordKind = parseRecordKind(resolvedSearchParams.kind) ?? "production";
  const programme = parseProgramme(resolvedSearchParams.programme);
  const status = parseStatus(resolvedSearchParams.status);
  const editorialCohort = parseEditorialCohort(resolvedSearchParams.cohort);
  const [history, productionHistoryForToday, profiles] = await Promise.all([
    listDailyBriefHistory({ programme, editorialCohort, recordKind, status }),
    listDailyBriefHistory({
      scheduledFor: getDailyBriefBusinessDate(),
      recordKind: "production",
    }),
    listParentProfiles(),
  ]);
  const opsSummary = buildDailyBriefOpsSummary({
    profiles,
    history: productionHistoryForToday,
    runDate: getDailyBriefBusinessDate(),
  });
  const hasOpsAlerts =
    opsSummary.briefsNeedingFollowUpCount > 0 ||
    opsSummary.skippedFamilyCount > 0 ||
    opsSummary.channelIssueCount > 0;

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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

        <div className="flex flex-col gap-4 md:w-full md:max-w-[19rem]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Record type
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAILY_BRIEF_RECORD_KINDS.map((kindOption) => (
                <Link
                  key={kindOption}
                  href={buildFilterHref({
                    kind: kindOption,
                    programme,
                    status,
                    cohort: editorialCohort,
                  })}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    recordKind === kindOption
                      ? ACTIVE_FILTER_CHIP_CLASSES
                      : INACTIVE_FILTER_CHIP_CLASSES
                  }`}
                >
                  {formatRecordKindLabel(kindOption)}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Programme
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={buildFilterHref({
                  kind: recordKind,
                  status,
                  cohort: editorialCohort,
                })}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  !programme
                    ? ACTIVE_FILTER_CHIP_CLASSES
                    : INACTIVE_FILTER_CHIP_CLASSES
                }`}
              >
                All
              </Link>
              {IB_PROGRAMMES.map((programmeOption) => (
                <Link
                  key={programmeOption}
                  href={buildFilterHref({
                    kind: recordKind,
                    programme: programmeOption,
                    status,
                    cohort: editorialCohort,
                  })}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    programme === programmeOption
                      ? ACTIVE_FILTER_CHIP_CLASSES
                      : INACTIVE_FILTER_CHIP_CLASSES
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
                href={buildFilterHref({
                  kind: recordKind,
                  programme,
                  cohort: editorialCohort,
                })}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  !status
                    ? ACTIVE_FILTER_CHIP_CLASSES
                    : INACTIVE_FILTER_CHIP_CLASSES
                }`}
              >
                All
              </Link>
              {DAILY_BRIEF_STATUSES.map((statusOption) => (
                <Link
                  key={statusOption}
                  href={buildFilterHref({
                    kind: recordKind,
                    programme,
                    status: statusOption,
                    cohort: editorialCohort,
                  })}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium capitalize ${
                    status === statusOption
                      ? ACTIVE_FILTER_CHIP_CLASSES
                      : INACTIVE_FILTER_CHIP_CLASSES
                  }`}
                >
                  {statusOption}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Cohort
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={buildFilterHref({
                  kind: recordKind,
                  programme,
                  status,
                })}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  !editorialCohort
                    ? ACTIVE_FILTER_CHIP_CLASSES
                    : INACTIVE_FILTER_CHIP_CLASSES
                }`}
              >
                All
              </Link>
              {DAILY_BRIEF_EDITORIAL_COHORTS.map((cohortOption) => (
                <Link
                  key={cohortOption}
                  href={buildFilterHref({
                    kind: recordKind,
                    programme,
                    status,
                    cohort: cohortOption,
                  })}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    editorialCohort === cohortOption
                      ? ACTIVE_FILTER_CHIP_CLASSES
                      : INACTIVE_FILTER_CHIP_CLASSES
                  }`}
                >
                  {formatEditorialCohortLabel(cohortOption)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ManualTestRunPanel />

      <section className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b45309]">
              Operations
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#0f172a]">
              Today&apos;s ops summary
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review delivery health, verification gaps, skipped families, and
              briefs that still need operator follow-up for{" "}
              <span className="font-semibold text-slate-700">
                {formatDate(opsSummary.runDate)}
              </span>
              .
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500 lg:min-w-[14rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Run date
            </p>
            <p className="mt-2 font-semibold text-[#0f172a]">
              {formatDate(opsSummary.runDate)}
            </p>
          </div>
        </div>

        <div
          className={`mt-5 rounded-[24px] border px-4 py-4 ${
            hasOpsAlerts
              ? "border-amber-200 bg-amber-50/80"
              : "border-emerald-200 bg-emerald-50/80"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-[0.18em] ${
              hasOpsAlerts ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {hasOpsAlerts ? "Attention required today" : "No operational alerts"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {hasOpsAlerts
              ? `Review ${opsSummary.briefsNeedingFollowUpCount} brief(s) needing follow-up, ${opsSummary.skippedFamilyCount} skipped family account(s), and ${opsSummary.channelIssueCount} channel issue(s) before the next delivery window.`
              : "Today's production run is currently healthy. No skipped families or unhealthy channels need operator follow-up."}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Published briefs",
              value: opsSummary.publishedBriefCount,
              valueClassName: "text-[#0f172a]",
            },
            {
              label: "Need follow-up",
              value: opsSummary.briefsNeedingFollowUpCount,
              valueClassName:
                opsSummary.briefsNeedingFollowUpCount > 0
                  ? "text-amber-700"
                  : "text-[#0f172a]",
            },
            {
              label: "Delivered families",
              value: opsSummary.deliveredFamilyCount,
              valueClassName:
                opsSummary.deliveredFamilyCount > 0
                  ? "text-emerald-700"
                  : "text-[#0f172a]",
            },
            {
              label: "Skipped families",
              value: opsSummary.skippedFamilyCount,
              valueClassName:
                opsSummary.skippedFamilyCount > 0
                  ? "text-rose-700"
                  : "text-[#0f172a]",
            },
            {
              label: "Channel issues",
              value: opsSummary.channelIssueCount,
              valueClassName:
                opsSummary.channelIssueCount > 0
                  ? "text-rose-700"
                  : "text-[#0f172a]",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {card.label}
              </p>
              <p
                className={`mt-2 text-3xl font-bold tracking-tight ${card.valueClassName}`}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Healthy families",
              value: opsSummary.healthyFamilyCount,
              valueClassName: "text-emerald-700",
            },
            {
              label: "Verification needed",
              value: opsSummary.verificationNeededCount,
              valueClassName:
                opsSummary.verificationNeededCount > 0
                  ? "text-amber-700"
                  : "text-slate-700",
            },
            {
              label: "Needs attention",
              value: opsSummary.attentionFamilyCount,
              valueClassName:
                opsSummary.attentionFamilyCount > 0
                  ? "text-rose-700"
                  : "text-slate-700",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {card.label}
              </p>
              <p
                className={`mt-2 text-2xl font-bold tracking-tight ${card.valueClassName}`}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <article className="rounded-[24px] border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Skipped families
            </h4>
            {opsSummary.skippedFamilies.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                No families are currently skipped for today&apos;s production run.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {opsSummary.skippedFamilies.map((family) => (
                  <div
                    key={`${family.parentId}-${family.programme}`}
                    className="rounded-[20px] border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="text-sm font-semibold text-[#0f172a]">
                      {family.parentEmail}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {family.programme} · {family.studentName}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Local delivery window
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {family.localDeliveryWindow}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {family.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Channel watchlist
            </h4>
            {opsSummary.channelWatchlist.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                No family channels currently need verification or operator
                attention.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {opsSummary.channelWatchlist.map((family) => (
                  <div
                    key={`${family.parentId}-${family.parentEmail}`}
                    className="rounded-[20px] border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="text-sm font-semibold text-[#0f172a]">
                      {family.parentEmail}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {family.studentName}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Local delivery window
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {family.localDeliveryWindow}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {family.issues.map((issue) => (
                        <span
                          key={issue}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Briefs needing follow-up
            </h4>
            {opsSummary.briefsNeedingFollowUp.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                No published or in-flight briefs currently require operator
                follow-up.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {opsSummary.briefsNeedingFollowUp.map((brief) => (
                  <div
                    key={brief.id}
                    className="rounded-[20px] border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="text-sm font-semibold text-[#0f172a]">
                      {brief.headline}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {brief.programme} · {brief.status} ·{" "}
                      {formatPipelineStageLabel(brief.pipelineStage)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {brief.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>

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
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getEditorialCohortBadgeClasses(entry.editorialCohort)}`}
                    >
                      {formatEditorialCohortLabel(entry.editorialCohort)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getRecordKindBadgeClasses(entry.recordKind)}`}
                    >
                      {formatRecordKindLabel(entry.recordKind)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getPipelineStageBadgeClasses(entry.pipelineStage)}`}
                    >
                      {formatPipelineStageLabel(entry.pipelineStage)}
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
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Pipeline
                  </p>
                  <p className="mt-1 font-semibold text-[#0f172a]">
                    {formatPipelineStageLabel(entry.pipelineStage)}
                  </p>
                  <p className="mt-1">
                    {formatEditorialCohortLabel(entry.editorialCohort)} edition
                  </p>
                  <p className="mt-1">{entry.aiConnectionName}</p>
                  <p>{entry.aiModel}</p>
                  <p>{entry.promptVersionLabel}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2 text-sm text-slate-500">
                  <p>
                    <span className="font-semibold text-[#0f172a]">
                      Primary sources:
                    </span>{" "}
                    {entry.sourceReferences.length > 0
                      ? entry.sourceReferences
                          .map((reference) => reference.sourceName)
                          .join(", ")
                      : "No sources recorded"}
                  </p>
                  <p>
                    <span className="font-semibold text-[#0f172a]">
                      Delivery:
                    </span>{" "}
                    {getDeliverySummaryLabel(entry)}
                  </p>
                  {entry.retryEligibleUntil ? (
                    <p>
                      <span className="font-semibold text-[#0f172a]">
                        Retry window:
                      </span>{" "}
                      {getRetryWindowLabel(entry)}
                    </p>
                  ) : null}
                  {entry.failureReason ? (
                    <p className="text-rose-700">
                      <span className="font-semibold text-rose-800">
                        Failure reason:
                      </span>{" "}
                      {entry.failureReason}
                    </p>
                  ) : null}
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
