"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BookOpen, CreditCard, Save, Send } from "lucide-react";

import LogoutButton from "../../components/logout-button";
import { getBillingSummary } from "../../lib/billing";
import {
  getDefaultProgrammeYear,
  getProgrammeYearOptions,
  isValidProgrammeYear,
  type ParentProfile,
  type Programme,
} from "../../lib/mvp-types";
import { getWeeklyPlan } from "../../lib/weekly-plan";

type DashboardFormProps = {
  initialProfile: ParentProfile;
};

type RouteMessage = {
  message?: string;
  student?: ParentProfile["student"];
};

function getInitials(fullName: string) {
  const pieces = fullName
    .split(" ")
    .map((piece) => piece.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (pieces.length === 0) {
    return "DS";
  }

  return pieces.map((piece) => piece[0]?.toUpperCase() ?? "").join("");
}

function hasMeaningfulStudentName(studentName: string) {
  const normalizedStudentName = studentName.trim();

  return (
    normalizedStudentName.length > 0 &&
    normalizedStudentName.toLowerCase() !== "student"
  );
}

export default function DashboardForm({ initialProfile }: DashboardFormProps) {
  const router = useRouter();
  const [studentName, setStudentName] = useState(initialProfile.student.studentName);
  const [programme, setProgramme] = useState(initialProfile.student.programme);
  const [programmeYear, setProgrammeYear] = useState(
    initialProfile.student.programmeYear,
  );
  const [goodnotesEmail, setGoodnotesEmail] = useState(
    initialProfile.student.goodnotesEmail,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const avatarInitials = useMemo(
    () => getInitials(initialProfile.parent.fullName),
    [initialProfile.parent.fullName],
  );

  const billingSummary = getBillingSummary(initialProfile.parent);
  const yearOptions = getProgrammeYearOptions(programme);
  const weeklyPlan = getWeeklyPlan(programme, programmeYear);
  const stageLabel = `${programme} Year ${programmeYear}`;
  const hasStudentName = hasMeaningfulStudentName(studentName);
  const displayStudentName = hasStudentName ? studentName.trim() : "Your child";

  function handleProgrammeChange(nextProgramme: Programme) {
    setSuccessMessage("");
    setErrorMessage("");
    setProgramme(nextProgramme);

    if (!isValidProgrammeYear(nextProgramme, programmeYear)) {
      setProgrammeYear(getDefaultProgrammeYear(nextProgramme));
    }
  }

  function handleProgrammeYearChange(nextYear: number) {
    setSuccessMessage("");
    setErrorMessage("");
    setProgrammeYear(nextYear);
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
          goodnotesEmail,
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
        setGoodnotesEmail(body.student.goodnotesEmail);
        setProgramme(body.student.programme);
        setProgrammeYear(body.student.programmeYear);
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
        <div className="mx-auto flex w-full max-w-md items-start justify-between gap-4">
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
          <div className="flex flex-col items-end gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fbbf24] font-bold text-[#0f172a]">
              {avatarInitials}
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 flex w-full max-w-md flex-col gap-6 px-4">
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div>
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
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/billing"
              className="inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1e293b]"
            >
              <CreditCard className="h-4 w-4" />
              Manage subscription
            </Link>
          </div>
        </section>

        {!hasStudentName ? (
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
                className="rounded-2xl border border-[#fbbf24]/30 bg-white px-4 py-3 text-base outline-none transition focus:border-[#f59e0b]"
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
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSaving || isPending ? "Saving..." : "Save child name"}
            </button>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Send className="h-5 w-5 text-[#0f172a]" />
            <h2 className="text-lg font-bold text-[#0f172a]">Delivery channels</h2>
          </div>
          <p className="text-sm leading-6 text-slate-500">
            Connect the tools your family already uses. Goodnotes is live in this
            MVP flow, and Notion is positioned as the next integration layer.
          </p>

          <div className="mt-5 space-y-4">
            <div className="rounded-3xl border border-[#00b5d6]/20 bg-gradient-to-br from-[#f0fbff] to-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Image
                  src="/integrations/goodnotes.jpeg"
                  alt="Goodnotes"
                  width={28}
                  height={28}
                  className="mt-1.5 h-7 w-7 shrink-0 rounded-md object-cover"
                />
                <div>
                  <h3 className="text-base font-bold text-[#0f172a]">Goodnotes delivery</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Send each reading brief into the student&apos;s note-taking flow.
                  </p>
                </div>
              </div>

              <label className="mt-4 flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  GoodNotes email address
                </span>
                <input
                  type="email"
                  placeholder="katherine@goodnotes.email"
                  className="w-full rounded-xl border border-[#00b5d6]/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00b5d6] focus:bg-white"
                  value={goodnotesEmail}
                  onChange={(event) => setGoodnotesEmail(event.target.value)}
                />
                <span className="text-xs leading-5 text-slate-500">
                  Optional for this MVP. If present, we validate and save it.
                </span>
              </label>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Image
                  src="/integrations/notion-symbol.svg"
                  alt="Notion"
                  width={22}
                  height={22}
                  className="mt-2 h-[22px] w-[22px] shrink-0 object-contain"
                />
                <div>
                  <h3 className="text-base font-bold text-[#0f172a]">Notion sync</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep an archive of reading briefs, prompts, and reflections.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4">
                <p className="text-sm font-semibold text-slate-700">
                  Planned next step
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  We&apos;ll connect saved briefs into a Notion database once the
                  parent workflow is fully validated.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#0f172a]">Learning stage</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Choose your child&apos;s current IB programme and year. Daily Sparks
            will generate the weekly reading rhythm automatically.
          </p>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Programme
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["PYP", "MYP", "DP"] as const).map((option) => {
                const active = programme === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleProgrammeChange(option)}
                    className={`rounded-xl border px-4 py-2 text-sm transition ${
                      active
                        ? "border-[#0f172a] bg-[#0f172a] font-medium text-white shadow-md shadow-[#0f172a]/20"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Year
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {yearOptions.map((option) => {
                const active = programmeYear === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleProgrammeYearChange(option)}
                    className={`rounded-xl border px-4 py-2 text-sm transition ${
                      active
                        ? "border-[#fbbf24] bg-[#fbbf24] font-bold text-[#0f172a] shadow-md shadow-[#fbbf24]/25"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {programme} {option}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#0f172a]" />
            <h2 className="text-lg font-bold text-[#0f172a]">Weekly reading plan</h2>
          </div>
          <p className="text-sm font-semibold text-slate-700">{weeklyPlan.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {weeklyPlan.description}
          </p>

          <div className="mt-5 space-y-3">
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

        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fbbf24] px-5 py-4 text-lg font-bold text-[#0f172a] shadow-lg shadow-[#fbbf24]/30 transition hover:bg-[#f59e0b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-5 w-5" />
          {isSaving || isPending ? "Saving..." : "Save preferences"}
        </button>
      </main>
    </div>
  );
}
