"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { trackMarketingEvent } from "../../lib/marketing-analytics";

type StarterKitFormState = {
  fullName: string;
  email: string;
  childStageInterest: "MYP" | "DP" | "NOT_SURE";
};

type CaptureResponse = {
  deliveryStatus: "sent" | "failed" | "skipped";
  message: string;
};

const INITIAL_STATE: StarterKitFormState = {
  fullName: "",
  email: "",
  childStageInterest: "NOT_SURE",
};

function normalizeUtm(value: string | null) {
  return value?.trim() || null;
}

function getDeliveryStatusFromResponse(
  body:
    | (CaptureResponse & { message?: string })
    | { message?: string }
    | null,
): CaptureResponse["deliveryStatus"] {
  if (!body || !("deliveryStatus" in body)) {
    return "skipped";
  }

  return body.deliveryStatus === "sent" ||
    body.deliveryStatus === "failed" ||
    body.deliveryStatus === "skipped"
    ? body.deliveryStatus
    : "skipped";
}

export default function StarterKitForm() {
  const [formState, setFormState] = useState<StarterKitFormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState<CaptureResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setSearchQuery(window.location.search);
  }, []);

  const normalizedSearchParams = useMemo(
    () => new URLSearchParams(searchQuery),
    [searchQuery],
  );

  const utmPayload = useMemo(
    () => ({
      utmSource: normalizeUtm(normalizedSearchParams.get("utm_source")),
      utmMedium: normalizeUtm(normalizedSearchParams.get("utm_medium")),
      utmCampaign: normalizeUtm(normalizedSearchParams.get("utm_campaign")),
      utmContent: normalizeUtm(normalizedSearchParams.get("utm_content")),
      utmTerm: normalizeUtm(normalizedSearchParams.get("utm_term")),
      referralToken: normalizeUtm(normalizedSearchParams.get("ref")),
    }),
    [normalizedSearchParams],
  );

  useEffect(() => {
    trackMarketingEvent("starter_kit_viewed", {
      page_path: "/ib-parent-starter-kit",
      utm_source: utmPayload.utmSource,
      utm_medium: utmPayload.utmMedium,
      utm_campaign: utmPayload.utmCampaign,
      referred: Boolean(utmPayload.referralToken),
    });
  }, [utmPayload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/marketing/leads", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...formState,
          source: "ib-parent-starter-kit",
          pagePath: "/ib-parent-starter-kit",
          referrerUrl: document.referrer || null,
          ...utmPayload,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | (CaptureResponse & { message?: string })
        | { message?: string }
        | null;

      if (!response.ok) {
        setErrorMessage(body?.message ?? "We could not save your starter kit request.");
        return;
      }

      const nextSuccess = {
        deliveryStatus: getDeliveryStatusFromResponse(body),
        message: body?.message ?? "Your starter kit is ready.",
      } satisfies CaptureResponse;

      setSuccess(nextSuccess);
      setFormState(INITIAL_STATE);
      trackMarketingEvent("starter_kit_submitted", {
        stage_interest: formState.childStageInterest,
        delivery_status: nextSuccess.deliveryStatus,
        referred: Boolean(utmPayload.referralToken),
      });

      if (utmPayload.referralToken) {
        trackMarketingEvent("starter_kit_referred_submitted", {
          stage_interest: formState.childStageInterest,
          delivery_status: nextSuccess.deliveryStatus,
        });
      }

      if (nextSuccess.deliveryStatus === "sent") {
        trackMarketingEvent("starter_kit_delivered", {
          channel: "email",
          referred: Boolean(utmPayload.referralToken),
        });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "We could not save your starter kit request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-6 shadow-[0_32px_80px_-52px_rgba(15,23,42,0.32)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f59e0b]">
        Get the starter kit
      </p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-[#0f172a]">
        We will send the IB Parent Starter Kit to your inbox.
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Start here if you are still comparing the MYP and DP path, or if you want
        a calmer first step before starting the 7-day trial.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Parent name</span>
          <input
            required
            value={formState.fullName}
            onChange={(event) =>
              setFormState((current) => ({ ...current, fullName: event.target.value }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
            placeholder="Your name"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Parent email</span>
          <input
            required
            type="email"
            value={formState.email}
            onChange={(event) =>
              setFormState((current) => ({ ...current, email: event.target.value }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
            placeholder="you@example.com"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Which stage are you comparing?</span>
          <select
            value={formState.childStageInterest}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                childStageInterest: event.target.value as StarterKitFormState["childStageInterest"],
              }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
          >
            <option value="NOT_SURE">Not sure yet</option>
            <option value="MYP">Mostly MYP</option>
            <option value="DP">Mostly DP</option>
          </select>
        </label>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-700">
              Starter kit saved
            </p>
            <p className="mt-2 text-sm leading-7 text-emerald-900">{success.message}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-[#0f172a] px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white"
              >
                Start 7-day trial
              </Link>
              <Link
                href="/myp-vs-dp-reading-model"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[#0f172a]"
              >
                Compare MYP and DP
              </Link>
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-full bg-[#fbbf24] px-6 py-4 text-sm font-bold uppercase tracking-[0.22em] text-[#0f172a] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending starter kit..." : "Send the starter kit"}
        </button>
      </form>
    </div>
  );
}
