"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    setErrorMessage("");
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
      });

      if (!response.ok) {
        setErrorMessage("We could not close the editorial admin session.");
        setIsLoggingOut(false);
        return;
      }

      startTransition(() => {
        router.push("/admin/login");
        router.refresh();
      });
    } catch {
      setErrorMessage("We could not reach the editorial admin logout route.");
      setIsLoggingOut(false);
    }
  }

  const isBusy = isLoggingOut || isPending;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isBusy}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
        {isBusy ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage ? (
        <p className="text-xs text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}
