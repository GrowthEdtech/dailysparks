"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Loader2, PencilLine, Send, Unplug } from "lucide-react";

import type { ParentProfile } from "../lib/mvp-types";
import {
  GOODNOTES_EMAIL_SUFFIX,
  getGoodnotesLocalPart,
} from "../lib/goodnotes-address";

type GoodnotesDeliveryCardProps = {
  initialProfile: ParentProfile;
};

type GoodnotesRouteMessage = {
  message?: string;
  student?: ParentProfile["student"];
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function GoodnotesDeliveryCard({
  initialProfile,
}: GoodnotesDeliveryCardProps) {
  const router = useRouter();
  const [student, setStudent] = useState(initialProfile.student);
  const [draftLocalPart, setDraftLocalPart] = useState(
    getGoodnotesLocalPart(initialProfile.student.goodnotesEmail),
  );
  const [isEditing, setIsEditing] = useState(!initialProfile.student.goodnotesEmail);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasEmail = Boolean(student.goodnotesEmail);
  const isConnected = student.goodnotesConnected;
  const showCancelAction = hasEmail;
  const verifiedAt = formatTimestamp(student.goodnotesVerifiedAt);
  const lastTestAt = formatTimestamp(student.goodnotesLastTestSentAt);
  const statusLabel = isConnected ? "Connected" : hasEmail ? "Saved" : "Not set";
  const helperMessage = useMemo(() => {
    if (successMessage) {
      return successMessage;
    }

    if (errorMessage) {
      return errorMessage;
    }

    if (student.goodnotesLastDeliveryMessage) {
      return student.goodnotesLastDeliveryMessage;
    }

    if (isConnected) {
      return "Daily Sparks is ready to use this destination for student note delivery.";
    }

    if (hasEmail) {
      return "Your Goodnotes destination is saved and waiting for a live test brief before regular delivery starts.";
    }

    return "Add the name your child uses before @goodnotes.email. You can test, update, or remove this destination anytime.";
  }, [
    errorMessage,
    hasEmail,
    isConnected,
    student.goodnotesLastDeliveryMessage,
    successMessage,
  ]);

  function applyStudent(studentRecord: ParentProfile["student"]) {
    setStudent(studentRecord);
    setDraftLocalPart(getGoodnotesLocalPart(studentRecord.goodnotesEmail));
    setIsEditing(!studentRecord.goodnotesEmail);
  }

  async function saveDestination() {
    const nextLocalPart = draftLocalPart.trim().toLowerCase();

    setErrorMessage("");
    setSuccessMessage("");

    if (!nextLocalPart) {
      setErrorMessage("Please enter the name before @goodnotes.email.");
      return;
    }

    setIsWorking(true);

    try {
      const response = await fetch("/api/goodnotes", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          goodnotesEmail: nextLocalPart,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | GoodnotesRouteMessage
        | null;

      if (!response.ok || !body?.student) {
        setErrorMessage(
          body?.message ?? "We could not save your Goodnotes destination.",
        );
        setIsWorking(false);
        return;
      }

      applyStudent(body.student);
      setSuccessMessage(body.message ?? "Goodnotes destination saved.");
      setIsWorking(false);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErrorMessage("We could not save your Goodnotes destination right now.");
      setIsWorking(false);
    }
  }

  async function sendTestBrief() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsWorking(true);

    try {
      const response = await fetch("/api/goodnotes/test", {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | GoodnotesRouteMessage
        | null;

      if (!response.ok || !body?.student) {
        if (body?.student) {
          applyStudent(body.student);
        }

        setErrorMessage(body?.message ?? "We could not run the Goodnotes test brief.");
        setIsWorking(false);
        return;
      }

      applyStudent(body.student);
      setSuccessMessage(
        body.message ?? "Goodnotes test brief recorded for this destination.",
      );
      setIsWorking(false);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErrorMessage("We could not run the Goodnotes test brief.");
      setIsWorking(false);
    }
  }

  async function disconnect() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsWorking(true);

    try {
      const response = await fetch("/api/goodnotes", {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => null)) as
        | GoodnotesRouteMessage
        | null;

      if (!response.ok || !body?.student) {
        setErrorMessage(body?.message ?? "We could not remove Goodnotes delivery.");
        setIsWorking(false);
        return;
      }

      applyStudent(body.student);
      setSuccessMessage(body.message ?? "Goodnotes delivery removed.");
      setIsWorking(false);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErrorMessage("We could not remove Goodnotes delivery.");
      setIsWorking(false);
    }
  }

  function cancelEditing() {
    setDraftLocalPart(getGoodnotesLocalPart(student.goodnotesEmail));
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditing(!student.goodnotesEmail);
  }

  return (
    <div className="rounded-3xl border border-[#00b5d6]/20 bg-gradient-to-br from-[#f0fbff] to-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Image
          src="/integrations/goodnotes.jpeg"
          alt="Goodnotes"
          width={28}
          height={28}
          className="mt-1.5 h-7 w-7 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-[#0f172a]">Goodnotes delivery</h3>
          <p className="mt-1 text-sm text-slate-500">
            Send each reading brief into the student&apos;s note-taking flow.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isConnected
                ? "bg-[#eefbf3] text-[#15803d]"
                : hasEmail
                  ? "bg-[#fff7dd] text-[#b45309]"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <p
          className={`mt-3 text-xs leading-5 ${
            errorMessage ? "text-rose-600" : "text-slate-500"
          }`}
        >
          {helperMessage}
        </p>

        {isEditing ? (
          <div className="mt-4 rounded-2xl border border-[#00b5d6]/15 bg-slate-50 px-4 py-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Goodnotes destination
              </span>
              <div className="flex overflow-hidden rounded-xl border border-[#00b5d6]/20 bg-white focus-within:border-[#00b5d6]">
                <input
                  type="text"
                  placeholder="katherine"
                  className="min-w-0 flex-1 bg-white px-4 py-3 text-sm text-slate-700 outline-none"
                  value={draftLocalPart}
                  onChange={(event) => setDraftLocalPart(event.target.value)}
                />
                <span className="flex shrink-0 items-center border-l border-[#00b5d6]/15 bg-slate-50 px-4 text-sm font-medium text-slate-500">
                  {GOODNOTES_EMAIL_SUFFIX}
                </span>
              </div>
            </label>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Daily Sparks will always deliver to this fixed Goodnotes suffix.
            </p>
            <div
              className={`mt-4 flex flex-wrap gap-2 ${
                showCancelAction ? "justify-start" : "justify-center"
              }`}
            >
              <button
                type="button"
                onClick={() => void saveDestination()}
                disabled={isWorking || isPending}
                className="inline-flex min-w-[17rem] items-center justify-center gap-2 rounded-full bg-[#0f172a] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isWorking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Save destination
              </button>
              {showCancelAction ? (
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isWorking || isPending}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="rounded-2xl border border-white bg-white/80 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <p className="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
                Destination name
              </p>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0f172a]">
                    {getGoodnotesLocalPart(student.goodnotesEmail)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {isConnected ? "Ready" : "Pending"}
                </span>
              </div>
            </div>

            {verifiedAt || lastTestAt ? (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {verifiedAt ? (
                  <div className="rounded-xl bg-white px-4 py-3">
                    <dt className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
                      Verified on
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-[#0f172a]">
                      {verifiedAt}
                    </dd>
                  </div>
                ) : null}
                {lastTestAt ? (
                  <div className="rounded-xl bg-white px-4 py-3">
                    <dt className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
                      Last test brief
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-[#0f172a]">
                      {lastTestAt}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void sendTestBrief()}
                disabled={isWorking || isPending}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0f172a] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
              >
                {isWorking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isConnected ? "Send another test brief" : "Send test brief"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                disabled={isWorking || isPending}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PencilLine className="h-4 w-4" />
                Update email
              </button>
              <button
                type="button"
                onClick={() => void disconnect()}
                disabled={isWorking || isPending}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
