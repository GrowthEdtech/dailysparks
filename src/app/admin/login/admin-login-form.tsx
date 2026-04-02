"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

type AdminLoginResponse = {
  message?: string;
  success?: boolean;
};

export default function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | AdminLoginResponse
        | null;

      if (!response.ok) {
        setErrorMessage(body?.message ?? "We could not open the editorial admin.");
        setIsSubmitting(false);
        return;
      }

      startTransition(() => {
        router.push("/admin/editorial");
        router.refresh();
      });
    } catch {
      setErrorMessage("We could not reach the editorial admin login route.");
      setIsSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isPending;

  return (
    <div className="min-h-screen bg-[#020617] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-[32px] border border-white/10 bg-white/95 p-8 text-[#0f172a] shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#f59e0b]">
            Editorial admin
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Enter with the admin password.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This route is reserved for internal editorial operations. Parent
            accounts do not need access here.
          </p>

          <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
            {errorMessage ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <LockKeyhole className="h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-transparent text-base outline-none"
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={isBusy || password.length === 0}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-5 py-4 text-base font-bold text-white shadow-lg shadow-[#0f172a]/20 transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? "Opening editorial admin..." : "Open editorial admin"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
