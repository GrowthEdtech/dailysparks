"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { signInWithGooglePopup, signOutFirebaseClientSession } from "../../lib/firebase-client";
import { trackMarketingEvent } from "../../lib/marketing-analytics";

type LoginResponse = {
  message?: string;
};

function getGoogleLoginErrorMessage(error: unknown) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  if (code === "auth/popup-blocked") {
    return "Your browser blocked the Google sign-in popup. Please allow popups and try again.";
  }

  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  ) {
    return "Google sign-in was cancelled before completion.";
  }

  if (code === "auth/unauthorized-domain") {
    return "This domain is not yet authorized for Firebase Authentication.";
  }

  return "We could not complete Google sign-in. Please try again.";
}

export default function LoginForm() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleLogin() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const credential = await signInWithGooglePopup();
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          idToken,
        }),
      });

      const body = (await response.json().catch(() => null)) as LoginResponse | null;

      if (!response.ok) {
        await signOutFirebaseClientSession().catch(() => undefined);
        setErrorMessage(body?.message ?? "We could not start your profile.");
        setIsSubmitting(false);
        return;
      }

      trackMarketingEvent("trial_started", {
        method: "google",
      });
      void signOutFirebaseClientSession().catch(() => undefined);
      window.location.assign("/opening-dashboard");
    } catch (error) {
      setErrorMessage(getGoogleLoginErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#fbbf24]">
              Daily Sparks
            </p>
            <h1 className="text-2xl font-bold text-white">Start the parent setup</h1>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/95 p-8 text-[#0f172a] shadow-2xl shadow-black/30">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#f59e0b]">
            Secure sign-in
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Continue with Google.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Use the Google account tied to your family workflow. If this is your
            first visit, we&apos;ll collect your child&apos;s name in the dashboard.
          </p>

          <div className="mt-8 flex flex-col gap-4">
            {errorMessage ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#fbbf24] px-5 py-4 text-base font-bold text-[#0f172a] shadow-lg shadow-[#fbbf24]/30 transition hover:bg-[#f59e0b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Opening dashboard..." : "Continue with Google"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Daily Sparks verifies your Google identity on the server and creates
            a secure parent session before opening the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
