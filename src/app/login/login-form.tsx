"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";

type LoginResponse = {
  message?: string;
};

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          fullName,
          studentName,
        }),
      });

      const body = (await response.json().catch(() => null)) as LoginResponse | null;

      if (!response.ok) {
        setErrorMessage(body?.message ?? "We could not start your profile.");
        setIsSubmitting(false);
        return;
      }

      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    } catch {
      setErrorMessage("We could not reach the local API. Please try again.");
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
            MVP login
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            No password. Just your setup details.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We will create a local parent profile on this device and take you
            straight into the dashboard.
          </p>

          <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Parent email</span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-[#fbbf24] focus:bg-white"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="parent@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Parent name</span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-[#fbbf24] focus:bg-white"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Jamie Doe"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Child name</span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-[#fbbf24] focus:bg-white"
                type="text"
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="Katherine"
                required
              />
            </label>

            {errorMessage ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || isPending}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#fbbf24] px-5 py-4 text-base font-bold text-[#0f172a] shadow-lg shadow-[#fbbf24]/30 transition hover:bg-[#f59e0b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting || isPending
                ? "Opening dashboard..."
                : "Continue to dashboard"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            This local MVP stores profile data in a file on this machine. It is
            designed for demos and product iteration, not production accounts.
          </p>
        </div>
      </div>
    </div>
  );
}
