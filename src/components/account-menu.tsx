"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { signOutFirebaseClientSession } from "../lib/firebase-client";

type AccountMenuProps = {
  email: string;
  fullName: string;
};

function getInitialLetters(value: string) {
  return value
    .split(" ")
    .map((piece) => piece.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase() ?? "")
    .join("");
}

export function getAccountMenuInitials(fullName: string, email = "") {
  const nameInitials = getInitialLetters(fullName);

  if (nameInitials) {
    return nameInitials;
  }

  const [emailLocalPart = "", emailDomain = ""] = email.split("@");
  const emailPieces = emailLocalPart
    .split(/[.\-_]+/)
    .map((piece) => piece.trim())
    .filter(Boolean);

  const emailInitials =
    emailPieces.length >= 2
      ? emailPieces
          .slice(0, 2)
          .map((piece) => piece[0]?.toUpperCase() ?? "")
          .join("")
      : `${emailLocalPart[0] ?? ""}${emailDomain[0] ?? ""}`.toUpperCase();

  return emailInitials || "DS";
}

export default function AccountMenu({ email, fullName }: AccountMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPending, startTransition] = useTransition();

  const avatarInitials = useMemo(
    () => getAccountMenuInitials(fullName, email),
    [email, fullName],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2 py-2 text-white transition hover:bg-white/15"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open account menu"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fbbf24] font-bold text-[#0f172a]">
          {avatarInitials}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="rounded-2xl bg-slate-50 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Signed in as
            </p>
            <p className="mt-2 text-sm font-semibold text-[#0f172a]">
              {fullName || "Daily Sparks Parent"}
            </p>
            <p className="mt-1 break-all text-sm text-slate-500">{email}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isBusy}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {isBusy ? "Logging out..." : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
