"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import AccountMenu from "../../../components/account-menu";
import { trackMarketingEvent } from "../../../lib/marketing-analytics";
import type { ParentProfile } from "../../../lib/mvp-types";
import {
  PRIMARY_SUCCESS_CTA_CLASSNAME,
  SUCCESS_HEADER_SHELL_CLASSNAME,
  SUCCESS_MAIN_SHELL_CLASSNAME,
  SUCCESS_PRIMARY_PANEL_CLASSNAME,
  SUCCESS_SECONDARY_PANEL_CLASSNAME,
  SECONDARY_SUCCESS_CTA_CLASSNAME,
} from "./success-panel.styles";

type FinalizeBillingResponse = {
  message?: string;
  parent?: ParentProfile["parent"];
};

type SuccessPanelProps = {
  accountEmail: string;
  accountFullName: string;
};

export default function SuccessPanel({
  accountEmail,
  accountFullName,
}: SuccessPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState("Confirming your Stripe checkout...");
  const [planLabel, setPlanLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const sessionPreview = searchParams.get("session_id")?.trim().slice(0, 18) ?? "";

  useEffect(() => {
    let isCancelled = false;

    async function finalizeCheckout() {
      const sessionId = searchParams.get("session_id")?.trim() ?? "";

      if (!sessionId) {
        setStatus("error");
        setMessage("We could not find a Stripe checkout session to confirm.");
        trackMarketingEvent("billing_finalize_failed", {
          location: "billing_success",
          reason: "missing_session",
        });
        return;
      }

      trackMarketingEvent("billing_finalize_started", {
        location: "billing_success",
      });

      try {
        const response = await fetch("/api/billing/finalize", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
          }),
        });

        const body = (await response.json().catch(() => null)) as FinalizeBillingResponse | null;

        if (!response.ok || !body?.parent) {
          if (!isCancelled) {
            setStatus("error");
            setMessage(
              body?.message ??
                "Stripe checkout returned, but Daily Sparks could not confirm it yet.",
            );
            trackMarketingEvent("billing_finalize_failed", {
              location: "billing_success",
              reason: "api_error",
            });
          }
          return;
        }

        if (!isCancelled) {
          setStatus("success");
          setPlanLabel(
            body.parent.subscriptionPlan === "yearly" ? "Yearly plan active" : "Monthly plan active",
          );
          setMessage("Stripe checkout is complete and your Daily Sparks billing is now active.");
          trackMarketingEvent("billing_finalize_success", {
            location: "billing_success",
            plan: body.parent.subscriptionPlan ?? "unknown",
          });

          startTransition(() => {
            router.refresh();
          });
        }
      } catch {
        if (!isCancelled) {
          setStatus("error");
          setMessage("We could not reach billing confirmation right now. Please try again.");
          trackMarketingEvent("billing_finalize_failed", {
            location: "billing_success",
            reason: "network_error",
          });
        }
      }
    }

    void finalizeCheckout();

    return () => {
      isCancelled = true;
    };
  }, [router, searchParams, startTransition]);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <header className="w-full rounded-b-[32px] bg-[#0f172a] px-6 py-6 text-white shadow-md">
        <div className={SUCCESS_HEADER_SHELL_CLASSNAME}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#fbbf24]">
              Billing
            </p>
            <h1 className="mt-2 text-2xl font-bold">Stripe checkout result</h1>
            <p className="mt-1 text-sm text-slate-300">
              We are confirming your Daily Sparks subscription on the server.
            </p>
          </div>
          <AccountMenu fullName={accountFullName} email={accountEmail} />
        </div>
      </header>

      <main className={SUCCESS_MAIN_SHELL_CLASSNAME}>
        <section className={SUCCESS_PRIMARY_PANEL_CLASSNAME}>
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Billing confirmation
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0f172a] md:text-[2rem]">
                {status === "success"
                  ? planLabel
                  : status === "error"
                    ? "We still need to finish billing setup"
                    : "Confirming your subscription"}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 md:text-[15px]">
                {message}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Activation state
                </p>
                <p className="mt-2 text-sm font-bold text-[#0f172a]">
                  {status === "success"
                    ? "Active"
                    : status === "error"
                      ? "Needs review"
                      : "Syncing"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Stripe session
                </p>
                <p className="mt-2 text-sm font-bold text-[#0f172a]">
                  {sessionPreview ? `${sessionPreview}...` : "Unavailable"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Next destination
                </p>
                <p className="mt-2 text-sm font-bold text-[#0f172a]">
                  {status === "success" ? "Dashboard" : "Billing workspace"}
                </p>
              </div>
            </div>

            <div className="mt-2 grid gap-3 md:max-w-2xl md:grid-cols-2">
              <Link
                href="/dashboard"
                className={`${PRIMARY_SUCCESS_CTA_CLASSNAME} w-full`}
              >
                Go to dashboard
              </Link>
              <Link
                href="/billing"
                className={`${SECONDARY_SUCCESS_CTA_CLASSNAME} w-full`}
              >
                Back to billing
              </Link>
            </div>

            {isPending ? (
              <p className="text-xs text-slate-400">
                Refreshing parent billing state...
              </p>
            ) : null}
          </div>
        </section>

        <aside className={SUCCESS_SECONDARY_PANEL_CLASSNAME}>
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Subscription summary
              </p>
              <p className="mt-3 text-xl font-bold text-[#0f172a]">
                {status === "success"
                  ? planLabel || "Plan active"
                  : status === "error"
                    ? "Confirmation pending"
                    : "Syncing Stripe result"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Daily Sparks keeps this screen focused on the checkout result, then routes
                you back into the parent workspace once the billing state is confirmed.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Account
              </p>
              <p className="mt-2 text-sm font-bold text-[#0f172a]">
                {accountFullName}
              </p>
              <p className="mt-1 text-sm text-slate-500">{accountEmail}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                What happens next
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                <p>1. Stripe checkout is reconciled to your Daily Sparks family account.</p>
                <p>2. Your billing plan becomes available across the dashboard and delivery flows.</p>
                <p>3. If confirmation stalls, return to billing and retry the hosted checkout once.</p>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
