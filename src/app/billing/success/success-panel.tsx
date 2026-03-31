"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import type { ParentProfile } from "../../../lib/mvp-types";
import {
  PRIMARY_SUCCESS_CTA_CLASSNAME,
  SECONDARY_SUCCESS_CTA_CLASSNAME,
} from "./success-panel.styles";

type FinalizeBillingResponse = {
  message?: string;
  parent?: ParentProfile["parent"];
};

export default function SuccessPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState("Confirming your Stripe checkout...");
  const [planLabel, setPlanLabel] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isCancelled = false;

    async function finalizeCheckout() {
      const sessionId = searchParams.get("session_id")?.trim() ?? "";

      if (!sessionId) {
        setStatus("error");
        setMessage("We could not find a Stripe checkout session to confirm.");
        return;
      }

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
          }
          return;
        }

        if (!isCancelled) {
          setStatus("success");
          setPlanLabel(
            body.parent.subscriptionPlan === "yearly" ? "Yearly plan active" : "Monthly plan active",
          );
          setMessage("Stripe checkout is complete and your Daily Sparks billing is now active.");

          startTransition(() => {
            router.refresh();
          });
        }
      } catch {
        if (!isCancelled) {
          setStatus("error");
          setMessage("We could not reach billing confirmation right now. Please try again.");
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
        <div className="mx-auto flex w-full max-w-md items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#fbbf24]">
              Billing
            </p>
            <h1 className="mt-2 text-2xl font-bold">Stripe checkout result</h1>
            <p className="mt-1 text-sm text-slate-300">
              We are confirming your Daily Sparks subscription on the server.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fbbf24] text-[#0f172a]">
            {status === "pending" ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 flex w-full max-w-md flex-col gap-6 px-4">
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Billing confirmation
          </p>
          <h2 className="mt-2 text-xl font-bold text-[#0f172a]">
            {status === "success"
              ? planLabel
              : status === "error"
                ? "We still need to finish billing setup"
                : "Confirming your subscription"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/dashboard"
              className={PRIMARY_SUCCESS_CTA_CLASSNAME}
            >
              Go to dashboard
            </Link>
            <Link
              href="/billing"
              className={SECONDARY_SUCCESS_CTA_CLASSNAME}
            >
              Back to billing
            </Link>
          </div>

          {isPending ? (
            <p className="mt-4 text-xs text-slate-400">Refreshing parent billing state...</p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
