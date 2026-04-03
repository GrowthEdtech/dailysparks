"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookOpen, CreditCard, Save, Send } from "lucide-react";

import AccountMenu from "../../components/account-menu";
import GoodnotesDeliveryCard from "../../components/goodnotes-delivery-card";
import NotionSyncCard from "../../components/notion-sync-card";
import { getBillingSummary } from "../../lib/billing";
import {
  getDefaultProgrammeYear,
  type ParentProfile,
  type Programme,
} from "../../lib/mvp-types";
import { getProgrammeStageSummary, getWeeklyPlan } from "../../lib/weekly-plan";

type DashboardFormProps = {
  initialProfile: ParentProfile;
  notionConfigured: boolean;
};

type RouteMessage = {
  message?: string;
  student?: ParentProfile["student"];
};

function hasMeaningfulStudentName(studentName: string) {
  const normalizedStudentName = studentName.trim();

  return (
    normalizedStudentName.length > 0 &&
    normalizedStudentName.toLowerCase() !== "student"
  );
}

export function shouldShowStudentNameSetupCard(persistedStudentName: string) {
  return !hasMeaningfulStudentName(persistedStudentName);
}

export default function DashboardForm({
  initialProfile,
  notionConfigured,
}: DashboardFormProps) {
  const router = useRouter();
  const [studentName, setStudentName] = useState(initialProfile.student.studentName);
  const [programme, setProgramme] = useState(initialProfile.student.programme);
  const [programmeYear, setProgrammeYear] = useState(
    initialProfile.student.programmeYear,
  );
  const [showStudentNameSetupCard, setShowStudentNameSetupCard] = useState(
    shouldShowStudentNameSetupCard(initialProfile.student.studentName),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const billingSummary = getBillingSummary(initialProfile.parent);
  const weeklyPlan = getWeeklyPlan(programme, programmeYear);
  const programmeStageSummary = getProgrammeStageSummary(programme);
  const stageLabel = programme;
  const hasStudentName = hasMeaningfulStudentName(studentName);
  const displayStudentName = hasStudentName ? studentName.trim() : "Your child";

  function handleProgrammeChange(nextProgramme: Programme) {
    setSuccessMessage("");
    setErrorMessage("");
    setProgramme(nextProgramme);
    setProgrammeYear(getDefaultProgrammeYear(nextProgramme));
  }

  async function handleSave() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          studentName,
          programme,
          programmeYear,
        }),
      });

      const body = (await response.json().catch(() => null)) as RouteMessage | null;

      if (!response.ok) {
        setErrorMessage(body?.message ?? "We could not save your preferences.");
        setIsSaving(false);
        return;
      }

      if (body?.student) {
        setStudentName(body.student.studentName);
        setProgramme(body.student.programme);
        setProgrammeYear(body.student.programmeYear);
        setShowStudentNameSetupCard(
          shouldShowStudentNameSetupCard(body.student.studentName),
        );
      }

      setSuccessMessage("Preferences saved.");
      setIsSaving(false);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErrorMessage("We could not reach the local API. Please try again.");
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <header className="w-full rounded-b-[32px] bg-[#0f172a] px-6 py-6 text-white shadow-md">
        <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-4 sm:items-center sm:gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#fbbf24]">
              Parent dashboard
            </p>
            <h1 className="mt-2 text-2xl font-bold">
              {displayStudentName}&apos;s reading profile
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Logged in as {initialProfile.parent.email}
            </p>
          </div>
          <AccountMenu
            fullName={initialProfile.parent.fullName}
            email={initialProfile.parent.email}
          />
        </div>
      </header>

      <main className="mx-auto mt-6 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] lg:items-start">
          <div className="order-2 space-y-6 lg:order-1">
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:p-7">
              <div className="mb-4 flex items-center gap-2">
                <Send className="h-5 w-5 text-[#0f172a]" />
                <h2 className="text-lg font-bold text-[#0f172a]">Delivery channels</h2>
              </div>
              <p className="text-sm leading-6 text-slate-500">
                Connect the tools your family already uses. Goodnotes is live in this
                MVP flow, and Notion is positioned as the next integration layer.
              </p>

              <div className="mt-5 space-y-4">
                <GoodnotesDeliveryCard initialProfile={initialProfile} />

                <NotionSyncCard
                  initialProfile={initialProfile}
                  notionConfigured={notionConfigured}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:p-7">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#0f172a]" />
                <h2 className="text-lg font-bold text-[#0f172a]">Weekly reading plan</h2>
              </div>
              <p className="text-sm font-semibold text-slate-700">{weeklyPlan.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {weeklyPlan.description}
              </p>

              <div className="mt-5 grid gap-3 xl:grid-cols-2">
                {weeklyPlan.weekdays.map((entry) => (
                  <div
                    key={entry.day}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          {entry.day}
                        </p>
                        <p className="mt-2 text-sm font-bold text-[#0f172a]">
                          {entry.label}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                        {stageLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      {entry.theme}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{entry.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-[#fbbf24]/40 bg-[#fef3c7]/40 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
                  {weeklyPlan.sunday.label}
                </p>
                <p className="mt-2 text-sm font-bold text-[#0f172a]">
                  {weeklyPlan.sunday.theme}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {weeklyPlan.sunday.note}
                </p>
              </div>
            </section>
          </div>

          <div className="order-1 space-y-6 lg:order-2">
            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:p-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-500">Current plan</h2>
                <p className="mt-1 text-lg font-bold text-[#0f172a]">
                  {billingSummary.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">{billingSummary.subtitle}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-slate-600">
                    {billingSummary.statusLabel}
                  </span>
                  <span className="rounded-full bg-[#fff7dd] px-3 py-1 text-xs font-semibold text-[#b45309]">
                    {stageLabel}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {billingSummary.detail}
                </p>
                {billingSummary.summaryRows.length > 0 ? (
                  <dl className="mt-4 grid gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                    {billingSummary.summaryRows.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <dt className="text-slate-500">{row.label}</dt>
                        <dd className="text-right font-semibold text-[#0f172a]">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>

              <div className="mt-4 flex justify-center lg:justify-start">
                <Link
                  href="/billing"
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-[#0f172a] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1e293b]"
                >
                  <CreditCard className="h-4 w-4" />
                  Manage subscription
                </Link>
              </div>
            </section>

            {showStudentNameSetupCard ? (
              <section className="rounded-3xl border border-[#fbbf24]/30 bg-[#fff7dd] p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
                  One last setup detail
                </p>
                <h2 className="mt-2 text-xl font-bold text-[#0f172a]">
                  Add your child&apos;s first name
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  We use it across reading briefs, weekly plans, and delivery notes.
                </p>

                <label className="mt-4 flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Child name
                  </span>
                  <input
                    className="rounded-2xl border border-[#fbbf24]/30 bg-white px-4 py-3 text-base text-[#0f172a] placeholder:text-slate-300 caret-[#0f172a] outline-none transition focus:border-[#f59e0b]"
                    type="text"
                    value={studentName === "Student" ? "" : studentName}
                    onChange={(event) => setStudentName(event.target.value)}
                    placeholder="Katherine"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    isSaving ||
                    isPending ||
                    !hasMeaningfulStudentName(studentName)
                  }
                  className="mx-auto mt-4 flex w-fit items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60 lg:mx-0"
                >
                  <Save className="h-4 w-4" />
                  {isSaving || isPending ? "Saving..." : "Save child name"}
                </button>
              </section>
            ) : null}

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#0f172a]">Learning stage</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose your child&apos;s current IB programme. Daily Sparks will adapt
                the weekly reading mode automatically.
              </p>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Programme
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["PYP", "MYP", "DP"] as const).map((option) => {
                    const active = programme === option;
                    const optionSummary = getProgrammeStageSummary(option);

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleProgrammeChange(option)}
                        className={`flex w-full flex-col items-center rounded-2xl border px-3 py-3 text-sm transition ${
                          active
                            ? "border-[#0f172a] bg-[#0f172a] text-white shadow-md shadow-[#0f172a]/20"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-base font-bold">{option}</span>
                        <span
                          className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            active ? "text-slate-200" : "text-slate-400"
                          }`}
                        >
                          {optionSummary.selectorLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {programmeStageSummary.badgeLabel}
                </p>
                <p className="mt-2 text-sm font-bold text-[#0f172a]">
                  {programmeStageSummary.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {programmeStageSummary.description}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Dashboard actions
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Save any updates to your child&apos;s programme or onboarding setup.
              </p>

              {errorMessage ? (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </p>
              ) : null}

              {successMessage ? (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isPending}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fbbf24] px-5 py-4 text-lg font-bold text-[#0f172a] shadow-lg shadow-[#fbbf24]/30 transition hover:bg-[#f59e0b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-5 w-5" />
                {isSaving || isPending ? "Saving..." : "Save preferences"}
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
