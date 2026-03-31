"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { signOutFirebaseClientSession } from "../lib/firebase-client";

type LogoutButtonProps = {
  className?: string;
};

export default function LogoutButton({
  className = "",
}: LogoutButtonProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/logout", {
        method: "POST",
      });

      if (!response.ok) {
        setIsLoggingOut(false);
        return;
      }

      await signOutFirebaseClientSession().catch(() => undefined);

      startTransition(() => {
        router.push("/login");
        router.refresh();
      });
    } catch {
      setIsLoggingOut(false);
    }
  }

  const isBusy = isLoggingOut || isPending;

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isBusy}
      className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
    >
      <LogOut className="h-4 w-4" />
      {isBusy ? "Logging out..." : "Log out"}
    </button>
  );
}
